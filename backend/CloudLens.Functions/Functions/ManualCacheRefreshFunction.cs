using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;
using CloudLens.API.Models;
using CloudLens.API.Services;
using CloudLens.API.Data;
using CloudLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace CloudLens.Functions.Functions;

public class ManualCacheRefreshFunction
{
    private readonly ILogger<ManualCacheRefreshFunction> _logger;
    private readonly IAzureService _azureService;
    private readonly IFinOpsService _finOpsService;
    private readonly IComplianceService _complianceService;
    private readonly IAwsService _awsService;
    private readonly IGcpService _gcpService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly ICacheService _cacheService;
    private readonly AppDbContext _dbContext;

    public ManualCacheRefreshFunction(
        ILogger<ManualCacheRefreshFunction> logger,
        IAzureService azureService,
        IFinOpsService finOpsService,
        IComplianceService complianceService,
        IAwsService awsService,
        IGcpService gcpService,
        ICredentialCacheService credentialCache,
        ICacheService cacheService,
        AppDbContext dbContext)
    {
        _logger = logger;
        _azureService = azureService;
        _finOpsService = finOpsService;
        _complianceService = complianceService;
        _awsService = awsService;
        _gcpService = gcpService;
        _credentialCache = credentialCache;
        _cacheService = cacheService;
        _dbContext = dbContext;
    }

    /// <summary>
    /// HTTP-triggered function to manually refresh cache for all cloud providers.
    /// GET/POST /api/TriggerRefresh
    /// </summary>
    [Function("TriggerRefresh")]
    public async Task<HttpResponseData> TriggerRefresh(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestData req)
    {
        _logger.LogInformation("🚀 Manual cache refresh triggered");

        var refreshed = new List<string>();
        var skipped  = new List<string>();
        var errors   = new List<string>();

        // ── Azure ─────────────────────────────────────────────────────────────
        var azureCred = await _dbContext.GlobalAzureCredentials.FirstOrDefaultAsync(c => c.IsActive);
        if (azureCred != null)
        {
            try
            {
                var credentials = new AzureCredentials
                {
                    TenantId = azureCred.TenantId,
                    ClientId = azureCred.ClientId,
                    ClientSecret = azureCred.ClientSecret,
                    SubscriptionIds = JsonSerializer.Deserialize<List<string>>(azureCred.SubscriptionIdsJson) ?? new List<string>()
                };
                await RefreshAzureCacheAsync(credentials);
                refreshed.Add("azure");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Azure cache refresh failed");
                errors.Add($"azure: {ex.Message}");
            }
        }
        else
        {
            skipped.Add("azure (no credentials)");
        }

        // ── AWS ───────────────────────────────────────────────────────────────
        var awsCred = await _dbContext.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive);
        if (awsCred != null)
        {
            try
            {
                await RefreshAwsCostsAsync(awsCred);
                refreshed.Add("aws");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AWS cache refresh failed");
                errors.Add($"aws: {ex.Message}");
            }
        }
        else
        {
            skipped.Add("aws (no credentials)");
        }

        // ── GCP ───────────────────────────────────────────────────────────────
        var gcpCred = await _dbContext.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive);
        if (gcpCred != null)
        {
            try
            {
                await RefreshGcpCostsAsync(gcpCred);
                refreshed.Add("gcp");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GCP cache refresh failed");
                errors.Add($"gcp: {ex.Message}");
            }
        }
        else
        {
            skipped.Add("gcp (no credentials)");
        }

        var statusCode = errors.Any() ? HttpStatusCode.MultiStatus : HttpStatusCode.OK;
        var response = req.CreateResponse(statusCode);
        await response.WriteAsJsonAsync(new
        {
            refreshed,
            skipped,
            errors,
            timestamp = DateTime.UtcNow,
        });
        return response;
    }

    /// <summary>GET /api/ListSessions — view credential status for all providers.</summary>
    [Function("ListSessions")]
    public async Task<HttpResponseData> ListSessions(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        try
        {
            var azure = await _dbContext.GlobalAzureCredentials.FirstOrDefaultAsync(c => c.IsActive);
            var aws   = await _dbContext.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive);
            var gcp   = await _dbContext.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive);

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new
            {
                azure = azure == null ? null : new
                {
                    configured = true,
                    subscriptionCount = azure.SubscriptionCount,
                    tenantId = azure.TenantId,
                    updatedAt = azure.UpdatedAt,
                },
                aws = aws == null ? null : new
                {
                    configured = true,
                    region = aws.Region,
                    updatedAt = aws.UpdatedAt,
                },
                gcp = gcp == null ? null : new
                {
                    configured = true,
                    updatedAt = gcp.UpdatedAt,
                },
            });
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get credentials status");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync($"Error: {ex.Message}");
            return errorResponse;
        }
    }

    // ── Azure helpers ─────────────────────────────────────────────────────────

    private async Task RefreshAzureCacheAsync(AzureCredentials credentials)
    {
        _logger.LogInformation("Refreshing Azure cache ({count} subscriptions)", credentials.SubscriptionIds?.Count ?? 0);

        await Task.WhenAll(
            RefreshResourcesAsync(credentials),
            RefreshCostsAsync(credentials),
            RefreshFinOpsAsync(credentials),
            RefreshComplianceAsync(credentials)
        );

        _logger.LogInformation("✓ Azure cache refreshed");
    }

    private async Task RefreshResourcesAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("  📦 Fetching resources...");
            var resources = await _azureService.GetResourcesAsync(credentials);
            if (resources == null || !resources.Any()) { _logger.LogWarning("  ⚠ No resources returned"); return; }
            await _cacheService.CacheResourcesAsync(resources);
            _logger.LogInformation("  ✓ Cached {count} resources", resources.Count);
        }
        catch (Exception ex) { _logger.LogError(ex, "  ✗ Failed to refresh resources"); }
    }

    private async Task RefreshCostsAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("  💰 Fetching subscription-level costs...");
            var costs = await _azureService.GetCostsAsync(credentials);
            if (costs != null && costs.Any())
            {
                await _cacheService.CacheCostsAsync(costs);
                _logger.LogInformation("  ✓ Cached costs for {count} subscriptions", costs.Count);
            }
            else { _logger.LogWarning("  ⚠ No costs returned"); }

            _logger.LogInformation("  💵 Fetching per-resource costs (1 year)...");
            var rcStartDate = DateTime.UtcNow.AddDays(-364);
            var rcEndDate = DateTime.UtcNow;
            var resourceCosts = await _azureService.GetResourceCostsAsync(credentials, rcStartDate, rcEndDate);
            if (resourceCosts != null && resourceCosts.Any())
            {
                await _cacheService.CacheResourceCostsAsync(resourceCosts, credentials.SubscriptionIds ?? new List<string>(), rcStartDate, rcEndDate);
                _logger.LogInformation("  ✓ Cached {count} resource costs", resourceCosts.Count);
            }
            else { _logger.LogWarning("  ⚠ No resource costs returned"); }
        }
        catch (Exception ex) { _logger.LogError(ex, "  ✗ Failed to refresh costs"); }
    }

    private async Task RefreshFinOpsAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("  📊 Fetching FinOps metrics...");
            await _finOpsService.GetFinOpsMetricsAsync(credentials);
            _logger.LogInformation("  ✓ FinOps metrics refreshed");
        }
        catch (Exception ex) { _logger.LogError(ex, "  ✗ Failed to refresh FinOps"); }
    }

    private async Task RefreshComplianceAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("  🔒 Fetching compliance data...");
            await _complianceService.GetSoc2ControlsAsync(credentials, credentials.SubscriptionIds ?? new List<string>());
            _logger.LogInformation("  ✓ Compliance data refreshed");
        }
        catch (Exception ex) { _logger.LogError(ex, "  ✗ Failed to refresh compliance"); }
    }

    // ── AWS helper ────────────────────────────────────────────────────────────

    private async Task RefreshAwsCostsAsync(GlobalAwsCredentials cred)
    {
        _logger.LogInformation("  💰 Fetching AWS costs...");
        var credentials = new AwsCredentials
        {
            AccessKeyId = cred.AccessKeyId,
            SecretAccessKey = cred.SecretAccessKey,
            Region = cred.Region,
        };

        var results = await _awsService.GetCostsAsync(credentials);
        if (results == null || !results.Any()) { _logger.LogWarning("  ⚠ No AWS costs returned"); return; }

        var old = await _dbContext.CachedCloudCosts.Where(c => c.Provider == "aws").ToListAsync();
        _dbContext.CachedCloudCosts.RemoveRange(old);

        foreach (var account in results)
        {
            _dbContext.CachedCloudCosts.Add(new CachedCloudCost
            {
                Provider = "aws",
                AccountId = account.AccountId,
                AccountName = account.AccountName,
                TotalCost = account.TotalCost,
                Currency = account.Currency,
                StartDate = account.StartDate,
                EndDate = account.EndDate,
                CostsByServiceJson = JsonSerializer.Serialize(account.CostsByService),
                MonthlyCostsJson = JsonSerializer.Serialize(account.MonthlyCosts),
                CachedAt = DateTime.UtcNow,
            });
        }

        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("  ✓ Cached AWS costs for {count} accounts", results.Count);
    }

    // ── GCP helper ────────────────────────────────────────────────────────────

    private async Task RefreshGcpCostsAsync(GlobalGcpCredentials cred)
    {
        _logger.LogInformation("  💰 Fetching GCP costs...");
        var credentials = new GcpCredentials { ServiceAccountJson = cred.ServiceAccountJson };

        var results = await _gcpService.GetCostsAsync(credentials);
        if (results == null || !results.Any()) { _logger.LogWarning("  ⚠ No GCP costs returned"); return; }

        var old = await _dbContext.CachedCloudCosts.Where(c => c.Provider == "gcp").ToListAsync();
        _dbContext.CachedCloudCosts.RemoveRange(old);

        foreach (var project in results)
        {
            _dbContext.CachedCloudCosts.Add(new CachedCloudCost
            {
                Provider = "gcp",
                AccountId = project.AccountId,
                AccountName = project.AccountName,
                TotalCost = project.TotalCost,
                Currency = project.Currency,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                CostsByServiceJson = JsonSerializer.Serialize(project.CostsByService),
                MonthlyCostsJson = JsonSerializer.Serialize(project.MonthlyCosts),
                CachedAt = DateTime.UtcNow,
            });
        }

        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("  ✓ Cached GCP costs for {count} projects", results.Count);
    }
}

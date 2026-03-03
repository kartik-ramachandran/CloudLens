using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;
using AzureLens.API.Models;
using AzureLens.API.Services;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AzureLens.Functions.Functions;

public class ManualCacheRefreshFunction
{
    private readonly ILogger<ManualCacheRefreshFunction> _logger;
    private readonly IAzureService _azureService;
    private readonly IFinOpsService _finOpsService;
    private readonly IComplianceService _complianceService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly ICacheService _cacheService;
    private readonly AppDbContext _dbContext;

    public ManualCacheRefreshFunction(
        ILogger<ManualCacheRefreshFunction> logger,
        IAzureService azureService,
        IFinOpsService finOpsService,
        IComplianceService complianceService,
        ICredentialCacheService credentialCache,
        ICacheService cacheService,
        AppDbContext dbContext)
    {
        _logger = logger;
        _azureService = azureService;
        _finOpsService = finOpsService;
        _complianceService = complianceService;
        _credentialCache = credentialCache;
        _cacheService = cacheService;
        _dbContext = dbContext;
    }

    /// <summary>
    /// HTTP-triggered function to manually refresh cache for global credentials
    /// GET /api/TriggerRefresh
    /// </summary>
    [Function("TriggerRefresh")]
    public async Task<HttpResponseData> TriggerRefresh(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestData req)
    {
        _logger.LogInformation("🚀 Manual cache refresh triggered");

        try
        {
            // Get global active credentials
            var globalCred = await _dbContext.GlobalAzureCredentials
                .FirstOrDefaultAsync(c => c.IsActive);

            if (globalCred == null)
            {
                var notFoundResponse = req.CreateResponse(HttpStatusCode.NotFound);
                await notFoundResponse.WriteStringAsync("No active global credentials found. Please configure credentials first.");
                return notFoundResponse;
            }

            var credentials = new AzureCredentials
            {
                TenantId = globalCred.TenantId,
                ClientId = globalCred.ClientId,
                ClientSecret = globalCred.ClientSecret,
                SubscriptionIds = JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) ?? new List<string>()
            };

            _logger.LogInformation("Refreshing cache for global credentials with {subscriptionCount} subscriptions",
                credentials.SubscriptionIds?.Count ?? 0);

            try
            {
                await RefreshGlobalCacheAsync(credentials);

                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new
                {
                    message = "Cache refresh completed successfully",
                    subscriptionCount = credentials.SubscriptionIds?.Count ?? 0,
                    timestamp = DateTime.UtcNow
                });

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh global cache");
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteStringAsync($"Cache refresh failed: {ex.Message}");
                return errorResponse;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process manual refresh request");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync($"Error: {ex.Message}");
            return errorResponse;
        }
    }

    /// <summary>
    /// GET endpoint to view global credentials status
    /// GET /api/ListSessions
    /// </summary>
    [Function("ListSessions")]
    public async Task<HttpResponseData> ListSessions(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        try
        {
            var globalCred = await _dbContext.GlobalAzureCredentials
                .FirstOrDefaultAsync(c => c.IsActive);

            var response = req.CreateResponse(HttpStatusCode.OK);
            
            if (globalCred == null)
            {
                await response.WriteAsJsonAsync(new
                {
                    hasCredentials = false,
                    message = "No active global credentials configured"
                });
            }
            else
            {
                await response.WriteAsJsonAsync(new
                {
                    hasCredentials = true,
                    subscriptionCount = globalCred.SubscriptionCount,
                    createdAt = globalCred.CreatedAt,
                    updatedAt = globalCred.UpdatedAt,
                    tenantId = globalCred.TenantId
                });
            }

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

    private async Task RefreshGlobalCacheAsync(AzureCredentials credentials)
    {
        _logger.LogInformation("Refreshing global cache ({subscriptionCount} subscriptions)",
            credentials.SubscriptionIds?.Count ?? 0);

        // Refresh in parallel
        var refreshTasks = new List<Task>
        {
            RefreshResourcesAsync(credentials),
            RefreshCostsAsync(credentials),
            RefreshFinOpsAsync(credentials),
            RefreshComplianceAsync(credentials)
        };

        await Task.WhenAll(refreshTasks);

        _logger.LogInformation("✓ Successfully refreshed global cache");
    }

    private async Task RefreshResourcesAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("  📦 Fetching resources...");
            var resources = await _azureService.GetResourcesAsync(credentials);
            if (resources == null || !resources.Any())
            {
                _logger.LogWarning("  ⚠ No resources returned from Azure");
                return;
            }
            await _cacheService.CacheResourcesAsync(resources);
            _logger.LogInformation("  ✓ Cached {count} resources to database", resources.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh resources");
        }
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
                _logger.LogInformation("  ✓ Cached costs for {count} subscriptions to database", costs.Count);
            }
            else
            {
                _logger.LogWarning("  ⚠ No costs returned from Azure");
            }

            // Fetch per-resource costs with monthly granularity.
            // CacheResourceCostsAsync also derives and saves monthly aggregated costs automatically.
            _logger.LogInformation("  💵 Fetching per-resource costs (1 year)...");
            var rcStartDate = DateTime.UtcNow.AddDays(-364);
            var rcEndDate = DateTime.UtcNow;
            var resourceCosts = await _azureService.GetResourceCostsAsync(credentials, rcStartDate, rcEndDate);
            if (resourceCosts != null && resourceCosts.Any())
            {
                await _cacheService.CacheResourceCostsAsync(resourceCosts, credentials.SubscriptionIds ?? new List<string>(), rcStartDate, rcEndDate);
                _logger.LogInformation("  ✓ Cached costs for {count} individual resources to database", resourceCosts.Count);
            }
            else
            {
                _logger.LogWarning("  ⚠ No resource costs returned from Azure");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh costs");
        }
    }

    private async Task RefreshFinOpsAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("  📊 Fetching FinOps metrics...");
            var metrics = await _finOpsService.GetFinOpsMetricsAsync(credentials);
            _logger.LogInformation("  ✓ Cached FinOps metrics");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh FinOps");
        }
    }

    private async Task RefreshComplianceAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("  🔒 Fetching compliance data...");
            var compliance = await _complianceService.GetSoc2ControlsAsync(
                credentials, 
                credentials.SubscriptionIds ?? new List<string>());
            _logger.LogInformation("  ✓ Cached compliance data");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh compliance");
        }
    }
}

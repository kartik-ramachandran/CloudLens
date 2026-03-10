using System;
using System.Text;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using AzureLens.API.Models;
using AzureLens.API.Services;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AzureLens.Functions.Functions;

public class CacheRefreshFunction
{
    private readonly ILogger<CacheRefreshFunction> _logger;
    private readonly IAzureService _azureService;
    private readonly IComplianceService _complianceService;
    private readonly IAwsService _awsService;
    private readonly IGcpService _gcpService;
    private readonly AppDbContext _dbContext;

    public CacheRefreshFunction(
        ILogger<CacheRefreshFunction> logger,
        IAzureService azureService,
        IComplianceService complianceService,
        IAwsService awsService,
        IGcpService gcpService,
        AppDbContext dbContext)
    {
        _logger = logger;
        _azureService = azureService;
        _complianceService = complianceService;
        _awsService = awsService;
        _gcpService = gcpService;
        _dbContext = dbContext;
    }

    /// <summary>
    /// Refreshes cache for all cloud providers every 10 minutes.
    /// CRON: "0 */10 * * * *" = Every 10 minutes
    /// </summary>
    [Function("RefreshAllCaches")]
    public async Task RefreshAllCaches(
        [TimerTrigger("0 */10 * * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation("🔄 Starting cache refresh at {time}", DateTime.UtcNow);

        try
        {
            // ── Azure ─────────────────────────────────────────────────────────
            var globalCred = await _dbContext.GlobalAzureCredentials
                .FirstOrDefaultAsync(c => c.IsActive);

            if (globalCred != null)
            {
                var credentials = new AzureCredentials
                {
                    TenantId = globalCred.TenantId,
                    ClientId = globalCred.ClientId,
                    ClientSecret = globalCred.ClientSecret,
                    SubscriptionIds = JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) ?? new List<string>()
                };

                _logger.LogInformation("Refreshing Azure cache for {count} subscriptions", credentials.SubscriptionIds?.Count ?? 0);
                try
                {
                    await RefreshResourcesAsync(credentials);
                    await RefreshCostsAsync(credentials);
                    await RefreshResourceCostsAsync(credentials);
                    await RefreshComplianceAsync(credentials);
                    _logger.LogInformation("✓ Azure cache refreshed");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "✗ Azure cache refresh failed");
                }
            }
            else
            {
                _logger.LogWarning("No active Azure credentials — skipping Azure refresh");
            }

            // ── AWS ───────────────────────────────────────────────────────────
            var awsCred = await _dbContext.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive);
            if (awsCred != null)
            {
                _logger.LogInformation("Refreshing AWS cache");
                try
                {
                    await RefreshAwsCostsAsync(awsCred);
                    _logger.LogInformation("✓ AWS cache refreshed");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "✗ AWS cache refresh failed");
                }
            }
            else
            {
                _logger.LogWarning("No active AWS credentials — skipping AWS refresh");
            }

            // ── GCP ───────────────────────────────────────────────────────────
            var gcpCred = await _dbContext.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive);
            if (gcpCred != null)
            {
                _logger.LogInformation("Refreshing GCP cache");
                try
                {
                    await RefreshGcpCostsAsync(gcpCred);
                    _logger.LogInformation("✓ GCP cache refreshed");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "✗ GCP cache refresh failed");
                }
            }
            else
            {
                _logger.LogWarning("No active GCP credentials — skipping GCP refresh");
            }

            _logger.LogInformation("🎯 Cache refresh completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Critical error during cache refresh");
        }
    }

    /// <summary>
    /// Cleans up old cache entries daily at 2 AM.
    /// CRON: "0 0 2 * * *" = Daily at 2:00 AM
    /// </summary>
    [Function("CleanupOldCache")]
    public async Task CleanupOldCache(
        [TimerTrigger("0 0 2 * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation("🧹 Starting cache cleanup at {time}", DateTime.UtcNow);

        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-1);

            var expiredResources = await _dbContext.CachedResources
                .Where(r => r.CachedAt < cutoffDate).ToListAsync();
            _dbContext.CachedResources.RemoveRange(expiredResources);

            var expiredCosts = await _dbContext.CachedCosts
                .Where(c => c.CachedAt < cutoffDate).ToListAsync();
            _dbContext.CachedCosts.RemoveRange(expiredCosts);

            var expiredResourceCosts = await _dbContext.CachedResourceCosts
                .Where(rc => rc.CachedAt < cutoffDate).ToListAsync();
            _dbContext.CachedResourceCosts.RemoveRange(expiredResourceCosts);

            var expiredCloudCosts = await _dbContext.CachedCloudCosts
                .Where(c => c.CachedAt < cutoffDate).ToListAsync();
            _dbContext.CachedCloudCosts.RemoveRange(expiredCloudCosts);

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                "✓ Cache cleanup done — removed {res} resources, {costs} costs, {rc} resource costs, {cc} cloud costs",
                expiredResources.Count, expiredCosts.Count, expiredResourceCosts.Count, expiredCloudCosts.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup cache");
        }
    }

    // ── Azure helpers ─────────────────────────────────────────────────────────

    private async Task RefreshResourcesAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("Fetching resources from Azure...");
            var resources = await _azureService.GetResourcesAsync(credentials);

            if (resources == null || !resources.Any())
            {
                _logger.LogWarning("No resources found");
                return;
            }

            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
            var old = await _dbContext.CachedResources
                .Where(r => subscriptionIds.Contains(r.SubscriptionId)).ToListAsync();
            _dbContext.CachedResources.RemoveRange(old);

            foreach (var resource in resources)
            {
                _dbContext.CachedResources.Add(new CachedResource
                {
                    SubscriptionId = resource.SubscriptionId,
                    ResourceId = resource.Id,
                    Name = resource.Name,
                    Type = resource.Type,
                    Location = resource.Location,
                    ResourceGroup = resource.ResourceGroup,
                    TagsJson = resource.Tags != null ? JsonSerializer.Serialize(resource.Tags) : "{}",
                    CachedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("  ✓ Cached {count} resources", resources.Count);
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
            _logger.LogInformation("Fetching costs from Azure...");
            var costs = await _azureService.GetCostsAsync(credentials);

            if (costs == null || !costs.Any())
            {
                _logger.LogWarning("No costs found");
                return;
            }

            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
            var old = await _dbContext.CachedCosts
                .Where(c => subscriptionIds.Contains(c.SubscriptionId)).ToListAsync();
            _dbContext.CachedCosts.RemoveRange(old);

            foreach (var cost in costs)
            {
                _dbContext.CachedCosts.Add(new AzureLens.API.Data.Entities.CachedCost
                {
                    SubscriptionId = cost.SubscriptionId,
                    SubscriptionName = cost.SubscriptionName,
                    TotalCost = cost.TotalCost,
                    Currency = cost.Currency,
                    StartDate = cost.StartDate,
                    EndDate = cost.EndDate,
                    CostsByServiceJson = cost.CostsByService != null ? JsonSerializer.Serialize(cost.CostsByService) : "[]",
                    CachedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("  ✓ Cached costs for {count} subscriptions", costs.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh costs");
        }
    }

    private async Task RefreshResourceCostsAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("Fetching resource costs from Azure...");
            var startDate = DateTime.UtcNow.AddDays(-364);
            var endDate = DateTime.UtcNow;
            var resourceCosts = await _azureService.GetResourceCostsAsync(credentials, startDate, endDate);

            if (resourceCosts == null || !resourceCosts.Any())
            {
                _logger.LogWarning("No resource costs found");
                return;
            }

            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
            var contextString = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
            var contextHash = Convert.ToBase64String(Encoding.UTF8.GetBytes(contextString));

            var old = await _dbContext.CachedResourceCosts
                .Where(c => c.ContextHash == contextHash).ToListAsync();
            _dbContext.CachedResourceCosts.RemoveRange(old);

            foreach (var cost in resourceCosts)
            {
                _dbContext.CachedResourceCosts.Add(new CachedResourceCost
                {
                    ContextHash = contextHash,
                    ResourceId = cost.ResourceId,
                    ResourceName = cost.ResourceName,
                    ResourceType = cost.ResourceType,
                    ResourceGroup = cost.ResourceGroup,
                    TotalCost = cost.TotalCost,
                    MonthlyCostsJson = cost.MonthlyCosts != null ? JsonSerializer.Serialize(cost.MonthlyCosts) : "[]",
                    CachedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("  ✓ Cached {count} resource cost records", resourceCosts.Count);

            // Derive and save monthly aggregated costs
            var monthlyCostsByMonth = resourceCosts
                .Where(rc => rc.MonthlyCosts != null)
                .SelectMany(rc => rc.MonthlyCosts!)
                .GroupBy(m => m.Month)
                .Select(g => new AzureLens.API.Models.MonthlyCost
                {
                    Month = g.Key,
                    Cost = g.Sum(m => m.Cost),
                    Currency = g.First().Currency
                })
                .OrderBy(m => m.Month)
                .ToList();

            if (monthlyCostsByMonth.Any())
            {
                var monthlyHash = contextHash;
                var oldMonthly = await _dbContext.CachedMonthlyCosts
                    .Where(c => c.ContextHash == monthlyHash).ToListAsync();
                _dbContext.CachedMonthlyCosts.RemoveRange(oldMonthly);

                foreach (var mc in monthlyCostsByMonth)
                {
                    _dbContext.CachedMonthlyCosts.Add(new CachedMonthlyCost
                    {
                        ContextHash = monthlyHash,
                        Month = mc.Month,
                        Cost = mc.Cost,
                        Currency = mc.Currency,
                        CachedAt = DateTime.UtcNow
                    });
                }
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("  ✓ Cached {count} monthly cost records", monthlyCostsByMonth.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh resource costs");
        }
    }

    private async Task RefreshComplianceAsync(AzureCredentials credentials)
    {
        try
        {
            _logger.LogInformation("Fetching compliance data from Azure...");
            await _complianceService.GetSoc2ControlsAsync(credentials, credentials.SubscriptionIds ?? new List<string>());
            _logger.LogInformation("  ✓ Compliance data refreshed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh compliance");
        }
    }

    // ── AWS helper ────────────────────────────────────────────────────────────

    private async Task RefreshAwsCostsAsync(GlobalAwsCredentials cred)
    {
        var credentials = new AwsCredentials
        {
            AccessKeyId = cred.AccessKeyId,
            SecretAccessKey = cred.SecretAccessKey,
            Region = cred.Region,
        };

        var results = await _awsService.GetCostsAsync(credentials);
        if (results == null || !results.Any())
        {
            _logger.LogWarning("  ⚠ No AWS costs returned");
            return;
        }

        // Replace all cached AWS costs
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
        var credentials = new GcpCredentials
        {
            ServiceAccountJson = cred.ServiceAccountJson,
        };

        var results = await _gcpService.GetCostsAsync(credentials);
        if (results == null || !results.Any())
        {
            _logger.LogWarning("  ⚠ No GCP costs returned");
            return;
        }

        // Replace all cached GCP costs
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

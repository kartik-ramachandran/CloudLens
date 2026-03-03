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
    private readonly AppDbContext _dbContext;

    public CacheRefreshFunction(
        ILogger<CacheRefreshFunction> logger,
        IAzureService azureService,
        IComplianceService complianceService,
        AppDbContext dbContext)
    {
        _logger = logger;
        _azureService = azureService;
        _complianceService = complianceService;
        _dbContext = dbContext;
    }

    /// <summary>
    /// Refreshes cache for global credentials every 10 minutes
    /// CRON: "0 */10 * * * *" = Every 10 minutes
    /// </summary>
    [Function("RefreshAllCaches")]
    public async Task RefreshAllCaches(
        [TimerTrigger("0 */10 * * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation("🔄 Starting cache refresh at {time}", DateTime.UtcNow);

        try
        {
            // Get global active credentials
            var globalCred = await _dbContext.GlobalAzureCredentials
                .FirstOrDefaultAsync(c => c.IsActive);

            if (globalCred == null)
            {
                _logger.LogWarning("No active global credentials found - skipping cache refresh");
                return;
            }

            var credentials = new AzureCredentials
            {
                TenantId = globalCred.TenantId,
                ClientId = globalCred.ClientId,
                ClientSecret = globalCred.ClientSecret,
                SubscriptionIds = JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) ?? new List<string>()
            };

            _logger.LogInformation("Found global credentials with {subscriptionCount} subscriptions",
                credentials.SubscriptionIds?.Count ?? 0);

            try
            {
                _logger.LogInformation("Starting full cache refresh for {subscriptionCount} subscriptions...", 
                    credentials.SubscriptionIds?.Count ?? 0);

                // Refresh resources and costs (required for FinOps)
                await RefreshResourcesAsync(credentials);
                await RefreshCostsAsync(credentials);
                await RefreshResourceCostsAsync(credentials);  // Also derives + saves monthly costs
                await RefreshComplianceAsync(credentials);

                _logger.LogInformation("✓ Successfully refreshed global cache");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "✗ Failed to refresh cache");
            }

            _logger.LogInformation("🎯 Cache refresh completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Critical error during cache refresh");
        }
    }

    /// <summary>
    /// Cleans up old cache entries daily at 2 AM
    /// CRON: "0 0 2 * * *" = Daily at 2:00 AM
    /// </summary>
    [Function("CleanupOldCache")]
    public async Task CleanupOldCache(
        [TimerTrigger("0 0 2 * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation("🧹 Starting cache cleanup at {time}", DateTime.UtcNow);

        try
        {
            // Delete cache entries older than 24 hours
            var cutoffDate = DateTime.UtcNow.AddDays(-1);
            
            var expiredResources = await _dbContext.CachedResources
                .Where(r => r.CachedAt < cutoffDate)
                .ToListAsync();
            _dbContext.CachedResources.RemoveRange(expiredResources);

            var expiredCosts = await _dbContext.CachedCosts
                .Where(c => c.CachedAt < cutoffDate)
                .ToListAsync();
            _dbContext.CachedCosts.RemoveRange(expiredCosts);

            var expiredResourceCosts = await _dbContext.CachedResourceCosts
                .Where(rc => rc.CachedAt < cutoffDate)
                .ToListAsync();
            _dbContext.CachedResourceCosts.RemoveRange(expiredResourceCosts);

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("✓ Cache cleanup completed - removed {resources} resources, {costs} costs, {resourceCosts} resource costs",
                expiredResources.Count, expiredCosts.Count, expiredResourceCosts.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup cache");
        }
    }

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

            // Delete old cached resources for these subscriptions
            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
            var oldResources = await _dbContext.CachedResources
                .Where(r => subscriptionIds.Contains(r.SubscriptionId))
                .ToListAsync();
            _dbContext.CachedResources.RemoveRange(oldResources);

            // Insert new resources
            foreach (var resource in resources)
            {
                _dbContext.CachedResources.Add(new AzureLens.API.Data.Entities.CachedResource
                {
                    SubscriptionId = resource.SubscriptionId,
                    ResourceId = resource.Id,
                    Name = resource.Name,
                    Type = resource.Type,
                    Location = resource.Location,
                    ResourceGroup = resource.ResourceGroup,
                    TagsJson = resource.Tags != null ? System.Text.Json.JsonSerializer.Serialize(resource.Tags) : "{}",
                    CachedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();
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
            _logger.LogInformation("Fetching costs from Azure...");
            var costs = await _azureService.GetCostsAsync(credentials);
            
            if (costs == null || !costs.Any())
            {
                _logger.LogWarning("No costs found");
                return;
            }

            // Delete old cached costs for these subscriptions
            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
            var oldCosts = await _dbContext.CachedCosts
                .Where(c => subscriptionIds.Contains(c.SubscriptionId))
                .ToListAsync();
            _dbContext.CachedCosts.RemoveRange(oldCosts);

            // Insert new costs
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
                    CostsByServiceJson = cost.CostsByService != null ? System.Text.Json.JsonSerializer.Serialize(cost.CostsByService) : "[]",
                    CachedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("  ✓ Cached costs for {count} subscriptions to database", costs.Count);
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
            var startDate = DateTime.UtcNow.AddDays(-364); // 1 full year to match Backend
            var endDate = DateTime.UtcNow;
            var resourceCosts = await _azureService.GetResourceCostsAsync(credentials, startDate, endDate);
            
            if (resourceCosts == null || !resourceCosts.Any())
            {
                _logger.LogWarning("No resource costs found");
                return;
            }

            // Create context hash from subscription IDs + date range (MUST match Backend CacheService format)
            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
            var contextString = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
            var contextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(contextString));
            
            // Delete old cached resource costs for this context
            var oldResourceCosts = await _dbContext.CachedResourceCosts
                .Where(c => c.ContextHash == contextHash)
                .ToListAsync();
            _dbContext.CachedResourceCosts.RemoveRange(oldResourceCosts);

            // Insert new resource costs
            foreach (var cost in resourceCosts)
            {
                _dbContext.CachedResourceCosts.Add(new AzureLens.API.Data.Entities.CachedResourceCost
                {
                    ContextHash = contextHash,
                    ResourceId = cost.ResourceId,
                    ResourceName = cost.ResourceName,
                    ResourceType = cost.ResourceType,
                    ResourceGroup = cost.ResourceGroup,
                    TotalCost = cost.TotalCost,
                    MonthlyCostsJson = cost.MonthlyCosts != null ? System.Text.Json.JsonSerializer.Serialize(cost.MonthlyCosts) : "[]",
                    CachedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("  ✓ Cached {count} resource cost records to database", resourceCosts.Count);

            // Derive monthly aggregated costs from resource costs (no extra API call needed)
            // GetResourceCostsAsync uses monthly granularity — aggregate by month across all resources
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
                var monthlyCostContextString = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
                var monthlyContextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(monthlyCostContextString));

                var oldMonthly = await _dbContext.CachedMonthlyCosts
                    .Where(c => c.ContextHash == monthlyContextHash)
                    .ToListAsync();
                _dbContext.CachedMonthlyCosts.RemoveRange(oldMonthly);

                foreach (var mc in monthlyCostsByMonth)
                {
                    _dbContext.CachedMonthlyCosts.Add(new AzureLens.API.Data.Entities.CachedMonthlyCost
                    {
                        ContextHash = monthlyContextHash,
                        Month = mc.Month,
                        Cost = mc.Cost,
                        Currency = mc.Currency,
                        CachedAt = DateTime.UtcNow
                    });
                }
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("  ✓ Derived and cached {count} monthly cost records from resource data", monthlyCostsByMonth.Count);
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
            var complianceData = await _complianceService.GetSoc2ControlsAsync(credentials, credentials.SubscriptionIds ?? new List<string>());
            _logger.LogInformation("  ✓ Cached compliance data");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "  ✗ Failed to refresh compliance");
        }
    }
}

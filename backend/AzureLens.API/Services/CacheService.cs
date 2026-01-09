using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using AzureLens.API.Models;

namespace AzureLens.API.Services;

public class CacheService : ICacheService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CacheService> _logger;

    public CacheService(AppDbContext context, IConfiguration configuration, ILogger<CacheService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<List<AzureResource>?> GetCachedResourcesAsync(List<string> subscriptionIds)
    {
        if (!subscriptionIds.Any())
            return null;

        var cacheMinutes = int.Parse(_configuration["CacheSettings:ResourceCacheMinutes"] ?? "30");
        var cutoffTime = DateTime.UtcNow.AddMinutes(-cacheMinutes);

        var cached = await _context.CachedResources
            .Where(r => subscriptionIds.Contains(r.SubscriptionId) && r.CachedAt > cutoffTime)
            .ToListAsync();

        if (!cached.Any())
            return null;

        _logger.LogInformation($"Retrieved {cached.Count} cached resources for {subscriptionIds.Count} subscriptions");
        
        return cached.Select(c => new AzureResource
        {
            Id = c.ResourceId,
            Name = c.Name,
            Type = c.Type,
            Location = c.Location,
            SubscriptionId = c.SubscriptionId,
            ResourceGroup = c.ResourceGroup,
            Tags = JsonSerializer.Deserialize<Dictionary<string, string>>(c.TagsJson) ?? new Dictionary<string, string>()
        }).ToList();
    }

    public async Task CacheResourcesAsync(List<AzureResource> resources)
    {
        if (!resources.Any())
            return;

        var subscriptionIds = resources.Select(r => r.SubscriptionId).Distinct().ToList();
        
        // Clear old cache for these subscriptions using ExecuteDelete (no tracking, no concurrency issues)
        await _context.CachedResources
            .Where(r => subscriptionIds.Contains(r.SubscriptionId))
            .ExecuteDeleteAsync();

        // Deduplicate resources by ResourceId (in case Azure returns duplicates)
        var uniqueResources = resources
            .GroupBy(r => r.Id)
            .Select(g => g.First())
            .ToList();

        if (uniqueResources.Count < resources.Count)
        {
            _logger.LogWarning($"Removed {resources.Count - uniqueResources.Count} duplicate resources (by ResourceId)");
        }

        // Add new cache
        var cached = uniqueResources.Select(r => new Data.Entities.CachedResource
        {
            ResourceId = r.Id,
            Name = r.Name,
            Type = r.Type,
            Location = r.Location,
            SubscriptionId = r.SubscriptionId,
            ResourceGroup = r.ResourceGroup,
            TagsJson = JsonSerializer.Serialize(r.Tags),
            CachedAt = DateTime.UtcNow
        });

        _context.CachedResources.AddRange(cached);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Cached {uniqueResources.Count} unique resources across {subscriptionIds.Count} subscriptions");
    }

    public async Task<List<CostData>?> GetCachedCostsAsync(List<string> subscriptionIds)
    {
        if (!subscriptionIds.Any())
            return null;

        var cacheMinutes = int.Parse(_configuration["CacheSettings:CostCacheMinutes"] ?? "60");
        var cutoffTime = DateTime.UtcNow.AddMinutes(-cacheMinutes);

        var cached = await _context.CachedCosts
            .Where(c => subscriptionIds.Contains(c.SubscriptionId) && c.CachedAt > cutoffTime)
            .ToListAsync();

        if (!cached.Any())
            return null;

        _logger.LogInformation($"Retrieved {cached.Count} cached costs for {subscriptionIds.Count} subscriptions");
        
        return cached.Select(c => new CostData
        {
            SubscriptionId = c.SubscriptionId,
            SubscriptionName = c.SubscriptionName,
            TotalCost = c.TotalCost,
            Currency = c.Currency,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            CostsByService = JsonSerializer.Deserialize<List<CostByService>>(c.CostsByServiceJson) ?? new List<CostByService>()
        }).ToList();
    }

    public async Task CacheCostsAsync(List<CostData> costs)
    {
        if (!costs.Any())
            return;

        var subscriptionIds = costs.Select(c => c.SubscriptionId).Distinct().ToList();
        
        // Clear old cache for these subscriptions using ExecuteDelete (no tracking, no concurrency issues)
        await _context.CachedCosts
            .Where(c => subscriptionIds.Contains(c.SubscriptionId))
            .ExecuteDeleteAsync();

        // Add new cache
        var cached = costs.Select(c => new Data.Entities.CachedCost
        {
            SubscriptionId = c.SubscriptionId,
            SubscriptionName = c.SubscriptionName,
            TotalCost = c.TotalCost,
            Currency = c.Currency,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            CostsByServiceJson = JsonSerializer.Serialize(c.CostsByService),
            CachedAt = DateTime.UtcNow
        });

        _context.CachedCosts.AddRange(cached);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Cached costs for {subscriptionIds.Count} subscriptions");
    }

    public async Task<List<AIRecommendation>?> GetCachedAIRecommendationsAsync(List<string> subscriptionIds)
    {
        if (!subscriptionIds.Any())
            return null;

        var cacheMinutes = int.Parse(_configuration["CacheSettings:AIRecommendationCacheMinutes"] ?? "120");
        var cutoffTime = DateTime.UtcNow.AddMinutes(-cacheMinutes);

        // Generate context hash from subscription IDs
        var subscriptionIdsList = string.Join(",", subscriptionIds.OrderBy(s => s));
        var contextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(subscriptionIdsList));

        // Get cached recommendations for this context
        var cached = await _context.CachedAIRecommendations
            .Where(r => r.ContextHash == contextHash && r.CachedAt > cutoffTime)
            .ToListAsync();

        if (!cached.Any())
            return null;

        _logger.LogInformation($"Retrieved {cached.Count} cached AI recommendations for {subscriptionIds.Count} subscriptions");
        
        return cached.Select(c => new AIRecommendation
        {
            Category = c.Category,
            Title = c.Title,
            Description = c.Description,
            Priority = c.Priority,
            PotentialSavings = c.PotentialSavings,
            Effort = c.Effort
        }).ToList();
    }

    public async Task CacheAIRecommendationsAsync(List<AIRecommendation> recommendations, List<string> subscriptionIds)
    {
        if (!recommendations.Any() || !subscriptionIds.Any())
            return;

        // Generate context hash from subscription IDs
        var subscriptionIdsList = string.Join(",", subscriptionIds.OrderBy(s => s));
        var contextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(subscriptionIdsList));

        // Clear old cache for this context using ExecuteDelete (no tracking, no concurrency issues)
        await _context.CachedAIRecommendations
            .Where(r => r.ContextHash == contextHash)
            .ExecuteDeleteAsync();

        // Add new cache
        var cached = recommendations.Select(r => new CachedAIRecommendation
        {
            Category = r.Category,
            Title = r.Title,
            Description = r.Description,
            Priority = r.Priority,
            PotentialSavings = r.PotentialSavings,
            Effort = r.Effort,
            ContextHash = contextHash,
            CachedAt = DateTime.UtcNow
        });

        _context.CachedAIRecommendations.AddRange(cached);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Cached {recommendations.Count} AI recommendations for {subscriptionIds.Count} subscriptions (hash: {contextHash})");
    }

    public async Task<List<MonthlyCost>?> GetCachedMonthlyCostsAsync(List<string> subscriptionIds, DateTime startDate, DateTime endDate)
    {
        if (!subscriptionIds.Any())
            return null;

        var cacheMinutes = int.Parse(_configuration["CacheSettings:CostCacheMinutes"] ?? "60");
        var cutoffTime = DateTime.UtcNow.AddMinutes(-cacheMinutes);

        // Generate context hash from subscription IDs + date range
        var contextString = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
        var contextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(contextString));

        var cached = await _context.CachedMonthlyCosts
            .Where(c => c.ContextHash == contextHash && c.CachedAt > cutoffTime)
            .ToListAsync();

        if (!cached.Any())
            return null;

        _logger.LogInformation($"Retrieved {cached.Count} cached monthly costs for {subscriptionIds.Count} subscriptions from {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
        
        return cached.Select(c => new MonthlyCost
        {
            Month = c.Month,
            Cost = c.Cost,
            Currency = c.Currency
        }).ToList();
    }

    public async Task CacheMonthlyCostsAsync(List<MonthlyCost> costs, List<string> subscriptionIds, DateTime startDate, DateTime endDate)
    {
        if (!costs.Any() || !subscriptionIds.Any())
            return;

        // Generate context hash from subscription IDs + date range
        var contextString = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
        var contextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(contextString));

        // Clear old cache for this context using ExecuteDelete (no tracking, no concurrency issues)
        await _context.CachedMonthlyCosts
            .Where(c => c.ContextHash == contextHash)
            .ExecuteDeleteAsync();

        // Add new cache
        var cached = costs.Select(c => new Data.Entities.CachedMonthlyCost
        {
            ContextHash = contextHash,
            Month = c.Month,
            Cost = c.Cost,
            Currency = c.Currency,
            CachedAt = DateTime.UtcNow
        });

        _context.CachedMonthlyCosts.AddRange(cached);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Cached {costs.Count} monthly costs for {subscriptionIds.Count} subscriptions from {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
    }

    public async Task<List<ResourceCostData>?> GetCachedResourceCostsAsync(List<string> subscriptionIds, DateTime startDate, DateTime endDate)
    {
        if (!subscriptionIds.Any())
            return null;

        var cacheMinutes = int.Parse(_configuration["CacheSettings:CostCacheMinutes"] ?? "60");
        var cutoffTime = DateTime.UtcNow.AddMinutes(-cacheMinutes);

        // Generate context hash from subscription IDs + date range
        var contextString = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
        var contextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(contextString));

        var cached = await _context.CachedResourceCosts
            .Where(c => c.ContextHash == contextHash && c.CachedAt > cutoffTime)
            .ToListAsync();

        if (!cached.Any())
            return null;

        _logger.LogInformation($"Retrieved {cached.Count} cached resource costs for {subscriptionIds.Count} subscriptions from {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
        
        return cached.Select(c => new ResourceCostData
        {
            ResourceId = c.ResourceId,
            ResourceName = c.ResourceName,
            ResourceType = c.ResourceType,
            ResourceGroup = c.ResourceGroup,
            TotalCost = c.TotalCost,
            MonthlyCosts = JsonSerializer.Deserialize<List<MonthlyCost>>(c.MonthlyCostsJson) ?? new List<MonthlyCost>()
        }).ToList();
    }

    public async Task CacheResourceCostsAsync(List<ResourceCostData> costs, List<string> subscriptionIds, DateTime startDate, DateTime endDate)
    {
        if (!costs.Any() || !subscriptionIds.Any())
            return;

        // Generate context hash from subscription IDs + date range
        var contextString = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
        var contextHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(contextString));

        // Clear old cache for this context using ExecuteDelete (no tracking, no concurrency issues)
        await _context.CachedResourceCosts
            .Where(c => c.ContextHash == contextHash)
            .ExecuteDeleteAsync();

        // Add new cache
        var cached = costs.Select(c => new Data.Entities.CachedResourceCost
        {
            ContextHash = contextHash,
            ResourceId = c.ResourceId,
            ResourceName = c.ResourceName,
            ResourceType = c.ResourceType,
            ResourceGroup = c.ResourceGroup,
            TotalCost = c.TotalCost,
            MonthlyCostsJson = JsonSerializer.Serialize(c.MonthlyCosts),
            CachedAt = DateTime.UtcNow
        });

        _context.CachedResourceCosts.AddRange(cached);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Cached {costs.Count} resource costs for {subscriptionIds.Count} subscriptions from {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
    }

    public async Task ClearExpiredCacheAsync()
    {
        var resourceCutoff = DateTime.UtcNow.AddMinutes(-int.Parse(_configuration["CacheSettings:ResourceCacheMinutes"] ?? "30"));
        var costCutoff = DateTime.UtcNow.AddMinutes(-int.Parse(_configuration["CacheSettings:CostCacheMinutes"] ?? "60"));
        var aiCutoff = DateTime.UtcNow.AddMinutes(-int.Parse(_configuration["CacheSettings:AIRecommendationCacheMinutes"] ?? "120"));

        var expiredResources = await _context.CachedResources.Where(r => r.CachedAt < resourceCutoff).ToListAsync();
        var expiredCosts = await _context.CachedCosts.Where(c => c.CachedAt < costCutoff).ToListAsync();
        var expiredMonthlyCosts = await _context.CachedMonthlyCosts.Where(c => c.CachedAt < costCutoff).ToListAsync();
        var expiredResourceCosts = await _context.CachedResourceCosts.Where(c => c.CachedAt < costCutoff).ToListAsync();
        var expiredAI = await _context.CachedAIRecommendations.Where(r => r.CachedAt < aiCutoff).ToListAsync();

        _context.CachedResources.RemoveRange(expiredResources);
        _context.CachedCosts.RemoveRange(expiredCosts);
        _context.CachedMonthlyCosts.RemoveRange(expiredMonthlyCosts);
        _context.CachedResourceCosts.RemoveRange(expiredResourceCosts);
        _context.CachedAIRecommendations.RemoveRange(expiredAI);

        await _context.SaveChangesAsync();

        _logger.LogInformation($"Cleared expired cache: {expiredResources.Count} resources, {expiredCosts.Count} costs, {expiredMonthlyCosts.Count} monthly costs, {expiredResourceCosts.Count} resource costs, {expiredAI.Count} AI recommendations");
    }

    public async Task ClearAllCacheAsync()
    {
        await _context.CachedResources.ExecuteDeleteAsync();
        await _context.CachedCosts.ExecuteDeleteAsync();
        await _context.CachedMonthlyCosts.ExecuteDeleteAsync();
        await _context.CachedResourceCosts.ExecuteDeleteAsync();
        await _context.CachedAIRecommendations.ExecuteDeleteAsync();

        _logger.LogInformation("Cleared all cache entries from database");
    }
}

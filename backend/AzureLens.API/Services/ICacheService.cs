using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface ICacheService
{
    Task<List<AzureResource>?> GetCachedResourcesAsync(List<string> subscriptionIds);
    Task CacheResourcesAsync(List<AzureResource> resources);
    
    Task<List<CostData>?> GetCachedCostsAsync(List<string> subscriptionIds);
    Task CacheCostsAsync(List<CostData> costs);
    
    Task<List<AIRecommendation>?> GetCachedAIRecommendationsAsync(List<string> subscriptionIds);
    Task CacheAIRecommendationsAsync(List<AIRecommendation> recommendations, List<string> subscriptionIds);
    
    Task<List<MonthlyCost>?> GetCachedMonthlyCostsAsync(List<string> subscriptionIds, DateTime startDate, DateTime endDate);
    Task CacheMonthlyCostsAsync(List<MonthlyCost> costs, List<string> subscriptionIds, DateTime startDate, DateTime endDate);
    
    Task<List<ResourceCostData>?> GetCachedResourceCostsAsync(List<string> subscriptionIds, DateTime startDate, DateTime endDate);
    Task CacheResourceCostsAsync(List<ResourceCostData> costs, List<string> subscriptionIds, DateTime startDate, DateTime endDate);
    
    Task ClearExpiredCacheAsync();
    Task ClearAllCacheAsync();
}

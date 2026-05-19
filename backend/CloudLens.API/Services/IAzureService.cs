using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IAzureService
{
    Task<bool> ValidateCredentialsAsync(AzureCredentials credentials);
    Task<List<AzureResource>> GetResourcesAsync(AzureCredentials credentials);
    Task<List<CostData>> GetCostsAsync(AzureCredentials credentials);
    Task<List<MonthlyCost>> GetMonthlyCostsAsync(AzureCredentials credentials, DateTime startDate, DateTime endDate);
    Task<List<ResourceCostData>> GetResourceCostsAsync(AzureCredentials credentials, DateTime startDate, DateTime endDate);
    Task<List<SecurityRecommendation>> GetSecurityRecommendationsAsync(AzureCredentials credentials);
    Task<List<SubscriptionInfo>> GetSubscriptionsAsync(AzureCredentials credentials);
    Task<List<string>> GetSubscriptionIdsAsync(AzureCredentials credentials);
    Task<List<AlertRule>> GetAlertRulesAsync(AzureCredentials credentials);
    Task<List<AKSService>> GetAKSServicesAsync(AzureCredentials credentials);
    Task<List<AKSPod>> GetAKSPodsAsync(AzureCredentials credentials);
    Task<List<SecureScore>> GetSecureScoresAsync(AzureCredentials credentials);
}

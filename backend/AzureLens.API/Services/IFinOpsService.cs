using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IFinOpsService
{
    Task<FinOpsMetrics> GetFinOpsMetricsAsync(AzureCredentials credentials);
    Task<List<WastedResource>> GetWastedResourcesAsync(AzureCredentials credentials);
    Task<List<AdvisorRecommendation>> GetAdvisorRecommendationsAsync(AzureCredentials credentials, string? category = null);
    Task<List<RightsizingRecommendation>> GetRightsizingRecommendationsAsync(AzureCredentials credentials);
    Task<List<CostAnomaly>> DetectCostAnomaliesAsync(AzureCredentials credentials);
    Task<List<CostForecast>> GetCostForecastAsync(AzureCredentials credentials);
    Task<List<BudgetData>> GetBudgetsAsync(AzureCredentials credentials);
    Task<TagComplianceReport> GetTagComplianceAsync(AzureCredentials credentials, List<string>? requiredTags = null);
    Task<List<AIRecommendation>> GenerateFinOpsAIInsightsAsync(AzureCredentials credentials, string insightType);
}

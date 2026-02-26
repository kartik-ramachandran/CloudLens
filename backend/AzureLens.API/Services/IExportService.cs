using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IExportService
{
    Task<byte[]> ExportResourcesToPdfAsync(List<AzureResource> resources, string subscriptionName);
    Task<byte[]> ExportResourcesToExcelAsync(List<AzureResource> resources, string subscriptionName);
    Task<byte[]> ExportResourcesToCsvAsync(List<AzureResource> resources, string subscriptionName);
    Task<byte[]> ExportCostsToPdfAsync(List<CostData> costs, DateTime startDate, DateTime endDate);
    Task<byte[]> ExportCostsToExcelAsync(List<CostData> costs, DateTime startDate, DateTime endDate);
    Task<byte[]> ExportCostsToCsvAsync(List<CostData> costs, DateTime startDate, DateTime endDate);
    Task<byte[]> ExportRecommendationsToPdfAsync(List<SecurityRecommendation> recommendations);
    Task<byte[]> ExportRecommendationsToExcelAsync(List<SecurityRecommendation> recommendations);
    Task<byte[]> ExportRecommendationsToCsvAsync(List<SecurityRecommendation> recommendations);
}

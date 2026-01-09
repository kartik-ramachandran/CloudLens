using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IAIService
{
    Task<List<AIRecommendation>> GenerateRecommendationsAsync(AzureContext context);
}

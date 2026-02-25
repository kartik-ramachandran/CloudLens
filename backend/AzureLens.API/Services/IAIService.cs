using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IAIService
{
    Task<List<AIRecommendation>> GenerateRecommendationsAsync(AzureContext context);
    Task<List<AIRecommendation>> GenerateFinOpsRecommendationsAsync(AzureFinOpsContext context);
    Task<string> GenerateComplianceNarrativeAsync(List<Soc2Control> controls, double overallPercent);
    Task<List<RemediationSuggestion>> GenerateRemediationSuggestionsAsync(ComplianceRemediationContext context);
}

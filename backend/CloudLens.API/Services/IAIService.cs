using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IAIService
{
    Task<List<AIRecommendation>> GenerateRecommendationsAsync(AzureContext context);
    Task<List<AIRecommendation>> GenerateFinOpsRecommendationsAsync(AzureFinOpsContext context);
    Task<string> GenerateChatResponseAsync(IEnumerable<ChatExchange> messages, string systemPrompt, CancellationToken cancellationToken = default);
    Task<string> GenerateComplianceNarrativeAsync(List<Soc2Control> controls, double overallPercent);
    Task<List<RemediationSuggestion>> GenerateRemediationSuggestionsAsync(ComplianceRemediationContext context);
}

public record ChatExchange(string Role, string Content);

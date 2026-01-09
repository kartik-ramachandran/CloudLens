using System.Text;
using System.Text.Json;
using AzureLens.API.Models;
using AzureLens.API.Data.Entities;

namespace AzureLens.API.Services;

public class OpenAIService : IAIService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenAIService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAISettingsService _aiSettingsService;

    public OpenAIService(
        IConfiguration configuration, 
        ILogger<OpenAIService> logger, 
        IHttpClientFactory httpClientFactory,
        IAISettingsService aiSettingsService)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _aiSettingsService = aiSettingsService;
    }

    public async Task<List<AIRecommendation>> GenerateRecommendationsAsync(AzureContext context)
    {
        try
        {
            var settings = await _aiSettingsService.GetOrCreateSettingsAsync();

            if (string.IsNullOrEmpty(settings.ApiKey))
            {
                throw new Exception("AI API key is not configured. Please configure it in Settings.");
            }

            var prompt = BuildPrompt(context);

            return settings.Provider.ToLower() switch
            {
                "openai" => await GenerateOpenAIRecommendationsAsync(settings, prompt),
                "anthropic" => await GenerateAnthropicRecommendationsAsync(settings, prompt),
                "bedrock" => await GenerateBedrockRecommendationsAsync(settings, prompt),
                _ => throw new Exception($"Unsupported AI provider: {settings.Provider}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating AI recommendations");
            throw new Exception($"Failed to generate recommendations: {ex.Message}");
        }
    }

    private async Task<List<AIRecommendation>> GenerateOpenAIRecommendationsAsync(AISettings settings, string prompt)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {settings.ApiKey}");

        var requestBody = new
        {
            model = settings.Model,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = "You are an Azure cloud architect expert specializing in cost optimization, performance tuning, and best practices. Provide actionable recommendations in JSON format."
                },
                new
                {
                    role = "user",
                    content = prompt
                }
            },
            max_tokens = settings.MaxTokens,
            temperature = settings.Temperature,
            response_format = new { type = "json_object" }
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        var endpoint = settings.Endpoint ?? "https://api.openai.com/v1/chat/completions";
        var response = await httpClient.PostAsync(endpoint, content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent);

        if (apiResponse?.Choices != null && apiResponse.Choices.Length > 0)
        {
            var messageContent = apiResponse.Choices[0].Message.Content;
            var recommendationsWrapper = JsonSerializer.Deserialize<RecommendationsWrapper>(messageContent);
            return recommendationsWrapper?.Recommendations ?? new List<AIRecommendation>();
        }

        return new List<AIRecommendation>();
    }

    private async Task<List<AIRecommendation>> GenerateAnthropicRecommendationsAsync(AISettings settings, string prompt)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("x-api-key", settings.ApiKey);
        httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var requestBody = new
        {
            model = settings.Model,
            max_tokens = settings.MaxTokens,
            temperature = settings.Temperature,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = $@"You are an Azure cloud architect expert. {prompt}
                    
Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{{
  ""recommendations"": [
    {{
      ""category"": ""Cost Optimization"",
      ""title"": ""Brief title"",
      ""description"": ""Detailed explanation"",
      ""priority"": ""High"",
      ""potentialSavings"": ""$X-Y per month"",
      ""effort"": ""Low""
    }}
  ]
}}"
                }
            }
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        var endpoint = settings.Endpoint ?? "https://api.anthropic.com/v1/messages";
        var response = await httpClient.PostAsync(endpoint, content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseContent);
        
        if (doc.RootElement.TryGetProperty("content", out var contentArray) && contentArray.GetArrayLength() > 0)
        {
            var firstContent = contentArray[0];
            if (firstContent.TryGetProperty("text", out var textElement))
            {
                var text = textElement.GetString() ?? "";
                var recommendationsWrapper = JsonSerializer.Deserialize<RecommendationsWrapper>(text);
                return recommendationsWrapper?.Recommendations ?? new List<AIRecommendation>();
            }
        }

        return new List<AIRecommendation>();
    }

    private Task<List<AIRecommendation>> GenerateBedrockRecommendationsAsync(AISettings settings, string prompt)
    {
        // AWS Bedrock implementation would require AWS SDK
        // For now, return a placeholder
        _logger.LogWarning("Bedrock provider is not yet fully implemented");
        throw new NotImplementedException("AWS Bedrock provider is not yet implemented. Please use OpenAI or Anthropic.");
    }

    private string BuildPrompt(AzureContext context)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Analyze the following Azure environment and provide recommendations:");
        sb.AppendLine($"- Total Resources: {context.ResourceCount}");
        sb.AppendLine($"- Total Monthly Cost: ${context.TotalCost:F2}");
        sb.AppendLine($"- Number of Subscriptions: {context.SubscriptionCount}");
        sb.AppendLine($"- Resource Types: {string.Join(", ", context.ResourceTypes.Take(10))}");
        sb.AppendLine($"- Azure Regions: {string.Join(", ", context.Locations.Take(10))}");
        sb.AppendLine();
        sb.AppendLine("Provide 5-8 specific, actionable recommendations covering:");
        sb.AppendLine("1. Cost optimization opportunities");
        sb.AppendLine("2. SKU rightsizing suggestions");
        sb.AppendLine("3. Architecture improvements");
        sb.AppendLine("4. Security enhancements");
        sb.AppendLine("5. Performance optimizations");
        sb.AppendLine();
        sb.AppendLine("Return a JSON object with this exact structure:");
        sb.AppendLine(@"{
  ""recommendations"": [
    {
      ""category"": ""Cost Optimization"",
      ""title"": ""Brief title"",
      ""description"": ""Detailed explanation with specific steps"",
      ""priority"": ""High"",
      ""potentialSavings"": ""$X-Y per month"",
      ""effort"": ""Low""
    }
  ]
}");
        sb.AppendLine();
        sb.AppendLine("Categories: Cost Optimization, Performance, Security, Architecture, Compliance");
        sb.AppendLine("Priority: High, Medium, Low");
        sb.AppendLine("Effort: Low, Medium, High");

        return sb.ToString();
    }

    private class OpenAIResponse
    {
        public Choice[]? Choices { get; set; }
    }

    private class Choice
    {
        public Message Message { get; set; } = new();
    }

    private class Message
    {
        public string Content { get; set; } = string.Empty;
    }

    private class RecommendationsWrapper
    {
        public List<AIRecommendation> Recommendations { get; set; } = new();
    }
}

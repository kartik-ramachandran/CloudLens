using System.Text;
using System.Text.Json;
using Amazon;
using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;
using Amazon.Runtime;
using CloudLens.API.Models;
using CloudLens.API.Data.Entities;

namespace CloudLens.API.Services;

public class OpenAIService : IAIService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenAIService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAISettingsService _aiSettingsService;

    private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    };

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
                "azureopenai" => await GenerateAzureOpenAIRecommendationsAsync(settings, prompt),
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

    public async Task<string> GenerateChatResponseAsync(IEnumerable<ChatExchange> messages, string systemPrompt, CancellationToken cancellationToken = default)
    {
        var settings = await _aiSettingsService.GetOrCreateSettingsAsync();
        if (string.IsNullOrEmpty(settings.ApiKey) && !string.Equals(settings.Provider, "Bedrock", StringComparison.OrdinalIgnoreCase))
            throw new Exception("AI API key is not configured. Please configure it in Settings.");

        var normalizedMessages = messages
            .Where(m => !string.IsNullOrWhiteSpace(m.Content))
            .Select(m => new ChatExchange(
                string.Equals(m.Role, "assistant", StringComparison.OrdinalIgnoreCase) ? "assistant" : "user",
                m.Content.Trim()))
            .ToList();

        if (!normalizedMessages.Any())
            throw new Exception("A chat message is required.");

        return settings.Provider.ToLowerInvariant() switch
        {
            "openai" => await GenerateOpenAIChatResponseAsync(settings, systemPrompt, normalizedMessages, cancellationToken),
            "azureopenai" => await GenerateAzureOpenAIChatResponseAsync(settings, systemPrompt, normalizedMessages, cancellationToken),
            "anthropic" => await GenerateAnthropicChatResponseAsync(settings, systemPrompt, normalizedMessages, cancellationToken),
            "bedrock" => await GenerateBedrockChatResponseAsync(settings, systemPrompt, normalizedMessages),
            _ => throw new Exception($"Unsupported AI provider: {settings.Provider}")
        };
    }

    private async Task<string> GenerateOpenAIChatResponseAsync(AISettings settings, string systemPrompt, List<ChatExchange> messages, CancellationToken cancellationToken)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {settings.ApiKey}");

        var requestBody = new
        {
            model = settings.Model,
            messages = new[] { new { role = "system", content = systemPrompt } }
                .Concat(messages.Select(m => new { role = m.Role, content = m.Content }))
                .ToArray(),
            max_tokens = Math.Max(settings.MaxTokens, 1200),
            temperature = Math.Min(settings.Temperature, 0.5)
        };

        var endpoint = settings.Endpoint ?? "https://api.openai.com/v1/chat/completions";
        var response = await httpClient.PostAsync(endpoint, new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"), cancellationToken);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
        var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent, _jsonOptions);
        return apiResponse?.Choices?.FirstOrDefault()?.Message.Content?.Trim() ?? "";
    }

    private async Task<string> GenerateAzureOpenAIChatResponseAsync(AISettings settings, string systemPrompt, List<ChatExchange> messages, CancellationToken cancellationToken)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("api-key", settings.ApiKey);

        var requestBody = new
        {
            messages = new[] { new { role = "system", content = systemPrompt } }
                .Concat(messages.Select(m => new { role = m.Role, content = m.Content }))
                .ToArray(),
            max_tokens = Math.Max(settings.MaxTokens, 1200),
            temperature = Math.Min(settings.Temperature, 0.5)
        };

        var endpoint = settings.Endpoint ?? throw new Exception("Azure OpenAI requires an endpoint URL. Please configure it in Settings.");
        var response = await httpClient.PostAsync(endpoint, new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"), cancellationToken);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
        var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent, _jsonOptions);
        return apiResponse?.Choices?.FirstOrDefault()?.Message.Content?.Trim() ?? "";
    }

    private async Task<string> GenerateAnthropicChatResponseAsync(AISettings settings, string systemPrompt, List<ChatExchange> messages, CancellationToken cancellationToken)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("x-api-key", settings.ApiKey);
        httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var requestBody = new
        {
            model = settings.Model,
            system = systemPrompt,
            max_tokens = Math.Max(settings.MaxTokens, 1200),
            temperature = Math.Min(settings.Temperature, 0.5),
            messages = messages.Select(m => new { role = m.Role, content = m.Content }).ToArray()
        };

        var response = await httpClient.PostAsync(
            settings.Endpoint ?? "https://api.anthropic.com/v1/messages",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"),
            cancellationToken);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(responseContent);
        if (doc.RootElement.TryGetProperty("content", out var contentArray) && contentArray.GetArrayLength() > 0)
            if (contentArray[0].TryGetProperty("text", out var textElement))
                return textElement.GetString()?.Trim() ?? "";

        return "";
    }

    private async Task<string> GenerateBedrockChatResponseAsync(AISettings settings, string systemPrompt, List<ChatExchange> messages)
    {
        var transcript = string.Join("\n\n", messages.Select(m => $"{m.Role.ToUpperInvariant()}: {m.Content}"));
        return (await CallBedrockClaudeAsync(
            systemPrompt: systemPrompt,
            userPrompt: transcript,
            maxTokens: Math.Max(settings.MaxTokens, 1200),
            temperature: (float)Math.Min(settings.Temperature, 0.5))).Trim();
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
        var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent, _jsonOptions);

        if (apiResponse?.Choices != null && apiResponse.Choices.Length > 0)
        {
            var messageContent = apiResponse.Choices[0].Message.Content;
            var recommendationsWrapper = JsonSerializer.Deserialize<RecommendationsWrapper>(messageContent, _jsonOptions);
            return recommendationsWrapper?.Recommendations ?? new List<AIRecommendation>();
        }

        return new List<AIRecommendation>();
    }

    private async Task<List<AIRecommendation>> GenerateAzureOpenAIRecommendationsAsync(AISettings settings, string prompt)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("api-key", settings.ApiKey);

        var requestBody = new
        {
            messages = new[]
            {
                new { role = "system", content = "You are an Azure cloud architect expert specializing in cost optimization, performance tuning, and best practices. Provide actionable recommendations in JSON format." },
                new { role = "user", content = prompt }
            },
            max_tokens = settings.MaxTokens,
            temperature = settings.Temperature,
            response_format = new { type = "json_object" }
        };

        var endpoint = settings.Endpoint ?? throw new Exception("Azure OpenAI requires an endpoint URL. Please configure it in Settings.");
        var response = await httpClient.PostAsync(endpoint, new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent, _jsonOptions);

        if (apiResponse?.Choices != null && apiResponse.Choices.Length > 0)
        {
            var messageContent = apiResponse.Choices[0].Message.Content;
            var recommendationsWrapper = JsonSerializer.Deserialize<RecommendationsWrapper>(messageContent, _jsonOptions);
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
                var recommendationsWrapper = JsonSerializer.Deserialize<RecommendationsWrapper>(text, _jsonOptions);
                return recommendationsWrapper?.Recommendations ?? new List<AIRecommendation>();
            }
        }

        return new List<AIRecommendation>();
    }

    private async Task<List<AIRecommendation>> GenerateBedrockRecommendationsAsync(AISettings settings, string prompt)
    {
        var text = await CallBedrockClaudeAsync(
            systemPrompt: "You are an Azure cloud architect expert specializing in cost optimization, performance tuning, and best practices. Provide actionable recommendations in JSON format.",
            userPrompt: prompt,
            maxTokens: settings.MaxTokens,
            temperature: (float)settings.Temperature);

        var recommendationsWrapper = JsonSerializer.Deserialize<RecommendationsWrapper>(text, _jsonOptions);
        return recommendationsWrapper?.Recommendations ?? new List<AIRecommendation>();
    }

    /// <summary>
    /// Invokes an Anthropic Claude model via AWS Bedrock Runtime and returns the raw text response.
    /// AWS credentials and model ID are read from AWS:Bedrock config section.
    /// </summary>
    private async Task<string> CallBedrockClaudeAsync(
        string userPrompt,
        string? systemPrompt = null,
        int maxTokens = 2000,
        float temperature = 0.7f)
    {
        var region = _configuration["AWS:Bedrock:Region"] ?? "ap-southeast-2";
        var modelId = _configuration["AWS:Bedrock:ModelId"] ?? "au.anthropic.claude-sonnet-4-6";
        var accessKey = _configuration["AWS:Bedrock:AccessKeyId"];
        var secretKey = _configuration["AWS:Bedrock:SecretAccessKey"];

        AmazonBedrockRuntimeClient client;
        if (!string.IsNullOrEmpty(accessKey) && !string.IsNullOrEmpty(secretKey))
            client = new AmazonBedrockRuntimeClient(
                new BasicAWSCredentials(accessKey, secretKey),
                RegionEndpoint.GetBySystemName(region));
        else
            client = new AmazonBedrockRuntimeClient(RegionEndpoint.GetBySystemName(region));

        using (client)
        {
            var messages = new List<object>
            {
                new { role = "user", content = userPrompt }
            };

            var body = new Dictionary<string, object>
            {
                ["anthropic_version"] = "bedrock-2023-05-31",
                ["max_tokens"] = maxTokens,
                ["temperature"] = temperature,
                ["messages"] = messages
            };

            if (!string.IsNullOrEmpty(systemPrompt))
                body["system"] = systemPrompt;

            var bodyJson = JsonSerializer.Serialize(body);
            var request = new InvokeModelRequest
            {
                ModelId = modelId,
                ContentType = "application/json",
                Accept = "application/json",
                Body = new MemoryStream(Encoding.UTF8.GetBytes(bodyJson))
            };

            var response = await client.InvokeModelAsync(request);
            using var responseStream = response.Body;
            using var reader = new StreamReader(responseStream);
            var responseJson = await reader.ReadToEndAsync();

            using var doc = JsonDocument.Parse(responseJson);
            if (doc.RootElement.TryGetProperty("content", out var contentArray)
                && contentArray.GetArrayLength() > 0
                && contentArray[0].TryGetProperty("text", out var textElement))
            {
                return textElement.GetString() ?? "";
            }

            return "";
        }
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

    // --- FinOps AI Insights ---

    public async Task<List<AIRecommendation>> GenerateFinOpsRecommendationsAsync(AzureFinOpsContext context)
    {
        try
        {
            var settings = await _aiSettingsService.GetOrCreateSettingsAsync();
            if (string.IsNullOrEmpty(settings.ApiKey))
                throw new Exception("AI API key is not configured. Please configure it in Settings.");

            var prompt = BuildFinOpsPrompt(context);
            return settings.Provider.ToLower() switch
            {
                "openai" => await GenerateOpenAIRecommendationsAsync(settings, prompt),
                "azureopenai" => await GenerateAzureOpenAIRecommendationsAsync(settings, prompt),
                "anthropic" => await GenerateAnthropicRecommendationsAsync(settings, prompt),
                "bedrock" => await GenerateBedrockRecommendationsAsync(settings, prompt),
                _ => throw new Exception($"Unsupported AI provider: {settings.Provider}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating FinOps AI recommendations");
            throw new Exception($"Failed to generate FinOps recommendations: {ex.Message}");
        }
    }

    public async Task<string> GenerateComplianceNarrativeAsync(List<Soc2Control> controls, double overallPercent)
    {
        try
        {
            var settings = await _aiSettingsService.GetOrCreateSettingsAsync();
            if (string.IsNullOrEmpty(settings.ApiKey))
                return $"SOC2 compliance assessment: {overallPercent:F1}% overall compliance across {controls.Count} controls.";

            var prompt = BuildComplianceNarrativePrompt(controls, overallPercent);
            var httpClient = _httpClientFactory.CreateClient();

            if (settings.Provider.ToLower() == "bedrock")
            {
                var text = await CallBedrockClaudeAsync(
                    systemPrompt: "You are a SOC2 compliance expert. Generate clear, professional executive summaries for compliance reports.",
                    userPrompt: prompt,
                    maxTokens: 800,
                    temperature: 0.4f);
                return string.IsNullOrWhiteSpace(text) ? $"SOC2 compliance: {overallPercent:F1}%" : text;
            }
            else if (settings.Provider.ToLower() == "openai" || settings.Provider.ToLower() == "azureopenai")
            {
                httpClient.DefaultRequestHeaders.Clear();
                if (settings.Provider.ToLower() == "azureopenai")
                    httpClient.DefaultRequestHeaders.Add("api-key", settings.ApiKey);
                else
                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {settings.ApiKey}");

                var requestBody = new
                {
                    model = settings.Provider.ToLower() == "azureopenai" ? (object?)null : settings.Model,
                    messages = new[]
                    {
                        new { role = "system", content = "You are a SOC2 compliance expert. Generate clear, professional executive summaries for compliance reports." },
                        new { role = "user", content = prompt }
                    },
                    max_tokens = 800,
                    temperature = 0.4
                };

                var endpoint = settings.Provider.ToLower() == "azureopenai"
                    ? (settings.Endpoint ?? throw new Exception("Azure OpenAI requires an endpoint URL"))
                    : (settings.Endpoint ?? "https://api.openai.com/v1/chat/completions");

                var response = await httpClient.PostAsync(endpoint,
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));

                if (!response.IsSuccessStatusCode) return $"SOC2 compliance: {overallPercent:F1}%";
                var responseContent = await response.Content.ReadAsStringAsync();
                var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent, _jsonOptions);
                return apiResponse?.Choices?.FirstOrDefault()?.Message.Content ?? $"SOC2 compliance: {overallPercent:F1}%";
            }
            else if (settings.Provider.ToLower() == "anthropic")
            {
                httpClient.DefaultRequestHeaders.Clear();
                httpClient.DefaultRequestHeaders.Add("x-api-key", settings.ApiKey);
                httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

                var requestBody = new
                {
                    model = settings.Model,
                    max_tokens = 800,
                    temperature = 0.4,
                    messages = new[] { new { role = "user", content = prompt } }
                };

                var response = await httpClient.PostAsync(
                    settings.Endpoint ?? "https://api.anthropic.com/v1/messages",
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));

                if (!response.IsSuccessStatusCode) return $"SOC2 compliance: {overallPercent:F1}%";
                var responseContent = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(responseContent);
                if (doc.RootElement.TryGetProperty("content", out var contentArr) && contentArr.GetArrayLength() > 0)
                    if (contentArr[0].TryGetProperty("text", out var textEl))
                        return textEl.GetString() ?? $"SOC2 compliance: {overallPercent:F1}%";
            }

            return $"SOC2 compliance: {overallPercent:F1}%";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating compliance narrative");
            return $"SOC2 compliance assessment: {overallPercent:F1}% overall score.";
        }
    }

    private string BuildFinOpsPrompt(AzureFinOpsContext context)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"You are a FinOps expert analyzing an Azure cloud environment. Provide specific, actionable recommendations based on this data:");
        sb.AppendLine($"- Total Resources: {context.ResourceCount}");
        sb.AppendLine($"- Monthly Spend: ${context.TotalCost:F2}");
        sb.AppendLine($"- Subscriptions: {context.SubscriptionCount}");
        sb.AppendLine($"- Wasted Resources Detected: {context.WastedResourceCount} (est. ${context.EstimatedWaste:F0}/mo waste)");
        sb.AppendLine($"- Azure Advisor Savings Opportunity: ${context.AdvisorSavingsOpportunity:F0}/mo");
        sb.AppendLine($"- Top Services by Cost: {string.Join(", ", context.TopServices.Take(8))}");
        sb.AppendLine($"- Resource Types: {string.Join(", ", context.ResourceTypes.Take(8))}");
        sb.AppendLine($"- Regions: {string.Join(", ", context.Locations.Take(6))}");
        sb.AppendLine($"- Insight Focus: {context.InsightType}");
        sb.AppendLine();

        var focusArea = context.InsightType switch
        {
            "WasteAnalysis" => "Focus on eliminating waste, orphaned resources, and idle workloads. Provide specific deletion/cleanup recommendations.",
            "Rightsizing" => "Focus on SKU rightsizing opportunities. Recommend specific tier downgrades with estimated savings.",
            "Forecast" => "Focus on cost trend analysis and budget recommendations. Identify spend patterns and upcoming cost risks.",
            "Anomaly" => "Focus on cost anomalies and unexpected spend. Identify root causes and preventive measures.",
            _ => "Provide a balanced FinOps assessment covering waste, rightsizing, cost allocation, and budget optimization."
        };

        sb.AppendLine(focusArea);
        sb.AppendLine();
        sb.AppendLine("Return ONLY this JSON structure:");
        sb.AppendLine(@"{""recommendations"":[{""category"":""Cost Optimization"",""title"":""Brief title"",""description"":""Detailed actionable steps"",""priority"":""High"",""potentialSavings"":""$X/month"",""effort"":""Low""}]}");
        sb.AppendLine("Categories: Cost Optimization, FinOps, Rightsizing, Waste Reduction, Budget, Tagging");

        return sb.ToString();
    }

    private string BuildComplianceNarrativePrompt(List<Soc2Control> controls, double overallPercent)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Generate a professional SOC2 compliance executive summary for auditor review based on the following assessment data:");
        sb.AppendLine($"- Overall Compliance Score: {overallPercent:F1}%");
        sb.AppendLine($"- Total Controls Evaluated: {controls.Count}");
        sb.AppendLine($"- Compliant: {controls.Count(c => c.Status == "Compliant")}");
        sb.AppendLine($"- Non-Compliant: {controls.Count(c => c.Status == "NonCompliant")}");
        sb.AppendLine($"- Partially Compliant: {controls.Count(c => c.Status == "PartiallyCompliant")}");
        sb.AppendLine();
        sb.AppendLine("Non-compliant or partial controls:");
        foreach (var ctrl in controls.Where(c => c.Status != "Compliant").Take(5))
            sb.AppendLine($"  - {ctrl.ControlId} ({ctrl.TscCategory}): {ctrl.Status} - {ctrl.CompliancePercent:F0}%");
        sb.AppendLine();
        sb.AppendLine("Write a 3-4 paragraph executive summary suitable for inclusion in a SOC2 readiness report. " +
                      "Include: overall posture assessment, key strengths, areas requiring remediation, and recommended next steps. " +
                      "Be professional, factual, and constructive. Do not use markdown formatting.");
        return sb.ToString();
    }

    public async Task<List<RemediationSuggestion>> GenerateRemediationSuggestionsAsync(ComplianceRemediationContext context)
    {
        try
        {
            var settings = await _aiSettingsService.GetOrCreateSettingsAsync();

            if (string.IsNullOrEmpty(settings.ApiKey))
            {
                throw new Exception("AI API key is not configured. Please configure it in Settings.");
            }

            var prompt = BuildRemediationPrompt(context);

            return settings.Provider.ToLower() switch
            {
                "openai" => await GenerateOpenAIRemediationSuggestionsAsync(settings, prompt),
                "azureopenai" => await GenerateAzureOpenAIRemediationSuggestionsAsync(settings, prompt),
                "anthropic" => await GenerateAnthropicRemediationSuggestionsAsync(settings, prompt),
                "bedrock" => await GenerateBedrockRemediationSuggestionsAsync(settings, prompt),
                _ => throw new Exception($"Unsupported AI provider: {settings.Provider}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating remediation suggestions");
            throw new Exception($"Failed to generate remediation suggestions: {ex.Message}");
        }
    }

    private async Task<List<RemediationSuggestion>> GenerateOpenAIRemediationSuggestionsAsync(AISettings settings, string prompt)
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
                    content = "You are an expert Azure security and compliance architect specializing in SOC2, ISO27001, and cloud security remediation. Provide detailed, actionable remediation steps with Azure CLI and PowerShell commands."
                },
                new
                {
                    role = "user",
                    content = prompt
                }
            },
            max_tokens = Math.Max(settings.MaxTokens, 4096),
            temperature = 0.3,
            response_format = new { type = "json_object" }
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        var endpoint = settings.Endpoint ?? "https://api.openai.com/v1/chat/completions";
        var response = await httpClient.PostAsync(endpoint, content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent, _jsonOptions);

        if (apiResponse?.Choices != null && apiResponse.Choices.Length > 0)
        {
            var messageContent = apiResponse.Choices[0].Message.Content;
            try
            {
                var suggestionsWrapper = JsonSerializer.Deserialize<RemediationSuggestionsWrapper>(messageContent, _jsonOptions);
                return suggestionsWrapper?.Suggestions ?? new List<RemediationSuggestion>();
            }
            catch (JsonException)
            {
                _logger.LogWarning("Remediation JSON was truncated; extracting partial suggestions.");
                return ParsePartialSuggestions(messageContent);
            }
        }

        return new List<RemediationSuggestion>();
    }

    private async Task<List<RemediationSuggestion>> GenerateAzureOpenAIRemediationSuggestionsAsync(AISettings settings, string prompt)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("api-key", settings.ApiKey);

        var requestBody = new
        {
            messages = new[]
            {
                new { role = "system", content = "You are an expert Azure security and compliance architect specializing in SOC2, ISO27001, and cloud security remediation. Provide detailed, actionable remediation steps with Azure CLI and PowerShell commands." },
                new { role = "user", content = prompt }
            },
            max_tokens = Math.Max(settings.MaxTokens, 4096),
            temperature = 0.3,
            response_format = new { type = "json_object" }
        };

        var endpoint = settings.Endpoint ?? throw new Exception("Azure OpenAI requires an endpoint URL. Please configure it in Settings.");
        var response = await httpClient.PostAsync(endpoint, new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<OpenAIResponse>(responseContent, _jsonOptions);

        if (apiResponse?.Choices != null && apiResponse.Choices.Length > 0)
        {
            var messageContent = apiResponse.Choices[0].Message.Content;
            try
            {
                var suggestionsWrapper = JsonSerializer.Deserialize<RemediationSuggestionsWrapper>(messageContent, _jsonOptions);
                return suggestionsWrapper?.Suggestions ?? new List<RemediationSuggestion>();
            }
            catch (JsonException)
            {
                return ParsePartialSuggestions(messageContent);
            }
        }

        return new List<RemediationSuggestion>();
    }

    private async Task<List<RemediationSuggestion>> GenerateAnthropicRemediationSuggestionsAsync(AISettings settings, string prompt)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Clear();
        httpClient.DefaultRequestHeaders.Add("x-api-key", settings.ApiKey);
        httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var requestBody = new
        {
            model = settings.Model,
            max_tokens = settings.MaxTokens,
            temperature = 0.3,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = $@"You are an expert Azure security and compliance architect. {prompt}
                    
Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  ""suggestions"": [
    {{
      ""issueType"": ""Network Security"",
      ""title"": ""Brief title"",
      ""description"": ""Detailed explanation"",
      ""rootCause"": ""Why this is happening"",
      ""remediationSteps"": [""Step 1"", ""Step 2""],
      ""automation"": ""Automated"",
      ""priority"": ""Critical"",
      ""effort"": ""Low"",
      ""timeEstimate"": ""15 minutes"",
      ""resourcesAffected"": [""Resource IDs or types""],
      ""azureCliCommands"": [""az command here""],
      ""powerShellCommands"": [""PowerShell command here""],
      ""complianceImpact"": ""Impact description"",
      ""references"": [""Documentation links""]
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
                try
                {
                    var suggestionsWrapper = JsonSerializer.Deserialize<RemediationSuggestionsWrapper>(text, _jsonOptions);
                    return suggestionsWrapper?.Suggestions ?? new List<RemediationSuggestion>();
                }
                catch (JsonException)
                {
                    _logger.LogWarning("Remediation JSON was truncated; extracting partial suggestions.");
                    return ParsePartialSuggestions(text);
                }
            }
        }

        return new List<RemediationSuggestion>();
    }

    private async Task<List<RemediationSuggestion>> GenerateBedrockRemediationSuggestionsAsync(AISettings settings, string prompt)
    {
        var userContent = $@"You are an expert Azure security and compliance architect. {prompt}

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  ""suggestions"": [
    {{
      ""issueType"": ""Network Security"",
      ""title"": ""Brief title"",
      ""description"": ""Detailed explanation"",
      ""rootCause"": ""Why this is happening"",
      ""remediationSteps"": [""Step 1"", ""Step 2""],
      ""automation"": ""Automated"",
      ""priority"": ""Critical"",
      ""effort"": ""Low"",
      ""timeEstimate"": ""15 minutes"",
      ""resourcesAffected"": [""Resource IDs or types""],
      ""azureCliCommands"": [""az command here""],
      ""powerShellCommands"": [""PowerShell command here""],
      ""complianceImpact"": ""Impact description"",
      ""references"": [""Documentation links""]
    }}
  ]
}}";

        var text = await CallBedrockClaudeAsync(
            userPrompt: userContent,
            maxTokens: Math.Max(settings.MaxTokens, 4096),
            temperature: 0.3f);

        try
        {
            var suggestionsWrapper = JsonSerializer.Deserialize<RemediationSuggestionsWrapper>(text, _jsonOptions);
            return suggestionsWrapper?.Suggestions ?? new List<RemediationSuggestion>();
        }
        catch (JsonException)
        {
            _logger.LogWarning("Bedrock remediation JSON was truncated; extracting partial suggestions.");
            return ParsePartialSuggestions(text);
        }
    }

    private string BuildRemediationPrompt(ComplianceRemediationContext context)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Analyze the following {context.ComplianceType} compliance issues and provide detailed remediation guidance:");
        sb.AppendLine();
        sb.AppendLine($"Summary:");
        sb.AppendLine($"- Total Issues: {context.TotalIssues}");
        sb.AppendLine($"- Critical: {context.CriticalIssues}");
        sb.AppendLine($"- High Priority: {context.HighIssues}");
        sb.AppendLine($"- Subscription ID: {context.SubscriptionId}");
        sb.AppendLine($"- Affected Resource Types: {string.Join(", ", context.ResourceTypes)}");
        sb.AppendLine();
        sb.AppendLine("Issues requiring remediation:");
        
        foreach (var issue in context.Issues.Take(5))
        {
            sb.AppendLine($"\n- Control: {issue.ControlId} - {issue.ControlName}");
            sb.AppendLine($"  Severity: {issue.Severity}");
            sb.AppendLine($"  Description: {issue.Description}");
            sb.AppendLine($"  Resource: {issue.ResourceType} ({issue.ResourceId})");
        }

        sb.AppendLine();
        sb.AppendLine("For each issue, provide:");
        sb.AppendLine("1. Root cause analysis");
        sb.AppendLine("2. Step-by-step remediation instructions");
        sb.AppendLine("3. Specific Azure CLI commands to fix the issue");
        sb.AppendLine("4. Equivalent PowerShell commands");
        sb.AppendLine("5. Whether automation is possible (Automated/SemiAutomated/Manual)");
        sb.AppendLine("6. Time estimate for remediation");
        sb.AppendLine("7. Compliance impact if not remediated");
        sb.AppendLine("8. Links to Microsoft documentation");
        sb.AppendLine();
        sb.AppendLine("Return ONLY this JSON structure:");
        sb.AppendLine(@"{
  ""suggestions"": [
    {
      ""issueType"": ""Network Security|Data Protection|Access Control|Encryption|Monitoring|etc"",
      ""title"": ""Brief actionable title"",
      ""description"": ""Comprehensive explanation of the issue and its security implications"",
      ""rootCause"": ""Technical explanation of why this issue exists"",
      ""remediationSteps"": [""Detailed step 1"", ""Detailed step 2"", ""...more steps""],
      ""automation"": ""Automated|SemiAutomated|Manual"",
      ""priority"": ""Critical|High|Medium|Low"",
      ""effort"": ""Low|Medium|High"",
      ""timeEstimate"": ""X minutes/hours"",
      ""resourcesAffected"": [""Resource IDs or types that need changes""],
      ""azureCliCommands"": [""az network nsg rule create --name..."", ""more commands""],
      ""powerShellCommands"": [""New-AzNetworkSecurityRuleConfig..."", ""more commands""],
      ""complianceImpact"": ""Description of SOC2/compliance impact"",
      ""references"": [""https://learn.microsoft.com/...""]
    }
  ]
}");

        return sb.ToString();
    }

    /// <summary>
    /// Extracts complete RemediationSuggestion objects from a potentially truncated JSON string.
    /// Used as a fallback when the LLM response is cut off by the token limit.
    /// </summary>
    private List<RemediationSuggestion> ParsePartialSuggestions(string json)
    {
        var result = new List<RemediationSuggestion>();
        try
        {
            var markerIdx = json.IndexOf("\"suggestions\"", StringComparison.OrdinalIgnoreCase);
            if (markerIdx < 0) return result;

            var arrayStart = json.IndexOf('[', markerIdx);
            if (arrayStart < 0) return result;

            int depth = 0;
            bool inString = false;
            bool escape = false;
            int objStart = -1;

            for (int i = arrayStart + 1; i < json.Length; i++)
            {
                char c = json[i];
                if (escape) { escape = false; continue; }
                if (c == '\\' && inString) { escape = true; continue; }
                if (c == '"') { inString = !inString; continue; }
                if (inString) continue;

                if (c == '{')
                {
                    if (depth == 0) objStart = i;
                    depth++;
                }
                else if (c == '}')
                {
                    depth--;
                    if (depth == 0 && objStart >= 0)
                    {
                        var objJson = json.Substring(objStart, i - objStart + 1);
                        try
                        {
                            var suggestion = JsonSerializer.Deserialize<RemediationSuggestion>(objJson, _jsonOptions);
                            if (suggestion != null) result.Add(suggestion);
                        }
                        catch { /* skip malformed object */ }
                        objStart = -1;
                    }
                }
                else if (c == ']' && depth == 0)
                {
                    break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse partial suggestions from truncated JSON.");
        }
        return result;
    }
}

// JSON response wrappers
class RemediationSuggestionsWrapper
{
    public List<RemediationSuggestion> Suggestions { get; set; } = new();
}

namespace AzureLens.API.Data.Entities;

public class AISettings
{
    public int Id { get; set; }
    public string Provider { get; set; } = "OpenAI"; // OpenAI, Anthropic, Bedrock
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gpt-4o";
    public string? Endpoint { get; set; } // For custom endpoints
    public int MaxTokens { get; set; } = 2000;
    public double Temperature { get; set; } = 0.7;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

namespace AzureLens.API.Models;

public class AISettingsDto
{
    public string Provider { get; set; } = "OpenAI";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gpt-4o";
    public string? Endpoint { get; set; }
    public int MaxTokens { get; set; } = 2000;
    public double Temperature { get; set; } = 0.7;
}

public class AISettingsResponse
{
    public string Provider { get; set; } = "OpenAI";
    public string Model { get; set; } = "gpt-4o";
    public string? Endpoint { get; set; }
    public int MaxTokens { get; set; } = 2000;
    public double Temperature { get; set; } = 0.7;
    public bool IsConfigured { get; set; }
}

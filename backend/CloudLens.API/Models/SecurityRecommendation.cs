namespace CloudLens.API.Models;

public class SecurityRecommendation
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? RemediationSteps { get; set; }
}

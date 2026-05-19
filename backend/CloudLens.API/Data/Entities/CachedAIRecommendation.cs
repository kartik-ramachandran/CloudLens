namespace CloudLens.API.Data.Entities;

public class CachedAIRecommendation
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public string? PotentialSavings { get; set; }
    public string Effort { get; set; } = "Medium";
    public string ContextHash { get; set; } = string.Empty; // Hash of the context used to generate
    public DateTime CachedAt { get; set; }
}

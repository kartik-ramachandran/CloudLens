namespace AzureLens.API.Models;

public class AIRecommendation
{
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium"; // High, Medium, Low
    public string? PotentialSavings { get; set; }
    public string Effort { get; set; } = "Medium"; // Low, Medium, High
}

public class AzureContext
{
    public int ResourceCount { get; set; }
    public double TotalCost { get; set; }
    public int SubscriptionCount { get; set; }
    public List<string> ResourceTypes { get; set; } = new();
    public List<string> Locations { get; set; } = new();
}

namespace AzureLens.API.Data.Entities;

public class CachedResourceCost
{
    public int Id { get; set; }
    public string ContextHash { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public string MonthlyCostsJson { get; set; } = "[]";
    public DateTime CachedAt { get; set; }
}

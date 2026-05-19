namespace CloudLens.API.Data.Entities;

/// <summary>
/// Cached cost data for AWS or GCP (provider-agnostic).
/// Provider column distinguishes between "aws" and "gcp".
/// </summary>
public class CachedCloudCost
{
    public int Id { get; set; }
    public string Provider { get; set; } = string.Empty;       // "aws" | "gcp"
    public string AccountId { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string CostsByServiceJson { get; set; } = "[]";     // JSON array of CloudCostByService
    public string MonthlyCostsJson { get; set; } = "[]";       // JSON array of CloudMonthlyCost
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}

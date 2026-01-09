namespace AzureLens.API.Data.Entities;

public class CachedCost
{
    public int Id { get; set; }
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string CostsByServiceJson { get; set; } = "[]";
    public DateTime CachedAt { get; set; }
}

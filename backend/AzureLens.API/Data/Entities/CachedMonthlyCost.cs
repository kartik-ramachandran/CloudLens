namespace AzureLens.API.Data.Entities;

public class CachedMonthlyCost
{
    public int Id { get; set; }
    public string ContextHash { get; set; } = string.Empty;
    public string Month { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime CachedAt { get; set; }
}

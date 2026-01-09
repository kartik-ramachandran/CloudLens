namespace AzureLens.API.Models;

public class CostData
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<CostByService>? CostsByService { get; set; }
    public List<MonthlyCost>? MonthlyCosts { get; set; }
}

public class CostByService
{
    public string ServiceName { get; set; } = string.Empty;
    public decimal Cost { get; set; }
}

public class MonthlyCost
{
    public string Month { get; set; } = string.Empty; // Format: "2025-10"
    public decimal Cost { get; set; }
    public string Currency { get; set; } = "USD";
}

public class ResourceCostData
{
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<MonthlyCost>? MonthlyCosts { get; set; }
}

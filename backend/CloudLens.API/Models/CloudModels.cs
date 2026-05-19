namespace CloudLens.API.Models;

// ── AWS ──────────────────────────────────────────────────────────────────────

public class AwsCredentials
{
    public string AccessKeyId { get; set; } = "";
    public string SecretAccessKey { get; set; } = "";
    public string Region { get; set; } = "us-east-1";
    public List<string>? AccountIds { get; set; }
}

// ── GCP ──────────────────────────────────────────────────────────────────────

public class GcpCredentials
{
    /// <summary>Full service account JSON key content (paste from downloaded JSON file).</summary>
    public string ServiceAccountJson { get; set; } = "";
    public List<string>? ProjectIds { get; set; }
}

// ── Shared cloud cost models ──────────────────────────────────────────────────

public class CloudCostSummary
{
    public string AccountId { get; set; } = "";
    public string AccountName { get; set; } = "";
    public decimal TotalCost { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<CloudCostByService> CostsByService { get; set; } = new();
    public List<CloudMonthlyCost> MonthlyCosts { get; set; } = new();
}

public class CloudCostByService
{
    public string ServiceName { get; set; } = "";
    public decimal Cost { get; set; }
}

public class CloudMonthlyCost
{
    public string Month { get; set; } = "";   // "YYYY-MM"
    public decimal Cost { get; set; }
    public string Currency { get; set; } = "USD";
}

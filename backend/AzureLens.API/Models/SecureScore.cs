namespace AzureLens.API.Models;

public class SecureScore
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public double CurrentScore { get; set; }
    public double MaxScore { get; set; }
    public double Percentage { get; set; }
    public int HealthyResourcesCount { get; set; }
    public int UnhealthyResourcesCount { get; set; }
    public int NotApplicableResourcesCount { get; set; }
    public List<SecureScoreControl> Controls { get; set; } = new();
    public DateTime? LastRefreshed { get; set; }
}

public class SecureScoreControl
{
    public string ControlName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public double CurrentScore { get; set; }
    public double MaxScore { get; set; }
    public double Percentage { get; set; }
    public int HealthyResourcesCount { get; set; }
    public int UnhealthyResourcesCount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string RemediationSteps { get; set; } = string.Empty;
}

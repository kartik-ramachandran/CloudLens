namespace AzureLens.API.Models;

public class AdvisorRecommendation
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Cost, Performance, Reliability, Security, OperationalExcellence
    public string Impact { get; set; } = string.Empty;   // High, Medium, Low
    public string ShortDescription { get; set; } = string.Empty;
    public string LongDescription { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public decimal? AnnualSavingsAmount { get; set; }
    public string? SavingsCurrency { get; set; }
    public string? RecommendedAction { get; set; }
    public string? CurrentSku { get; set; }
    public string? RecommendedSku { get; set; }
}

public class WastedResource
{
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public string WasteReason { get; set; } = string.Empty;   // Orphaned, Idle, Oversized, Unattached
    public decimal EstimatedMonthlyCost { get; set; }
    public string Currency { get; set; } = "USD";
    public string Recommendation { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";          // High, Medium, Low
}

public class TagComplianceReport
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public int TotalResources { get; set; }
    public int TaggedResources { get; set; }
    public int UntaggedResources { get; set; }
    public double TagCoveragePercent { get; set; }
    public List<string> RequiredTags { get; set; } = new();
    public List<TagViolation> Violations { get; set; } = new();
}

public class TagViolation
{
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public List<string> MissingTags { get; set; } = new();
}

public class BudgetData
{
    public string BudgetId { get; set; } = string.Empty;
    public string BudgetName { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public decimal BudgetAmount { get; set; }
    public decimal CurrentSpend { get; set; }
    public decimal ForecastedSpend { get; set; }
    public string Currency { get; set; } = "USD";
    public string TimePeriod { get; set; } = string.Empty;  // Monthly, Quarterly, Annually
    public double UtilizationPercent { get; set; }
    public List<BudgetAlert> Alerts { get; set; } = new();
}

public class BudgetAlert
{
    public string AlertType { get; set; } = string.Empty;    // Actual, Forecasted
    public double Threshold { get; set; }                    // percentage
    public string ContactEmails { get; set; } = string.Empty;
    public bool IsBreached { get; set; }
}

public class CostAnomaly
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public DateTime DetectedDate { get; set; }
    public decimal ExpectedCost { get; set; }
    public decimal ActualCost { get; set; }
    public decimal CostDelta { get; set; }
    public double PercentageIncrease { get; set; }
    public string Severity { get; set; } = "Medium";
    public string PossibleCause { get; set; } = string.Empty;
    public string Currency { get; set; } = "USD";
}

public class CostForecast
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public decimal CurrentMonthActual { get; set; }
    public decimal CurrentMonthForecast { get; set; }
    public decimal NextMonthForecast { get; set; }
    public decimal Next3MonthForecast { get; set; }
    public string Currency { get; set; } = "USD";
    public List<MonthlyForecastPoint> ForecastPoints { get; set; } = new();
    public double TrendPercentage { get; set; }   // MoM change %
    public string TrendDirection { get; set; } = "Stable"; // Increasing, Decreasing, Stable
}

public class MonthlyForecastPoint
{
    public string Month { get; set; } = string.Empty;   // "2025-10"
    public decimal Amount { get; set; }
    public bool IsActual { get; set; }
    public string Currency { get; set; } = "USD";
}

public class FinOpsMetrics
{
    public decimal TotalWaste { get; set; }
    public string Currency { get; set; } = "USD";
    public int WastedResourceCount { get; set; }
    public double TagCoveragePercent { get; set; }
    public decimal PotentialMonthlySavings { get; set; }
    public int AdvisorRecommendationCount { get; set; }
    public List<WastedResource> TopWastedResources { get; set; } = new();
    public List<AdvisorRecommendation> TopAdvisorRecommendations { get; set; } = new();
    public List<CostAnomaly> RecentAnomalies { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class FinOpsAIInsightRequest : SubscriptionRequest
{
    public string InsightType { get; set; } = "General"; // General, WasteAnalysis, Rightsizing, Forecast, Anomaly
}

public class RightsizingRecommendation
{
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public string CurrentSku { get; set; } = string.Empty;
    public string RecommendedSku { get; set; } = string.Empty;
    public decimal EstimatedMonthlySavings { get; set; }
    public string Currency { get; set; } = "USD";
    public string Justification { get; set; } = string.Empty;
    public string Impact { get; set; } = "Medium";
    public string MigrationSteps { get; set; } = string.Empty;
}

public class BulkTagRequest
{
    public List<string> ResourceIds { get; set; } = new();
    public Dictionary<string, string> Tags { get; set; } = new();
    public bool ReplaceExisting { get; set; } = false; // If true, replace all tags; if false, merge
}

public class BulkTagResult
{
    public int TotalResources { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<string> SuccessfulResources { get; set; } = new();
    public List<TagOperationFailure> Failures { get; set; } = new();
}

public class TagOperationFailure
{
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}

public class TagSuggestion
{
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public Dictionary<string, string> SuggestedTags { get; set; } = new();
    public string Reasoning { get; set; } = string.Empty;
    public double ConfidenceScore { get; set; } // 0-1
}

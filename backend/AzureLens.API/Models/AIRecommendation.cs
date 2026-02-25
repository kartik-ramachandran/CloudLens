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

public class RemediationSuggestion
{
    public string IssueType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RootCause { get; set; } = string.Empty;
    public List<string> RemediationSteps { get; set; } = new();
    public string Automation { get; set; } = "Manual"; // Automated, SemiAutomated, Manual
    public string Priority { get; set; } = "Medium"; // Critical, High, Medium, Low
    public string Effort { get; set; } = "Medium"; // Low, Medium, High
    public string TimeEstimate { get; set; } = string.Empty;
    public List<string> ResourcesAffected { get; set; } = new();
    public List<string> AzureCliCommands { get; set; } = new();
    public List<string> PowerShellCommands { get; set; } = new();
    public string ComplianceImpact { get; set; } = string.Empty;
    public List<string> References { get; set; } = new();
}

public class ComplianceRemediationContext
{
    public string ComplianceType { get; set; } = "SOC2"; // SOC1, SOC2, ISO27001, HIPAA, etc.
    public List<ComplianceIssue> Issues { get; set; } = new();
    public int TotalIssues { get; set; }
    public int CriticalIssues { get; set; }
    public int HighIssues { get; set; }
    public string SubscriptionId { get; set; } = string.Empty;
    public List<string> ResourceTypes { get; set; } = new();
}

public class ComplianceIssue
{
    public string ControlId { get; set; } = string.Empty;
    public string ControlName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
}

public class AzureContext
{
    public int ResourceCount { get; set; }
    public double TotalCost { get; set; }
    public int SubscriptionCount { get; set; }
    public List<string> ResourceTypes { get; set; } = new();
    public List<string> Locations { get; set; } = new();
}

public class AzureFinOpsContext
{
    public int ResourceCount { get; set; }
    public double TotalCost { get; set; }
    public int SubscriptionCount { get; set; }
    public List<string> ResourceTypes { get; set; } = new();
    public List<string> Locations { get; set; } = new();
    public int WastedResourceCount { get; set; }
    public double EstimatedWaste { get; set; }
    public double AdvisorSavingsOpportunity { get; set; }
    public List<string> TopServices { get; set; } = new();   // "ServiceName: $cost"
    public string InsightType { get; set; } = "General";     // General, WasteAnalysis, Rightsizing, Forecast, Anomaly
}

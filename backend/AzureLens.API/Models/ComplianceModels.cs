namespace AzureLens.API.Models;

public class Soc2Control
{
    public string ControlId { get; set; } = string.Empty;         // e.g. "CC6.1"
    public string TscCategory { get; set; } = string.Empty;       // e.g. "CC6 - Logical Access"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "NotEvaluated";          // Compliant, NonCompliant, PartiallyCompliant, NotEvaluated
    public string SubscriptionId { get; set; } = string.Empty;
    public int EvidenceCount { get; set; }
    public int PassedChecks { get; set; }
    public int FailedChecks { get; set; }
    public int TotalChecks { get; set; }
    public double CompliancePercent { get; set; }
    public string AiNarrative { get; set; } = string.Empty;
    public List<ComplianceEvidence> Evidence { get; set; } = new();
    public List<ControlGap> Gaps { get; set; } = new();
    public DateTime? LastEvaluated { get; set; }
}

public class ComplianceEvidence
{
    public string EvidenceId { get; set; } = Guid.NewGuid().ToString();
    public string ControlId { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string EvidenceType { get; set; } = string.Empty;      // PolicyCompliance, RbacAssignment, DiagnosticSettings, EncryptionStatus, NetworkRule, MfaStatus
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public bool IsPassing { get; set; }
    public string RawData { get; set; } = string.Empty;           // JSON serialized raw evidence
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}

public class ControlGap
{
    public string ControlId { get; set; } = string.Empty;
    public string GapDescription { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";              // High, Medium, Low
    public string RemediationSteps { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public DateTime? TargetDate { get; set; }
    public string Status { get; set; } = "Open";                  // Open, InProgress, Resolved
    public string ResourceId { get; set; } = string.Empty;
}

public class ComplianceReport
{
    public string ReportId { get; set; } = Guid.NewGuid().ToString();
    public string ReportType { get; set; } = "SOC2TypeI";         // SOC2TypeI, SOC2TypeII, GapAnalysis
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string OverallStatus { get; set; } = "NotEvaluated";
    public int TotalControls { get; set; }
    public int CompliantControls { get; set; }
    public int NonCompliantControls { get; set; }
    public int PartialControls { get; set; }
    public double OverallCompliancePercent { get; set; }
    public List<Soc2Control> Controls { get; set; } = new();
    public string ExecutiveSummary { get; set; } = string.Empty;  // AI-generated
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class PolicyComplianceState
{
    public string PolicyAssignmentId { get; set; } = string.Empty;
    public string PolicyAssignmentName { get; set; } = string.Empty;
    public string PolicyDefinitionId { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string ComplianceState { get; set; } = string.Empty;   // Compliant, NonCompliant, Exempt
    public string SubscriptionId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class RbacAssignment
{
    public string RoleDefinitionName { get; set; } = string.Empty;
    public string PrincipalId { get; set; } = string.Empty;
    public string PrincipalType { get; set; } = string.Empty;     // User, Group, ServicePrincipal
    public string Scope { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public bool IsPrivileged { get; set; }                        // Owner, Contributor, etc.
}

public class DiagnosticSettingStatus
{
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public bool LogsEnabled { get; set; }
    public bool MetricsEnabled { get; set; }
    public string? WorkspaceId { get; set; }
    public string? StorageAccountId { get; set; }
}

public class AuditLogEntry
{
    public string LogId { get; set; } = Guid.NewGuid().ToString();
    public string EventType { get; set; } = string.Empty;          // ResourceAccessed, SettingsChanged, ReportGenerated, ExportCreated
    public string Actor { get; set; } = string.Empty;              // sessionId or "system"
    public string SubscriptionId { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class Soc2ControlDefinition
{
    public string ControlId { get; set; } = string.Empty;
    public string TscCategory { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> AzureEvidenceTypes { get; set; } = new();
}

public class ComplianceCollectionRequest
{
    public string SessionId { get; set; } = string.Empty;
    public List<string> SubscriptionIds { get; set; } = new();
}

public class Soc2ReportRequest
{
    public string SessionId { get; set; } = string.Empty;
    public List<string> SubscriptionIds { get; set; } = new();
    public string ReportType { get; set; } = "SOC2TypeI";
    public bool IncludeAiNarratives { get; set; } = true;
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
}

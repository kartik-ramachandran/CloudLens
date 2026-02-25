using System.ComponentModel.DataAnnotations;

namespace AzureLens.API.Models;

// === Access Reviews ===
public class RbacAccessReview
{
    public string SubscriptionId { get; set; } = "";
    public string PrincipalId { get; set; } = "";
    public string PrincipalName { get; set; } = "";
    public string PrincipalType { get; set; } = "";
    public string RoleDefinitionName { get; set; } = "";
    public string Scope { get; set; } = "";
    public bool IsPrivileged { get; set; }
    public bool IsGuest { get; set; }
    public bool IsStale { get; set; }
    public string? LastActivityDate { get; set; }
}

public class AccessReviewSummary
{
    public int TotalAssignments { get; set; }
    public int OwnerCount { get; set; }
    public int ContributorCount { get; set; }
    public int ReaderCount { get; set; }
    public int PrivilegedCount { get; set; }
    public int GuestCount { get; set; }
    public int StaleCount { get; set; }
    public List<RbacAccessReview> Assignments { get; set; } = new();
    public List<RbacAccessReview> PrivilegedUsers { get; set; } = new();
    public List<RbacAccessReview> GuestUsers { get; set; } = new();
    public List<RbacAccessReview> StaleAccounts { get; set; } = new();
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// === Change Management ===
public class ActivityLogEvent
{
    public string EventId { get; set; } = "";
    public string OperationName { get; set; } = "";
    public string ResourceId { get; set; } = "";
    public string ResourceName { get; set; } = "";
    public string ResourceType { get; set; } = "";
    public string ResourceGroup { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string Caller { get; set; } = "";
    public string Status { get; set; } = "";
    public string EventTimestamp { get; set; } = "";
    public string Category { get; set; } = "";
    public string Description { get; set; } = "";
    public bool IsWrite { get; set; }
    public bool IsDelete { get; set; }
}

public class ChangeManagementReport
{
    public List<ActivityLogEvent> Events { get; set; } = new();
    public int TotalChanges { get; set; }
    public int WriteOperations { get; set; }
    public int DeleteOperations { get; set; }
    public List<string> TopActors { get; set; } = new();
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// === Remediation Tracker ===
public class RemediationItem
{
    [Key]
    public int Id { get; set; }
    public string ControlId { get; set; } = "";
    public string GapDescription { get; set; } = "";
    public string Severity { get; set; } = "Medium";
    public string Owner { get; set; } = "";
    public string TargetDate { get; set; } = "";
    public string Status { get; set; } = "Open";
    public string SubscriptionId { get; set; } = "";
    public string ResourceId { get; set; } = "";
    public string RemediationSteps { get; set; } = "";
    public string? JiraTicketKey { get; set; }
    public string? JiraTicketUrl { get; set; }
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("O");
    public string? UpdatedAt { get; set; }
    public string? ResolvedAt { get; set; }
    public string Notes { get; set; } = "";
}

public class RemediationItemDto
{
    public string ControlId { get; set; } = "";
    public string GapDescription { get; set; } = "";
    public string Severity { get; set; } = "Medium";
    public string Owner { get; set; } = "";
    public string TargetDate { get; set; } = "";
    public string Status { get; set; } = "Open";
    public string SubscriptionId { get; set; } = "";
    public string ResourceId { get; set; } = "";
    public string RemediationSteps { get; set; } = "";
    public string Notes { get; set; } = "";
}

// === Availability ===
public class ServiceHealthEvent
{
    public string EventId { get; set; } = "";
    public string Title { get; set; } = "";
    public string ServiceName { get; set; } = "";
    public string Region { get; set; } = "";
    public string Status { get; set; } = "";
    public string EventType { get; set; } = "";
    public string StartTime { get; set; } = "";
    public string? EndTime { get; set; }
    public string Summary { get; set; } = "";
    public string Level { get; set; } = "";
}

public class BackupStatusItem
{
    public string ResourceId { get; set; } = "";
    public string ResourceName { get; set; } = "";
    public string ResourceType { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string ResourceGroup { get; set; } = "";
    public bool HasBackup { get; set; }
    public string? LastBackupTime { get; set; }
    public string? VaultName { get; set; }
    public string BackupStatus { get; set; } = "Unknown";
}

public class AvailabilityReport
{
    public List<ServiceHealthEvent> ServiceHealthEvents { get; set; } = new();
    public List<BackupStatusItem> BackupStatuses { get; set; } = new();
    public int ResourcesWithBackup { get; set; }
    public int ResourcesWithoutBackup { get; set; }
    public int BackupCoveragePercent { get; set; }
    public int ActiveIncidents { get; set; }
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// === Vulnerability Management ===
public class VulnerabilityItem
{
    public string AssessmentId { get; set; } = "";
    public string ResourceId { get; set; } = "";
    public string ResourceName { get; set; } = "";
    public string ResourceType { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string ResourceGroup { get; set; } = "";
    public string CveId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Severity { get; set; } = "";
    public double CvssScore { get; set; }
    public string Status { get; set; } = "";
    public string RemediationDescription { get; set; } = "";
    public string DiscoveredAt { get; set; } = "";
    public string Category { get; set; } = "";
}

public class VulnerabilityReport
{
    public List<VulnerabilityItem> Vulnerabilities { get; set; } = new();
    public int Critical { get; set; }
    public int High { get; set; }
    public int Medium { get; set; }
    public int Low { get; set; }
    public int TotalUnremediated { get; set; }
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// === Network Security ===
public class NsgRuleRisk
{
    public string NsgId { get; set; } = "";
    public string NsgName { get; set; } = "";
    public string ResourceGroup { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string RuleName { get; set; } = "";
    public string Direction { get; set; } = "";
    public string SourceAddressPrefix { get; set; } = "";
    public string DestinationPortRange { get; set; } = "";
    public string Protocol { get; set; } = "";
    public string Access { get; set; } = "";
    public int Priority { get; set; }
    public string RiskLevel { get; set; } = "";
    public string RiskDescription { get; set; } = "";
}

public class PublicIpExposure
{
    public string ResourceId { get; set; } = "";
    public string ResourceName { get; set; } = "";
    public string IpAddress { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string ResourceGroup { get; set; } = "";
    public string AssociatedTo { get; set; } = "";
    public bool IsAttached { get; set; }
    public string AllocationMethod { get; set; } = "";
}

public class NetworkSecurityReport
{
    public List<NsgRuleRisk> RiskyNsgRules { get; set; } = new();
    public List<PublicIpExposure> PublicIps { get; set; } = new();
    public int CriticalRules { get; set; }
    public int HighRiskRules { get; set; }
    public int UnattachedPublicIps { get; set; }
    public int InternetExposedPorts { get; set; }
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// === SOC2 Readiness ===
public class ReadinessCheckItem
{
    public string CheckId { get; set; } = "";
    public string Category { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "NotChecked";
    public int Weight { get; set; } = 1;
    public string Recommendation { get; set; } = "";
    public string AzureService { get; set; } = "";
    public string ControlReference { get; set; } = "";
}

public class Soc2ReadinessReport
{
    public List<ReadinessCheckItem> Checks { get; set; } = new();
    public double ReadinessScore { get; set; }
    public int TotalChecks { get; set; }
    public int PassedChecks { get; set; }
    public int FailedChecks { get; set; }
    public int PartialChecks { get; set; }
    public string ReadinessLevel { get; set; } = "";
    public List<string> CriticalGaps { get; set; } = new();
    public List<string> QuickWins { get; set; } = new();
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// === SOC2 Type II - Evidence Snapshot ===
public class ComplianceSnapshot
{
    [Key]
    public int Id { get; set; }
    public string SubscriptionId { get; set; } = "";
    public string ControlId { get; set; } = "";
    public string Status { get; set; } = "";
    public double CompliancePercent { get; set; }
    public int PassedChecks { get; set; }
    public int FailedChecks { get; set; }
    public string SnapshotDate { get; set; } = DateTime.UtcNow.ToString("O");
    public string EvidenceSummaryJson { get; set; } = "{}";
}

public class ComplianceTrendPoint
{
    public string Date { get; set; } = "";
    public double CompliancePercent { get; set; }
    public int PassedControls { get; set; }
    public int TotalControls { get; set; }
}

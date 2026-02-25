using System.ComponentModel.DataAnnotations;

namespace AzureLens.API.Models;

public enum SocTier
{
    SOC1, // Auto-remediation
    SOC2, // Manual/Assisted remediation
    SOC3  // Critical escalation
}

public enum IncidentStatus
{
    New,
    InProgress,
    Remediated,
    Escalated,
    Failed,
    Closed
}

public enum IncidentSeverity
{
    Low,
    Medium,
    High,
    Critical
}

public enum RemediationStatus
{
    Pending,
    InProgress,
    Success,
    Failed,
    Skipped
}

public class SocIncident
{
    [Key]
    public int Id { get; set; }
    
    public string IncidentId { get; set; } = Guid.NewGuid().ToString();
    
    public string Title { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public IncidentSeverity Severity { get; set; }
    
    public IncidentStatus Status { get; set; }
    
    public SocTier CurrentTier { get; set; } = SocTier.SOC1;
    
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? ResolvedAt { get; set; }
    
    public string SubscriptionId { get; set; } = string.Empty;
    
    public string ResourceId { get; set; } = string.Empty;
    
    public string ResourceType { get; set; } = string.Empty;
    
    public string SourceAlert { get; set; } = string.Empty; // Azure Security Center alert ID
    
    public string? AssignedTo { get; set; }
    
    public string? JiraTicketKey { get; set; }
    
    public int EscalationCount { get; set; } = 0;
    
    public DateTime? LastEscalatedAt { get; set; }
    
    public string Notes { get; set; } = string.Empty;
}

public class RemediationAttempt
{
    [Key]
    public int Id { get; set; }
    
    public int IncidentId { get; set; }
    
    public SocTier Tier { get; set; }
    
    public string RemediationType { get; set; } = string.Empty; // e.g., "DisablePublicAccess", "RotateKey", "EnableTLS"
    
    public RemediationStatus Status { get; set; }
    
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? CompletedAt { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    public string ActionsTaken { get; set; } = string.Empty; // JSON array of actions
    
    public bool IsAutomated { get; set; } = true;
    
    public string? PerformedBy { get; set; }
}

public class SocIncidentDto
{
    public int Id { get; set; }
    public string IncidentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CurrentTier { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string SubscriptionId { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? JiraTicketKey { get; set; }
    public int EscalationCount { get; set; }
    public DateTime? LastEscalatedAt { get; set; }
    public List<RemediationAttemptDto> Attempts { get; set; } = new();
}

public class RemediationAttemptDto
{
    public int Id { get; set; }
    public string Tier { get; set; } = string.Empty;
    public string RemediationType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime AttemptedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public bool IsAutomated { get; set; }
    public string? PerformedBy { get; set; }
}

public class CreateIncidentRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";
    public string SubscriptionId { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? SourceAlert { get; set; }
}

public class EscalateIncidentRequest
{
    public int IncidentId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
}

public class SocDashboardStats
{
    public int TotalIncidents { get; set; }
    public int ActiveIncidents { get; set; }
    public int Soc1Incidents { get; set; }
    public int Soc2Incidents { get; set; }
    public int Soc3Incidents { get; set; }
    public int AutoRemediatedToday { get; set; }
    public int EscalatedToday { get; set; }
    public double AvgResolutionTimeHours { get; set; }
    public double AutoRemediationSuccessRate { get; set; } // Percentage
    public List<SocIncidentDto> RecentIncidents { get; set; } = new();
    public List<TopRemediationType> TopRemediationTypes { get; set; } = new();
}

public class TopRemediationType
{
    public string Type { get; set; } = string.Empty;
    public int Count { get; set; }
    public int SuccessCount { get; set; }
}

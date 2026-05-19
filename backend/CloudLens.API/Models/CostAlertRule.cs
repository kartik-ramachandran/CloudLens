namespace CloudLens.API.Models;

public class CostAlertRule
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    // Alert Type: "DailyCost", "MonthlyCost", "ResourceCost", "ServiceCost"
    public string AlertType { get; set; } = "DailyCost";
    
    // Threshold settings
    public decimal ThresholdAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public string ThresholdOperator { get; set; } = "GreaterThan"; // GreaterThan, LessThan, Equal
    
    // Scope filters (all optional - null means all)
    public string? SubscriptionId { get; set; }
    public string? ResourceType { get; set; }
    public string? ResourceGroup { get; set; }
    public string? ServiceName { get; set; }
    
    // Schedule settings
    public string CheckFrequency { get; set; } = "Daily"; // Hourly, Daily, Weekly
    public bool IsEnabled { get; set; } = true;
    
    // Notification settings
    public string NotificationEmail { get; set; } = string.Empty;
    public bool SendJiraTicket { get; set; } = false;
    
    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastCheckedAt { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
    public int TriggerCount { get; set; } = 0;
    
    // Audit
    public string CreatedBy { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
}

public class CostAlertHistory
{
    public int Id { get; set; }
    public int AlertRuleId { get; set; }
    public string AlertRuleName { get; set; } = string.Empty;
    
    // Alert details
    public decimal ActualAmount { get; set; }
    public decimal ThresholdAmount { get; set; }
    public string Currency { get; set; } = "USD";
    
    // Context
    public string SubscriptionId { get; set; } = string.Empty;
    public string? ResourceType { get; set; }
    public string? ResourceGroup { get; set; }
    public string? ServiceName { get; set; }
    
    // Status
    public string Status { get; set; } = "Triggered"; // Triggered, Resolved, Acknowledged
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
    
    // Notification
    public bool EmailSent { get; set; } = false;
    public bool JiraTicketCreated { get; set; } = false;
    public string? JiraTicketKey { get; set; }
    
    // Details
    public string Details { get; set; } = string.Empty;
    
    // Navigation property
    public CostAlertRule? AlertRule { get; set; }
}

public class CostAlertRuleDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string AlertType { get; set; } = "DailyCost";
    public decimal ThresholdAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public string ThresholdOperator { get; set; } = "GreaterThan";
    public string? SubscriptionId { get; set; }
    public string? ResourceType { get; set; }
    public string? ResourceGroup { get; set; }
    public string? ServiceName { get; set; }
    public string CheckFrequency { get; set; } = "Daily";
    public bool IsEnabled { get; set; } = true;
    public string NotificationEmail { get; set; } = string.Empty;
    public bool SendJiraTicket { get; set; } = false;
    public string SessionId { get; set; } = string.Empty;
}

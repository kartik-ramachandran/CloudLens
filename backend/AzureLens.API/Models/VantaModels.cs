using System.ComponentModel.DataAnnotations;

namespace AzureLens.API.Models;

public class VantaSettings
{
    [Key]
    public int Id { get; set; }
    public string ApiToken { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public bool AutoSyncEnabled { get; set; }
    public int SyncIntervalMinutes { get; set; } = 360;          // 6 hours default
    public bool SyncResources { get; set; } = true;
    public bool SyncCompliance { get; set; } = true;
    public bool SyncFinOps { get; set; } = false;
    public DateTime? LastModified { get; set; }
}

public class VantaSyncLog
{
    [Key]
    public int Id { get; set; }
    public string SyncType { get; set; } = string.Empty;          // Full, Resources, Evidence, Tests
    public string Status { get; set; } = string.Empty;            // Running, Completed, Failed
    public int ResourcesSynced { get; set; }
    public int EvidenceItemsSynced { get; set; }
    public int TestResultsSynced { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}

public class VantaSyncStatus
{
    public DateTime? LastResourceSync { get; set; }
    public DateTime? LastEvidenceSync { get; set; }
    public DateTime? LastTestSync { get; set; }
    public int ResourcesSyncedLastRun { get; set; }
    public int EvidenceItemsSyncedLastRun { get; set; }
    public int TestResultsSyncedLastRun { get; set; }
    public string LastSyncStatus { get; set; } = "Never";
    public string? LastErrorMessage { get; set; }
    public bool IsSyncing { get; set; }
}

// Vanta API payload types
public class VantaResourcePayload
{
    public string ExternalId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;      // e.g. "AZURE_VIRTUAL_MACHINE"
    public string AdditionalInfo { get; set; } = string.Empty;
    public Dictionary<string, string> Metadata { get; set; } = new();
}

public class VantaEvidencePayload
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EvidenceType { get; set; } = string.Empty;      // e.g. "SCREENSHOT", "DOCUMENT", "CUSTOM"
    public string ControlId { get; set; } = string.Empty;
    public string SourceSystem { get; set; } = "AzureLens";
    public string RawData { get; set; } = string.Empty;
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}

public class VantaTestResultPayload
{
    public string TestId { get; set; } = string.Empty;
    public string ExternalId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;            // PASS, FAIL, NOT_APPLICABLE
    public string Message { get; set; } = string.Empty;
    public DateTime TestedAt { get; set; } = DateTime.UtcNow;
}

public class VantaSyncRequest
{
    public string SessionId { get; set; } = string.Empty;
    public List<string> SubscriptionIds { get; set; } = new();
    public string SyncType { get; set; } = "Full";                // Full, Resources, Evidence, Tests
}

public class VantaSettingsDto
{
    public string ApiToken { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public bool AutoSyncEnabled { get; set; }
    public int SyncIntervalMinutes { get; set; } = 360;
    public bool SyncResources { get; set; } = true;
    public bool SyncCompliance { get; set; } = true;
    public bool SyncFinOps { get; set; } = false;
}

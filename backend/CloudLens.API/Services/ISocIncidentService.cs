using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface ISocIncidentService
{
    /// <summary>
    /// Get all incidents with optional filtering
    /// </summary>
    Task<List<SocIncidentDto>> GetIncidentsAsync(string? tier = null, string? status = null, string? subscriptionId = null);
    
    /// <summary>
    /// Get a specific incident by ID
    /// </summary>
    Task<SocIncidentDto?> GetIncidentByIdAsync(int id);
    
    /// <summary>
    /// Create a new incident (starts at SOC1)
    /// </summary>
    Task<SocIncidentDto> CreateIncidentAsync(CreateIncidentRequest request);
    
    /// <summary>
    /// Escalate an incident to the next tier
    /// </summary>
    Task<SocIncidentDto> EscalateIncidentAsync(int incidentId, string reason, string? assignedTo = null);
    
    /// <summary>
    /// Close an incident
    /// </summary>
    Task<SocIncidentDto> CloseIncidentAsync(int incidentId, string resolution);
    
    /// <summary>
    /// Get dashboard statistics
    /// </summary>
    Task<SocDashboardStats> GetDashboardStatsAsync(string? subscriptionId = null);
    
    /// <summary>
    /// Process incident through SOC1 auto-remediation
    /// </summary>
    Task<RemediationAttemptDto> ProcessSoc1RemediationAsync(int incidentId, AzureCredentials credentials);
    
    /// <summary>
    /// Manually record a remediation attempt (SOC2/SOC3)
    /// </summary>
    Task<RemediationAttemptDto> RecordManualRemediationAsync(int incidentId, string remediationType, string actionsTaken, bool success);
}

using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IAutoRemediationService
{
    /// <summary>
    /// Attempts automated remediation for a SOC incident
    /// </summary>
    Task<RemediationAttempt> AttemptRemediationAsync(SocIncident incident, AzureCredentials credentials);
    
    /// <summary>
    /// Get available remediation actions for a resource type
    /// </summary>
    List<string> GetAvailableRemediations(string resourceType);
    
    /// <summary>
    /// Check if a resource type supports auto-remediation
    /// </summary>
    bool SupportsAutoRemediation(string resourceType);
}

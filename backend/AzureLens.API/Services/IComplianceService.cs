using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IComplianceService
{
    Task<ComplianceReport> GenerateSoc2ReportAsync(AzureCredentials credentials, Soc2ReportRequest request);
    Task<List<Soc2Control>> GetSoc2ControlsAsync(AzureCredentials credentials, List<string> subscriptionIds);
    Task<List<ComplianceEvidence>> CollectEvidenceAsync(AzureCredentials credentials, List<string> subscriptionIds);
    Task<List<ControlGap>> GetGapAnalysisAsync(AzureCredentials credentials, List<string> subscriptionIds);
    Task<List<AuditLogEntry>> GetAuditLogAsync(int pageSize = 100, int page = 1);
    Task LogAuditEventAsync(AuditLogEntry entry);
    List<Soc2ControlDefinition> GetControlDefinitions();
    Task<Soc2ReadinessReport> GetSoc2ReadinessAssessmentAsync(AzureCredentials credentials, List<string> subscriptionIds);
}

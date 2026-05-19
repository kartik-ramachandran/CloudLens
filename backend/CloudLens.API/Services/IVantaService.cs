using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IVantaService
{
    Task<VantaSettings?> GetSettingsAsync();
    Task<VantaSettings> SaveSettingsAsync(VantaSettingsDto dto);
    Task<bool> TestConnectionAsync();
    Task<VantaSyncLog> SyncAsync(AzureCredentials credentials, string syncType = "Full");
    Task<VantaSyncLog> SyncResourcesAsync(AzureCredentials credentials);
    Task<VantaSyncLog> SyncEvidenceAsync(AzureCredentials credentials, List<ComplianceEvidence> evidence);
    Task<VantaSyncLog> SyncTestResultsAsync(AzureCredentials credentials, List<SecurityRecommendation> recommendations);
    Task<VantaSyncStatus> GetSyncStatusAsync();
}

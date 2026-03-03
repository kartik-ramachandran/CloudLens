using System.Text;
using System.Text.Json;
using AzureLens.API.Data;
using AzureLens.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AzureLens.API.Services;

public class VantaService : IVantaService
{
    private readonly AppDbContext _context;
    private readonly IAzureService _azureService;
    private readonly ICacheService _cacheService;
    private readonly IComplianceService _complianceService;
    private readonly ILogger<VantaService> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private const string VantaApiBase = "https://api.vanta.com/v1";

    public VantaService(
        AppDbContext context,
        IAzureService azureService,
        ICacheService cacheService,
        IComplianceService complianceService,
        ILogger<VantaService> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _azureService = azureService;
        _cacheService = cacheService;
        _complianceService = complianceService;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
    }

    private async Task<bool> TriggerFunctionsRefreshAsync()
    {
        try
        {
            var functionsUrl = _configuration["AzureFunctions:BaseUrl"];
            if (string.IsNullOrEmpty(functionsUrl))
            {
                _logger.LogWarning("Azure Functions URL not configured");
                return false;
            }

            _logger.LogInformation("Triggering Azure Functions cache refresh from VantaService...");
            var response = await _httpClient.PostAsync($"{functionsUrl}/api/TriggerRefresh", null);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Azure Functions refresh triggered successfully");
                await Task.Delay(5000);
                return true;
            }
            
            _logger.LogWarning("Failed to trigger Azure Functions refresh: {StatusCode}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering Azure Functions refresh");
            return false;
        }
    }

    public async Task<VantaSettings?> GetSettingsAsync()
    {
        try
        {
            return await _context.VantaSettings.FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Vanta settings");
            return null;
        }
    }

    public async Task<VantaSettings> SaveSettingsAsync(VantaSettingsDto dto)
    {
        try
        {
            var existing = await _context.VantaSettings.FirstOrDefaultAsync();
            if (existing != null)
            {
                existing.ApiToken = dto.ApiToken;
                existing.OrganizationId = dto.OrganizationId;
                existing.IsEnabled = dto.IsEnabled;
                existing.AutoSyncEnabled = dto.AutoSyncEnabled;
                existing.SyncIntervalMinutes = dto.SyncIntervalMinutes;
                existing.SyncResources = dto.SyncResources;
                existing.SyncCompliance = dto.SyncCompliance;
                existing.SyncFinOps = dto.SyncFinOps;
                existing.LastModified = DateTime.UtcNow;
                _context.VantaSettings.Update(existing);
            }
            else
            {
                existing = new VantaSettings
                {
                    ApiToken = dto.ApiToken,
                    OrganizationId = dto.OrganizationId,
                    IsEnabled = dto.IsEnabled,
                    AutoSyncEnabled = dto.AutoSyncEnabled,
                    SyncIntervalMinutes = dto.SyncIntervalMinutes,
                    SyncResources = dto.SyncResources,
                    SyncCompliance = dto.SyncCompliance,
                    SyncFinOps = dto.SyncFinOps,
                    LastModified = DateTime.UtcNow
                };
                _context.VantaSettings.Add(existing);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Vanta settings saved");
            return existing;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving Vanta settings");
            throw;
        }
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            var settings = await GetSettingsAsync();
            if (settings == null || string.IsNullOrEmpty(settings.ApiToken))
                return false;

            var request = new HttpRequestMessage(HttpMethod.Get, $"{VantaApiBase}/organization");
            request.Headers.Add("Authorization", $"Bearer {settings.ApiToken}");
            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing Vanta connection");
            return false;
        }
    }

    public async Task<VantaSyncLog> SyncAsync(AzureCredentials credentials, string syncType = "Full")
    {
        var log = new VantaSyncLog { SyncType = syncType, Status = "Running", StartedAt = DateTime.UtcNow };
        _context.VantaSyncLogs.Add(log);
        await _context.SaveChangesAsync();

        try
        {
            var settings = await GetSettingsAsync();
            if (settings == null || !settings.IsEnabled)
            {
                log.Status = "Failed";
                log.ErrorMessage = "Vanta is not enabled or configured.";
                log.CompletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return log;
            }

            if (settings.SyncResources)
            {
                var resourceLog = await SyncResourcesAsync(credentials);
                log.ResourcesSynced = resourceLog.ResourcesSynced;
            }

            if (settings.SyncCompliance)
            {
                var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
                var evidence = await _complianceService.CollectEvidenceAsync(credentials, subscriptionIds);
                var evidenceLog = await SyncEvidenceAsync(credentials, evidence);
                log.EvidenceItemsSynced = evidenceLog.EvidenceItemsSynced;
            }

            // TODO: SecurityRecommendations need their own cache table - AIRecommendations are different
            // For now, use empty list and trigger Functions refresh
            _logger.LogWarning("Security recommendations cache not available for Vanta. Need separate cache table.");
            await TriggerFunctionsRefreshAsync();
            
            var recommendations = new List<SecurityRecommendation>();
            var testLog = await SyncTestResultsAsync(credentials, recommendations);
            log.TestResultsSynced = testLog.TestResultsSynced;

            log.Status = "Completed";
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Vanta full sync");
            log.Status = "Failed";
            log.ErrorMessage = ex.Message;
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return log;
    }

    public async Task<VantaSyncLog> SyncResourcesAsync(AzureCredentials credentials)
    {
        var log = new VantaSyncLog { SyncType = "Resources", Status = "Running", StartedAt = DateTime.UtcNow };
        _context.VantaSyncLogs.Add(log);
        await _context.SaveChangesAsync();

        try
        {
            var settings = await GetSettingsAsync();
            if (settings == null || string.IsNullOrEmpty(settings.ApiToken))
                throw new Exception("Vanta not configured");

            // Only read from PostgreSQL - if empty, trigger Functions
            var resources = await _cacheService.GetCachedResourcesAsync(credentials.SubscriptionIds ?? new List<string>());
            if (resources == null || !resources.Any())
            {
                _logger.LogWarning("No cached resources for Vanta sync, triggering refresh...");
                await TriggerFunctionsRefreshAsync();
                resources = await _cacheService.GetCachedResourcesAsync(credentials.SubscriptionIds ?? new List<string>());
            }
            
            if (resources == null || !resources.Any())
            {
                _logger.LogWarning("No resources found after triggering refresh");
                throw new Exception("No resources available for Vanta sync");
            }
            
            var payloads = resources.Select(r => MapResourceToVanta(r)).ToList();

            var synced = 0;
            foreach (var batch in payloads.Chunk(50))
            {
                var success = await PushToVantaAsync(settings.ApiToken, "resources/batch", batch);
                if (success) synced += batch.Length;
            }

            log.ResourcesSynced = synced;
            log.Status = "Completed";
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation($"Vanta resource sync: {synced} resources pushed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing resources to Vanta");
            log.Status = "Failed";
            log.ErrorMessage = ex.Message;
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return log;
    }

    public async Task<VantaSyncLog> SyncEvidenceAsync(AzureCredentials credentials, List<ComplianceEvidence> evidence)
    {
        var log = new VantaSyncLog { SyncType = "Evidence", Status = "Running", StartedAt = DateTime.UtcNow };
        _context.VantaSyncLogs.Add(log);
        await _context.SaveChangesAsync();

        try
        {
            var settings = await GetSettingsAsync();
            if (settings == null || string.IsNullOrEmpty(settings.ApiToken))
                throw new Exception("Vanta not configured");

            var payloads = evidence.Select(e => MapEvidenceToVanta(e)).ToList();
            var synced = 0;

            foreach (var batch in payloads.Chunk(20))
            {
                var success = await PushToVantaAsync(settings.ApiToken, "evidences/batch", batch);
                if (success) synced += batch.Length;
            }

            log.EvidenceItemsSynced = synced;
            log.Status = "Completed";
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation($"Vanta evidence sync: {synced} items pushed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing evidence to Vanta");
            log.Status = "Failed";
            log.ErrorMessage = ex.Message;
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return log;
    }

    public async Task<VantaSyncLog> SyncTestResultsAsync(AzureCredentials credentials, List<SecurityRecommendation> recommendations)
    {
        var log = new VantaSyncLog { SyncType = "Tests", Status = "Running", StartedAt = DateTime.UtcNow };
        _context.VantaSyncLogs.Add(log);
        await _context.SaveChangesAsync();

        try
        {
            var settings = await GetSettingsAsync();
            if (settings == null || string.IsNullOrEmpty(settings.ApiToken))
                throw new Exception("Vanta not configured");

            var payloads = recommendations.Select(r => MapRecommendationToVantaTest(r)).ToList();
            var synced = 0;

            foreach (var batch in payloads.Chunk(50))
            {
                var success = await PushToVantaAsync(settings.ApiToken, "testResults/batch", batch);
                if (success) synced += batch.Length;
            }

            log.TestResultsSynced = synced;
            log.Status = "Completed";
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing test results to Vanta");
            log.Status = "Failed";
            log.ErrorMessage = ex.Message;
            log.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return log;
    }

    public async Task<VantaSyncStatus> GetSyncStatusAsync()
    {
        try
        {
            var logs = await _context.VantaSyncLogs
                .OrderByDescending(l => l.StartedAt)
                .Take(20)
                .ToListAsync();

            var lastResource = logs.FirstOrDefault(l => l.SyncType is "Resources" or "Full" && l.Status == "Completed");
            var lastEvidence = logs.FirstOrDefault(l => l.SyncType is "Evidence" or "Full" && l.Status == "Completed");
            var lastTest = logs.FirstOrDefault(l => l.SyncType is "Tests" or "Full" && l.Status == "Completed");
            var lastSync = logs.FirstOrDefault();

            return new VantaSyncStatus
            {
                LastResourceSync = lastResource?.CompletedAt,
                LastEvidenceSync = lastEvidence?.CompletedAt,
                LastTestSync = lastTest?.CompletedAt,
                ResourcesSyncedLastRun = lastResource?.ResourcesSynced ?? 0,
                EvidenceItemsSyncedLastRun = lastEvidence?.EvidenceItemsSynced ?? 0,
                TestResultsSyncedLastRun = lastTest?.TestResultsSynced ?? 0,
                LastSyncStatus = lastSync?.Status ?? "Never",
                LastErrorMessage = lastSync?.ErrorMessage,
                IsSyncing = logs.Any(l => l.Status == "Running")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Vanta sync status");
            return new VantaSyncStatus { LastSyncStatus = "Error" };
        }
    }

    // --- Private helpers ---

    private VantaResourcePayload MapResourceToVanta(AzureResource resource) => new()
    {
        ExternalId = resource.Id,
        DisplayName = resource.Name,
        ResourceType = MapResourceTypeToVanta(resource.Type),
        AdditionalInfo = $"Region: {resource.Location}, ResourceGroup: {resource.ResourceGroup}",
        Metadata = new Dictionary<string, string>
        {
            ["subscriptionId"] = resource.SubscriptionId,
            ["resourceGroup"] = resource.ResourceGroup,
            ["location"] = resource.Location,
            ["type"] = resource.Type
        }
    };

    private VantaEvidencePayload MapEvidenceToVanta(ComplianceEvidence evidence) => new()
    {
        Title = evidence.Title,
        Description = evidence.Summary,
        EvidenceType = "CUSTOM",
        ControlId = evidence.ControlId,
        SourceSystem = "AzureLens",
        RawData = evidence.RawData,
        CollectedAt = evidence.CollectedAt
    };

    private VantaTestResultPayload MapRecommendationToVantaTest(SecurityRecommendation recommendation) => new()
    {
        TestId = $"azure-defender-{recommendation.Name}",
        ExternalId = recommendation.Id,
        Status = recommendation.Status?.ToLower() switch
        {
            "healthy" => "PASS",
            "notapplicable" => "NOT_APPLICABLE",
            _ => "FAIL"
        },
        Message = recommendation.Description,
        TestedAt = DateTime.UtcNow
    };

    private string MapResourceTypeToVanta(string azureType)
    {
        return azureType.ToLower() switch
        {
            var t when t.Contains("virtualmachine") => "VIRTUAL_MACHINE",
            var t when t.Contains("storageaccount") => "STORAGE_ACCOUNT",
            var t when t.Contains("keyvault") => "KEY_MANAGEMENT_SERVICE",
            var t when t.Contains("sql") => "DATABASE",
            var t when t.Contains("webapp") => "WEB_APPLICATION",
            var t when t.Contains("kubernetes") => "CONTAINER_CLUSTER",
            var t when t.Contains("network") => "NETWORK_RESOURCE",
            _ => "CLOUD_RESOURCE"
        };
    }

    private async Task<bool> PushToVantaAsync(string apiToken, string endpoint, object payload)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{VantaApiBase}/{endpoint}");
            request.Headers.Add("Authorization", $"Bearer {apiToken}");
            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning($"Vanta API returned {response.StatusCode}: {error}");
            }

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, $"Failed to push to Vanta endpoint {endpoint}");
            return false;
        }
    }
}

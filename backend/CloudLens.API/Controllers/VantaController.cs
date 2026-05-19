using Microsoft.AspNetCore.Mvc;
using CloudLens.API.Models;
using CloudLens.API.Services;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VantaController : ControllerBase
{
    private readonly IVantaService _vantaService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly ILogger<VantaController> _logger;

    public VantaController(
        IVantaService vantaService,
        ICredentialCacheService credentialCache,
        ILogger<VantaController> logger)
    {
        _vantaService = vantaService;
        _credentialCache = credentialCache;
        _logger = logger;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        try
        {
            var settings = await _vantaService.GetSettingsAsync();
            if (settings == null)
            {
                return Ok(new VantaSettings());
            }

            // Mask API token in response
            var response = new
            {
                settings.Id,
                ApiToken = string.IsNullOrEmpty(settings.ApiToken) ? "" : "••••••••",
                settings.OrganizationId,
                settings.IsEnabled,
                settings.AutoSyncEnabled,
                settings.SyncIntervalMinutes,
                settings.SyncResources,
                settings.SyncCompliance,
                settings.SyncFinOps,
                IsConfigured = !string.IsNullOrEmpty(settings.ApiToken),
                settings.LastModified
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Vanta settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] VantaSettingsDto dto)
    {
        try
        {
            var settings = await _vantaService.SaveSettingsAsync(dto);
            return Ok(new { success = true, message = "Vanta settings saved successfully", isConfigured = !string.IsNullOrEmpty(settings.ApiToken) });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving Vanta settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("test-connection")]
    public async Task<IActionResult> TestConnection()
    {
        try
        {
            var success = await _vantaService.TestConnectionAsync();
            return Ok(new
            {
                success,
                message = success ? "Successfully connected to Vanta API." : "Failed to connect. Check your API token and organization ID."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing Vanta connection");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync([FromBody] VantaSyncRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null) return Unauthorized("Invalid session");
            credentials.SubscriptionIds = request.SubscriptionIds;

            var log = await _vantaService.SyncAsync(credentials, request.SyncType);
            return Ok(new
            {
                success = log.Status == "Completed",
                log.Status,
                log.ResourcesSynced,
                log.EvidenceItemsSynced,
                log.TestResultsSynced,
                log.ErrorMessage,
                log.StartedAt,
                log.CompletedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Vanta sync");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("sync/resources")]
    public async Task<IActionResult> SyncResources([FromBody] VantaSyncRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null) return Unauthorized("Invalid session");
            credentials.SubscriptionIds = request.SubscriptionIds;

            var log = await _vantaService.SyncResourcesAsync(credentials);
            return Ok(new { success = log.Status == "Completed", log.ResourcesSynced, log.Status, log.ErrorMessage });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing resources to Vanta");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("sync-status")]
    public async Task<IActionResult> GetSyncStatus()
    {
        try
        {
            var status = await _vantaService.GetSyncStatusAsync();
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Vanta sync status");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

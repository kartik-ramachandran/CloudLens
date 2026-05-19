using Microsoft.AspNetCore.Mvc;
using CloudLens.API.Models;
using CloudLens.API.Services;
using CloudLens.API.Data;
using CloudLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SocIncidentController : ControllerBase
{
    private readonly ISocIncidentService _socIncidentService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<SocIncidentController> _logger;

    public SocIncidentController(
        ISocIncidentService socIncidentService,
        ICredentialCacheService credentialCache,
        AppDbContext dbContext,
        ILogger<SocIncidentController> logger)
    {
        _socIncidentService = socIncidentService;
        _credentialCache = credentialCache;
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost("incidents")]
    public async Task<ActionResult<List<SocIncidentDto>>> GetIncidents([FromBody] GetIncidentsRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
                return Unauthorized("No active credentials found");

            var subscriptionId = request?.SubscriptionIds?.FirstOrDefault();
            
            var incidents = await _socIncidentService.GetIncidentsAsync(
                request?.Tier,
                request?.Status,
                subscriptionId);

            return Ok(incidents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SOC incidents");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("incident/{id}")]
    public async Task<ActionResult<SocIncidentDto>> GetIncidentById([FromBody] SubscriptionRequest? request, int id)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
                return Unauthorized("No active credentials found");

            var incident = await _socIncidentService.GetIncidentByIdAsync(id);
            
            if (incident == null)
                return NotFound($"Incident {id} not found");

            return Ok(incident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SOC incident {Id}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("create")]
    public async Task<ActionResult<SocIncidentDto>> CreateIncident([FromBody] CreateIncidentRequest request)
    {
        try
        {
            var incident = await _socIncidentService.CreateIncidentAsync(request);
            return Ok(incident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating SOC incident");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("incident/{id}/remediate-soc1")]
    public async Task<ActionResult<RemediationAttemptDto>> RemediateSoc1([FromBody] SubscriptionRequest? request, int id)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
                return Unauthorized("No active credentials found");

            var attempt = await _socIncidentService.ProcessSoc1RemediationAsync(id, credentials);
            return Ok(attempt);
        }
        catch (NotSupportedException ex)
        {
            return BadRequest(new { error = ex.Message, escalated = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SOC1 remediation for incident {Id}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("incident/{id}/remediate-manual")]
    public async Task<ActionResult<RemediationAttemptDto>> RemediateManual(
        [FromBody] ManualRemediationRequest request, 
        int id)
    {
        try
        {
            var attempt = await _socIncidentService.RecordManualRemediationAsync(
                id,
                request.RemediationType,
                request.ActionsTaken,
                request.Success);

            return Ok(attempt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording manual remediation for incident {Id}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("incident/{id}/escalate")]
    public async Task<ActionResult<SocIncidentDto>> EscalateIncident(
        [FromBody] EscalateIncidentRequest request,
        int id)
    {
        try
        {
            var incident = await _socIncidentService.EscalateIncidentAsync(
                id,
                request.Reason,
                request.AssignedTo);

            return Ok(incident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error escalating incident {Id}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("incident/{id}/close")]
    public async Task<ActionResult<SocIncidentDto>> CloseIncident(
        [FromBody] CloseIncidentRequest request,
        int id)
    {
        try
        {
            var incident = await _socIncidentService.CloseIncidentAsync(id, request.Resolution);
            return Ok(incident);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing incident {Id}", id);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("dashboard")]
    public async Task<ActionResult<SocDashboardStats>> GetDashboardStats([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
                return Unauthorized("No active credentials found");

            var subscriptionId = request?.SubscriptionIds?.FirstOrDefault();
            
            var stats = await _socIncidentService.GetDashboardStatsAsync(subscriptionId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SOC dashboard stats");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private async Task<AzureCredentials?> GetGlobalCredentialsAsync(List<string>? subscriptionIds = null)
    {
        var globalCred = await _dbContext.GlobalAzureCredentials
            .FirstOrDefaultAsync(c => c.IsActive);
        
        if (globalCred == null)
        {
            return null;
        }

        return new AzureCredentials
        {
            TenantId = globalCred.TenantId,
            ClientId = globalCred.ClientId,
            ClientSecret = globalCred.ClientSecret,
            SubscriptionIds = subscriptionIds 
                ?? JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) 
                ?? new List<string>()
        };
    }
}

public class GetIncidentsRequest : SubscriptionRequest
{
    public string? Tier { get; set; }
    public string? Status { get; set; }
}

public class ManualRemediationRequest
{
    public string RemediationType { get; set; } = string.Empty;
    public string ActionsTaken { get; set; } = string.Empty;
    public bool Success { get; set; }
}

public class CloseIncidentRequest
{
    public string Resolution { get; set; } = string.Empty;
}

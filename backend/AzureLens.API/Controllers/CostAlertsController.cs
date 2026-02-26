using AzureLens.API.Models;
using AzureLens.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CostAlertsController : ControllerBase
{
    private readonly ICostAlertService _alertService;
    private readonly ILogger<CostAlertsController> _logger;

    public CostAlertsController(ICostAlertService alertService, ILogger<CostAlertsController> logger)
    {
        _alertService = alertService;
        _logger = logger;
    }

    /// <summary>
    /// Get all cost alert rules for a session
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<CostAlertRule>>> GetAlertRules([FromQuery] string sessionId)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest(new { error = "SessionId is required" });
        }

        try
        {
            var rules = await _alertService.GetAlertRulesAsync(sessionId);
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching alert rules");
            return StatusCode(500, new { error = "Failed to fetch alert rules", details = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific alert rule by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<CostAlertRule>> GetAlertRule(int id)
    {
        try
        {
            var rule = await _alertService.GetAlertRuleByIdAsync(id);
            if (rule == null)
            {
                return NotFound(new { error = $"Alert rule {id} not found" });
            }
            return Ok(rule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching alert rule {id}");
            return StatusCode(500, new { error = "Failed to fetch alert rule", details = ex.Message });
        }
    }

    /// <summary>
    /// Create a new cost alert rule
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CostAlertRule>> CreateAlertRule([FromBody] CostAlertRuleDto dto)
    {
        if (string.IsNullOrEmpty(dto.Name))
        {
            return BadRequest(new { error = "Name is required" });
        }

        if (dto.ThresholdAmount <= 0)
        {
            return BadRequest(new { error = "Threshold amount must be greater than 0" });
        }

        try
        {
            var createdBy = User?.Identity?.Name ?? "system";
            var rule = await _alertService.CreateAlertRuleAsync(dto, createdBy);
            return CreatedAtAction(nameof(GetAlertRule), new { id = rule.Id }, rule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating alert rule");
            return StatusCode(500, new { error = "Failed to create alert rule", details = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing alert rule
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<CostAlertRule>> UpdateAlertRule(int id, [FromBody] CostAlertRuleDto dto)
    {
        if (string.IsNullOrEmpty(dto.Name))
        {
            return BadRequest(new { error = "Name is required" });
        }

        try
        {
            var rule = await _alertService.UpdateAlertRuleAsync(id, dto);
            if (rule == null)
            {
                return NotFound(new { error = $"Alert rule {id} not found" });
            }
            return Ok(rule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error updating alert rule {id}");
            return StatusCode(500, new { error = "Failed to update alert rule", details = ex.Message });
        }
    }

    /// <summary>
    /// Delete an alert rule
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteAlertRule(int id)
    {
        try
        {
            var deleted = await _alertService.DeleteAlertRuleAsync(id);
            if (!deleted)
            {
                return NotFound(new { error = $"Alert rule {id} not found" });
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error deleting alert rule {id}");
            return StatusCode(500, new { error = "Failed to delete alert rule", details = ex.Message });
        }
    }

    /// <summary>
    /// Toggle alert rule enabled/disabled
    /// </summary>
    [HttpPatch("{id}/toggle")]
    public async Task<ActionResult> ToggleAlertRule(int id, [FromBody] bool isEnabled)
    {
        try
        {
            var updated = await _alertService.ToggleAlertRuleAsync(id, isEnabled);
            if (!updated)
            {
                return NotFound(new { error = $"Alert rule {id} not found" });
            }
            return Ok(new { message = $"Alert rule {(isEnabled ? "enabled" : "disabled")} successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error toggling alert rule {id}");
            return StatusCode(500, new { error = "Failed to toggle alert rule", details = ex.Message });
        }
    }

    /// <summary>
    /// Get alert history for a session
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<List<CostAlertHistory>>> GetAlertHistory(
        [FromQuery] string sessionId,
        [FromQuery] int? alertRuleId = null,
        [FromQuery] int pageSize = 50)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest(new { error = "SessionId is required" });
        }

        try
        {
            var history = await _alertService.GetAlertHistoryAsync(sessionId, alertRuleId, pageSize);
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching alert history");
            return StatusCode(500, new { error = "Failed to fetch alert history", details = ex.Message });
        }
    }

    /// <summary>
    /// Acknowledge an alert
    /// </summary>
    [HttpPatch("history/{alertId}/acknowledge")]
    public async Task<ActionResult<CostAlertHistory>> AcknowledgeAlert(int alertId, [FromBody] string? acknowledgedBy = null)
    {
        try
        {
            var user = acknowledgedBy ?? User?.Identity?.Name ?? "system";
            var alert = await _alertService.AcknowledgeAlertAsync(alertId, user);
            if (alert == null)
            {
                return NotFound(new { error = $"Alert {alertId} not found" });
            }
            return Ok(alert);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error acknowledging alert {alertId}");
            return StatusCode(500, new { error = "Failed to acknowledge alert", details = ex.Message });
        }
    }

    /// <summary>
    /// Resolve an alert
    /// </summary>
    [HttpPatch("history/{alertId}/resolve")]
    public async Task<ActionResult<CostAlertHistory>> ResolveAlert(int alertId)
    {
        try
        {
            var alert = await _alertService.ResolveAlertAsync(alertId);
            if (alert == null)
            {
                return NotFound(new { error = $"Alert {alertId} not found" });
            }
            return Ok(alert);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error resolving alert {alertId}");
            return StatusCode(500, new { error = "Failed to resolve alert", details = ex.Message });
        }
    }

    /// <summary>
    /// Manually trigger alert evaluation (admin/testing only)
    /// </summary>
    [HttpPost("evaluate")]
    public async Task<ActionResult> EvaluateAlerts()
    {
        try
        {
            await _alertService.EvaluateAlertRulesAsync();
            return Ok(new { message = "Alert rules evaluated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error evaluating alert rules");
            return StatusCode(500, new { error = "Failed to evaluate alert rules", details = ex.Message });
        }
    }
}

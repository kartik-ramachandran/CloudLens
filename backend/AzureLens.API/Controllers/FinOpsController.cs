using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FinOpsController : ControllerBase
{
    private readonly IFinOpsService _finOpsService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<FinOpsController> _logger;

    public FinOpsController(
        IFinOpsService finOpsService,
        ICredentialCacheService credentialCache,
        AppDbContext dbContext,
        ILogger<FinOpsController> logger)
    {
        _finOpsService = finOpsService;
        _credentialCache = credentialCache;
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost("metrics")]
    public async Task<IActionResult> GetFinOpsMetrics([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var metrics = await _finOpsService.GetFinOpsMetricsAsync(credentials);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching FinOps metrics");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("waste")]
    public async Task<IActionResult> GetWastedResources([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var wasted = await _finOpsService.GetWastedResourcesAsync(credentials);
            return Ok(wasted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting wasted resources");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("advisor")]
    public async Task<IActionResult> GetAdvisorRecommendations([FromBody] SubscriptionRequest? request = null, [FromQuery] string? category = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var recs = await _finOpsService.GetAdvisorRecommendationsAsync(credentials, category);
            return Ok(recs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Advisor recommendations");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("rightsizing")]
    public async Task<IActionResult> GetRightsizingRecommendations([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var recs = await _finOpsService.GetRightsizingRecommendationsAsync(credentials);
            return Ok(recs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching rightsizing recommendations");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("anomalies")]
    public async Task<IActionResult> GetCostAnomalies([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var anomalies = await _finOpsService.DetectCostAnomaliesAsync(credentials);
            return Ok(anomalies);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting cost anomalies");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("forecast")]
    public async Task<IActionResult> GetCostForecast([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var forecast = await _finOpsService.GetCostForecastAsync(credentials);
            return Ok(forecast);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating cost forecast");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("budgets")]
    public async Task<IActionResult> GetBudgets([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var budgets = await _finOpsService.GetBudgetsAsync(credentials);
            return Ok(budgets);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching budgets");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("tag-compliance")]
    public async Task<IActionResult> GetTagCompliance([FromBody] TagComplianceRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var report = await _finOpsService.GetTagComplianceAsync(credentials, request?.RequiredTags);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating tag compliance report");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("ai-insights")]
    public async Task<IActionResult> GetFinOpsAIInsights([FromBody] FinOpsAIInsightRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");
            var insights = await _finOpsService.GenerateFinOpsAIInsightsAsync(credentials, request?.InsightType ?? "General");
            return Ok(insights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating FinOps AI insights");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("apply-bulk-tags")]
    public async Task<IActionResult> ApplyBulkTags([FromBody] BulkTagRequestDto? request = null)
    {
        try
        {
            if (request == null) return BadRequest("Request body is required for bulk tag operations");
            
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");

            var bulkRequest = new BulkTagRequest
            {
                ResourceIds = request.ResourceIds,
                Tags = request.Tags,
                ReplaceExisting = request.ReplaceExisting
            };

            var result = await _finOpsService.ApplyBulkTagsAsync(credentials, bulkRequest);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying bulk tags");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("export-tag-violations")]
    public async Task<IActionResult> ExportTagViolations([FromBody] TagComplianceRequest? request = null)
    {
        try
        {
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");

            var csvBytes = await _finOpsService.ExportTagViolationsToCsvAsync(credentials, request?.RequiredTags);
            return File(csvBytes, "text/csv", $"tag-violations-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting tag violations");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("ai-tag-suggestions")]
    public async Task<IActionResult> GetAITagSuggestions([FromBody] AITagSuggestionRequest? request = null)
    {
        try
        {
            if (request == null) return BadRequest("Request body with ResourceIds is required");
            
            var credentials = await GetCredentials(request);
            if (credentials == null) return Unauthorized("No active credentials found");

            var suggestions = await _finOpsService.GetAITagSuggestionsAsync(credentials, request.ResourceIds);
            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating AI tag suggestions");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private async Task<AzureCredentials?> GetCredentials(SubscriptionRequest? request = null)
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
            SubscriptionIds = request?.SubscriptionIds 
                ?? JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) 
                ?? new List<string>()
        };
    }
}

public class TagComplianceRequest : SubscriptionRequest
{
    public List<string>? RequiredTags { get; set; }
}

public class BulkTagRequestDto : SubscriptionRequest
{
    public List<string> ResourceIds { get; set; } = new();
    public Dictionary<string, string> Tags { get; set; } = new();
    public bool ReplaceExisting { get; set; } = false;
}

public class AITagSuggestionRequest : SubscriptionRequest
{
    public List<string> ResourceIds { get; set; } = new();
}

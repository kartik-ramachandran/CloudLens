using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FinOpsController : ControllerBase
{
    private readonly IFinOpsService _finOpsService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly ILogger<FinOpsController> _logger;

    public FinOpsController(
        IFinOpsService finOpsService,
        ICredentialCacheService credentialCache,
        ILogger<FinOpsController> logger)
    {
        _finOpsService = finOpsService;
        _credentialCache = credentialCache;
        _logger = logger;
    }

    [HttpPost("metrics")]
    public async Task<IActionResult> GetFinOpsMetrics([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
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
    public async Task<IActionResult> GetWastedResources([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
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
    public async Task<IActionResult> GetAdvisorRecommendations([FromBody] SubscriptionRequest request, [FromQuery] string? category = null)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
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
    public async Task<IActionResult> GetRightsizingRecommendations([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
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
    public async Task<IActionResult> GetCostAnomalies([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
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
    public async Task<IActionResult> GetCostForecast([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
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
    public async Task<IActionResult> GetBudgets([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
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
    public async Task<IActionResult> GetTagCompliance([FromBody] TagComplianceRequest request)
    {
        try
        {
            var credentials = GetCredentials(request);
            if (credentials == null) return Unauthorized("Invalid session");
            var report = await _finOpsService.GetTagComplianceAsync(credentials, request.RequiredTags);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating tag compliance report");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("ai-insights")]
    public async Task<IActionResult> GetFinOpsAIInsights([FromBody] FinOpsAIInsightRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null) return Unauthorized("Invalid session");
            credentials.SubscriptionIds = request.SubscriptionIds;
            var insights = await _finOpsService.GenerateFinOpsAIInsightsAsync(credentials, request.InsightType);
            return Ok(insights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating FinOps AI insights");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private AzureCredentials? GetCredentials(SubscriptionRequest request)
    {
        var credentials = _credentialCache.GetCredentials(request.SessionId);
        if (credentials == null) return null;
        credentials.SubscriptionIds = request.SubscriptionIds;
        return credentials;
    }
}

public class TagComplianceRequest : SubscriptionRequest
{
    public List<string>? RequiredTags { get; set; }
}

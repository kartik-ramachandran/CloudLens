using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/ai-remediation")]
public class AIRemediationController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly ILogger<AIRemediationController> _logger;
    private readonly ICredentialCacheService _credentialCache;
    private readonly AppDbContext _dbContext;

    public AIRemediationController(
        IAIService aiService,
        ILogger<AIRemediationController> logger,
        ICredentialCacheService credentialCache,
        AppDbContext dbContext)
    {
        _aiService = aiService;
        _logger = logger;
        _credentialCache = credentialCache;
        _dbContext = dbContext;
    }

    /// <summary>
    /// Generate AI-powered remediation suggestions for compliance issues
    /// </summary>
    [HttpPost("suggestions")]
    public async Task<IActionResult> GenerateSuggestions([FromBody] AIRemediationRequest? request = null)
    {
        try
        {
            if (request == null || !request.Issues.Any())
            {
                return BadRequest(new { message = "Request with issues is required" });
            }
            
            // Validate credentials
            var credentials = await GetGlobalCredentialsAsync();
            if (credentials == null)
            {
                return Unauthorized(new { message = "No active credentials found. Please configure credentials." });
            }

            // Build context from request
            var context = new ComplianceRemediationContext
            {
                ComplianceType = request.ComplianceType,
                Issues = request.Issues,
                TotalIssues = request.Issues.Count,
                CriticalIssues = request.Issues.Count(i => i.Severity == "Critical"),
                HighIssues = request.Issues.Count(i => i.Severity == "High"),
                SubscriptionId = request.SubscriptionId ?? credentials.SubscriptionIds?.FirstOrDefault() ?? "",
                ResourceTypes = request.Issues.Select(i => i.ResourceType).Distinct().ToList()
            };

            var suggestions = await _aiService.GenerateRemediationSuggestionsAsync(context);

            return Ok(new
            {
                success = true,
                suggestions = suggestions,
                metadata = new
                {
                    timestamp = DateTime.UtcNow,
                    totalSuggestions = suggestions.Count,
                    automatedCount = suggestions.Count(s => s.Automation == "Automated"),
                    semiAutomatedCount = suggestions.Count(s => s.Automation == "SemiAutomated"),
                    manualCount = suggestions.Count(s => s.Automation == "Manual")
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating AI remediation suggestions");
            return StatusCode(500, new
            {
                success = false,
                error = ex.Message,
                message = "Failed to generate remediation suggestions. Please check your AI settings."
            });
        }
    }

    /// <summary>
    /// Get remediation suggestion for a specific control or incident
    /// </summary>
    [HttpPost("suggest-single")]
    public async Task<IActionResult> GenerateSingleSuggestion([FromBody] SingleRemediationRequest? request = null)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new { message = "Request is required" });
            }
            
            // Validate credentials
            var credentials = await GetGlobalCredentialsAsync();
            if (credentials == null)
            {
                return Unauthorized(new { message = "No active credentials found. Please configure credentials." });
            }

            var context = new ComplianceRemediationContext
            {
                ComplianceType = request.ComplianceType ?? "SOC2",
                Issues = new List<ComplianceIssue>
                {
                    new ComplianceIssue
                    {
                        ControlId = request.ControlId,
                        ControlName = request.ControlName,
                        Description = request.Description,
                        Severity = request.Severity,
                        ResourceId = request.ResourceId ?? "",
                        ResourceType = request.ResourceType ?? ""
                    }
                },
                TotalIssues = 1,
                CriticalIssues = request.Severity == "Critical" ? 1 : 0,
                HighIssues = request.Severity == "High" ? 1 : 0,
                SubscriptionId = request.SubscriptionId ?? credentials.SubscriptionIds?.FirstOrDefault() ?? "",
                ResourceTypes = string.IsNullOrEmpty(request.ResourceType) ? new List<string>() : new List<string> { request.ResourceType }
            };

            var suggestions = await _aiService.GenerateRemediationSuggestionsAsync(context);

            return Ok(new
            {
                success = true,
                suggestion = suggestions.FirstOrDefault(),
                metadata = new
                {
                    timestamp = DateTime.UtcNow,
                    controlId = request.ControlId
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating single remediation suggestion");
            return StatusCode(500, new
            {
                success = false,
                error = ex.Message
            });
        }
    }

    private async Task<AzureCredentials?> GetGlobalCredentialsAsync()
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
            SubscriptionIds = JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) 
                ?? new List<string>()
        };
    }
}

public class AIRemediationRequest
{
    public string ComplianceType { get; set; } = "SOC2";
    public string? SubscriptionId { get; set; }
    public List<ComplianceIssue> Issues { get; set; } = new();
}

public class SingleRemediationRequest
{
    public string? ComplianceType { get; set; }
    public string ControlId { get; set; } = string.Empty;
    public string ControlName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";
    public string? SubscriptionId { get; set; }
    public string? ResourceId { get; set; }
    public string? ResourceType { get; set; }
}

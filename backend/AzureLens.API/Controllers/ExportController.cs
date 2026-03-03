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
public class ExportController : ControllerBase
{
    private readonly IExportService _exportService;
    private readonly IAzureService _azureService;
    private readonly ICacheService _cacheService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ExportController> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public ExportController(
        IExportService exportService,
        IAzureService azureService,
        ICacheService cacheService,
        ICredentialCacheService credentialCache,
        AppDbContext dbContext,
        ILogger<ExportController> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _exportService = exportService;
        _azureService = azureService;
        _cacheService = cacheService;
        _credentialCache = credentialCache;
        _dbContext = dbContext;
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

            _logger.LogInformation("Triggering Azure Functions cache refresh...");
            var response = await _httpClient.PostAsync($"{functionsUrl}/api/TriggerRefresh", null);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Azure Functions refresh triggered successfully");
                // Wait a bit for function to populate data
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

    [HttpPost("resources")]
    public async Task<IActionResult> ExportResources([FromBody] ExportRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found. Please configure credentials." });
            }

            // Get resources from PostgreSQL ONLY
            var resources = await _cacheService.GetCachedResourcesAsync(request?.SubscriptionIds ?? new List<string>());
            if (resources == null || !resources.Any())
            {
                // Trigger Azure Function to populate database
                _logger.LogWarning("No resources in database, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                resources = await _cacheService.GetCachedResourcesAsync(request?.SubscriptionIds ?? new List<string>());
                if (resources == null || !resources.Any())
                {
                    return BadRequest(new { error = "No resources found after triggering refresh. Please wait and try again." });
                }
            }

            byte[] fileBytes;
            string contentType;
            string fileName;

            if (request?.Format == ExportFormat.Excel)
            {
                fileBytes = await _exportService.ExportResourcesToExcelAsync(resources, "Azure Resources");
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName = $"azure-resources-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            }
            else if (request?.Format == ExportFormat.CSV)
            {
                fileBytes = await _exportService.ExportResourcesToCsvAsync(resources, "Azure Resources");
                contentType = "text/csv";
                fileName = $"azure-resources-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            }
            else
            {
                fileBytes = await _exportService.ExportResourcesToPdfAsync(resources, "Azure Resources");
                contentType = "text/html"; // Change to "application/pdf" when using proper PDF library
                fileName = $"azure-resources-{DateTime.UtcNow:yyyyMMdd-HHmmss}.html";
            }

            return File(fileBytes, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting resources");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("costs")]
    public async Task<IActionResult> ExportCosts([FromBody] ExportRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found. Please configure credentials." });
            }

            var startDate = request?.StartDate ?? DateTime.UtcNow.AddMonths(-1);
            var endDate = request?.EndDate ?? DateTime.UtcNow;

            // Get costs from PostgreSQL ONLY
            var costs = await _cacheService.GetCachedCostsAsync(request?.SubscriptionIds ?? new List<string>());
            if (costs == null || !costs.Any())
            {
                // Trigger Azure Function to populate database
                _logger.LogWarning("No costs in database, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                costs = await _cacheService.GetCachedCostsAsync(request?.SubscriptionIds ?? new List<string>());
                if (costs == null || !costs.Any())
                {
                    return BadRequest(new { error = "No costs found after triggering refresh. Please wait and try again." });
                }
            }

            byte[] fileBytes;
            string contentType;
            string fileName;

            if (request?.Format == ExportFormat.Excel)
            {
                fileBytes = await _exportService.ExportCostsToExcelAsync(costs, startDate, endDate);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName = $"azure-costs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            }
            else if (request?.Format == ExportFormat.CSV)
            {
                fileBytes = await _exportService.ExportCostsToCsvAsync(costs, startDate, endDate);
                contentType = "text/csv";
                fileName = $"azure-costs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            }
            else
            {
                fileBytes = await _exportService.ExportCostsToPdfAsync(costs, startDate, endDate);
                contentType = "text/html";
                fileName = $"azure-costs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.html";
            }

            return File(fileBytes, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("recommendations")]
    public async Task<IActionResult> ExportRecommendations([FromBody] ExportRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found. Please configure credentials." });
            }

            // Get recommendations from PostgreSQL ONLY
            var subscriptionIds = request?.SubscriptionIds ?? new List<string>();
            var recommendations = await _cacheService.GetCachedAIRecommendationsAsync(subscriptionIds);
            if (recommendations == null || !recommendations.Any())
            {
                // Trigger Azure Function to populate database
                _logger.LogWarning("No recommendations in database, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                recommendations = await _cacheService.GetCachedAIRecommendationsAsync(subscriptionIds);
                if (recommendations == null || !recommendations.Any())
                {
                    return BadRequest(new { error = "No recommendations found after triggering refresh. Please wait and try again." });
                }
            }

            // Map AIRecommendation to SecurityRecommendation format for export (using available fields)
            var securityRecommendations = recommendations.Select(r => new SecurityRecommendation
            {
                Id = Guid.NewGuid().ToString(), // AIRecommendation doesn't have an ID
                Name = r.Category,
                DisplayName = r.Title,
                Description = r.Description,
                Severity = r.Priority, // Map Priority to Severity
                Status = "Active", // Default status
                ResourceId = "", // Not available in AIRecommendation
                Category = r.Category,
                RemediationSteps = r.Description
            }).ToList();

            byte[] fileBytes;
            string contentType;
            string fileName;

            if (request?.Format == ExportFormat.Excel)
            {
                fileBytes = await _exportService.ExportRecommendationsToExcelAsync(securityRecommendations);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName = $"azure-recommendations-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            }
            else if (request?.Format == ExportFormat.CSV)
            {
                fileBytes = await _exportService.ExportRecommendationsToCsvAsync(securityRecommendations);
                contentType = "text/csv";
                fileName = $"azure-recommendations-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            }
            else
            {
                fileBytes = await _exportService.ExportRecommendationsToPdfAsync(securityRecommendations);
                contentType = "text/html";
                fileName = $"azure-recommendations-{DateTime.UtcNow:yyyyMMdd-HHmmss}.html";
            }

            return File(fileBytes, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting recommendations");
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

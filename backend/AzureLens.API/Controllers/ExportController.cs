using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExportController : ControllerBase
{
    private readonly IExportService _exportService;
    private readonly IAzureService _azureService;
    private readonly ICacheService _cacheService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly ILogger<ExportController> _logger;

    public ExportController(
        IExportService exportService,
        IAzureService azureService,
        ICacheService cacheService,
        ICredentialCacheService credentialCache,
        ILogger<ExportController> logger)
    {
        _exportService = exportService;
        _azureService = azureService;
        _cacheService = cacheService;
        _credentialCache = credentialCache;
        _logger = logger;
    }

    [HttpPost("resources")]
    public async Task<IActionResult> ExportResources([FromBody] ExportRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            // Get resources
            var resources = await _cacheService.GetCachedResourcesAsync(request.SubscriptionIds ?? new List<string>());
            if (resources == null || !resources.Any())
            {
                resources = await _azureService.GetResourcesAsync(credentials);
            }

            byte[] fileBytes;
            string contentType;
            string fileName;

            if (request.Format == ExportFormat.Excel)
            {
                fileBytes = await _exportService.ExportResourcesToExcelAsync(resources, "Azure Resources");
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName = $"azure-resources-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
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
    public async Task<IActionResult> ExportCosts([FromBody] ExportRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            var startDate = request.StartDate ?? DateTime.UtcNow.AddMonths(-1);
            var endDate = request.EndDate ?? DateTime.UtcNow;

            // Get costs
            var costs = await _cacheService.GetCachedCostsAsync(request.SubscriptionIds ?? new List<string>());
            if (costs == null || !costs.Any())
            {
                costs = await _azureService.GetCostsAsync(credentials);
            }

            byte[] fileBytes;
            string contentType;
            string fileName;

            if (request.Format == ExportFormat.Excel)
            {
                fileBytes = await _exportService.ExportCostsToExcelAsync(costs, startDate, endDate);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName = $"azure-costs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
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
    public async Task<IActionResult> ExportRecommendations([FromBody] ExportRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            // Get recommendations
            var recommendations = await _azureService.GetSecurityRecommendationsAsync(credentials);

            byte[] fileBytes;
            string contentType;
            string fileName;

            if (request.Format == ExportFormat.Excel)
            {
                fileBytes = await _exportService.ExportRecommendationsToExcelAsync(recommendations);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName = $"azure-recommendations-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            }
            else
            {
                fileBytes = await _exportService.ExportRecommendationsToPdfAsync(recommendations);
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
}

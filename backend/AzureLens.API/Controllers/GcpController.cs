using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/gcp")]
[Authorize]
public class GcpController : ControllerBase
{
    private readonly IGcpService _gcpService;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<GcpController> _logger;

    public GcpController(IGcpService gcpService, AppDbContext dbContext, ILogger<GcpController> logger)
    {
        _gcpService = gcpService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Check whether global GCP credentials are configured.
    /// </summary>
    [HttpGet("check-credentials")]
    public async Task<IActionResult> CheckCredentials()
    {
        var cred = await _dbContext.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive);
        if (cred == null)
            return Ok(new { exists = false });

        return Ok(new
        {
            exists = true,
            updatedAt = cred.UpdatedAt,
        });
    }

    /// <summary>
    /// Save (or update) global GCP credentials and verify connectivity by fetching costs.
    /// </summary>
    [HttpPost("connect")]
    public async Task<IActionResult> Connect([FromBody] GcpCredentials credentials)
    {
        if (string.IsNullOrWhiteSpace(credentials.ServiceAccountJson))
            return BadRequest(new { error = "ServiceAccountJson is required. Paste the full contents of your GCP service account key file." });

        try
        {
            // Validate credentials by fetching costs
            var results = await _gcpService.GetCostsAsync(credentials);

            // Upsert global credentials
            var existing = await _dbContext.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive);
            if (existing != null)
            {
                existing.ServiceAccountJson = credentials.ServiceAccountJson;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _dbContext.GlobalGcpCredentials.Add(new GlobalGcpCredentials
                {
                    ServiceAccountJson = credentials.ServiceAccountJson,
                    IsActive = true,
                });
            }
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "GCP credentials saved and verified.", projectCount = results.Count });
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            _logger.LogWarning(ex, "GCP credentials denied for Cloud Billing");
            return StatusCode(403, new { error = "Access denied. Ensure the service account has roles/billing.viewer permission." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to GCP");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Fetch cost data from GCP Cloud Billing using the provided credentials.
    /// Falls back to global credentials + cached data when no credentials are supplied.
    /// </summary>
    [HttpPost("costs")]
    public async Task<IActionResult> GetCosts([FromBody] GcpCredentials credentials)
    {
        if (string.IsNullOrWhiteSpace(credentials.ServiceAccountJson))
        {
            // Fall back to global credentials + cached data
            var globalCred = await _dbContext.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive);
            if (globalCred == null)
                return BadRequest(new { error = "ServiceAccountJson is required. Paste the full contents of your GCP service account key file." });

            var cached = await _dbContext.CachedCloudCosts
                .Where(c => c.Provider == "gcp")
                .ToListAsync();

            if (cached.Any())
            {
                var cachedResult = cached.Select(c => new CloudCostSummary
                {
                    AccountId = c.AccountId,
                    AccountName = c.AccountName,
                    TotalCost = c.TotalCost,
                    Currency = c.Currency,
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    CostsByService = System.Text.Json.JsonSerializer.Deserialize<List<CloudCostByService>>(c.CostsByServiceJson) ?? new(),
                    MonthlyCosts = System.Text.Json.JsonSerializer.Deserialize<List<CloudMonthlyCost>>(c.MonthlyCostsJson) ?? new(),
                }).ToList();
                return Ok(cachedResult);
            }

            credentials = new GcpCredentials { ServiceAccountJson = globalCred.ServiceAccountJson };
        }

        try
        {
            var results = await _gcpService.GetCostsAsync(credentials);
            return Ok(results);
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            _logger.LogWarning(ex, "GCP credentials denied for Cloud Billing");
            return StatusCode(403, new { error = "Access denied. Ensure the service account has roles/billing.viewer permission." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching GCP costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

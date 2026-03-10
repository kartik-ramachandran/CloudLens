using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/aws")]
[Authorize]
public class AwsController : ControllerBase
{
    private readonly IAwsService _awsService;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AwsController> _logger;

    public AwsController(IAwsService awsService, AppDbContext dbContext, ILogger<AwsController> logger)
    {
        _awsService = awsService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Check whether global AWS credentials are configured.
    /// </summary>
    [HttpGet("check-credentials")]
    public async Task<IActionResult> CheckCredentials()
    {
        var cred = await _dbContext.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive);
        if (cred == null)
            return Ok(new { exists = false });

        return Ok(new
        {
            exists = true,
            region = cred.Region,
            updatedAt = cred.UpdatedAt,
        });
    }

    /// <summary>
    /// Save (or update) global AWS credentials and verify connectivity by fetching costs.
    /// </summary>
    [HttpPost("connect")]
    public async Task<IActionResult> Connect([FromBody] AwsCredentials credentials)
    {
        if (string.IsNullOrWhiteSpace(credentials.AccessKeyId) ||
            string.IsNullOrWhiteSpace(credentials.SecretAccessKey))
            return BadRequest(new { error = "AccessKeyId and SecretAccessKey are required." });

        try
        {
            // Validate credentials by fetching costs
            var results = await _awsService.GetCostsAsync(credentials);

            // Upsert global credentials
            var existing = await _dbContext.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive);
            if (existing != null)
            {
                existing.AccessKeyId = credentials.AccessKeyId;
                existing.SecretAccessKey = credentials.SecretAccessKey;
                existing.Region = credentials.Region ?? "us-east-1";
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _dbContext.GlobalAwsCredentials.Add(new GlobalAwsCredentials
                {
                    AccessKeyId = credentials.AccessKeyId,
                    SecretAccessKey = credentials.SecretAccessKey,
                    Region = credentials.Region ?? "us-east-1",
                    IsActive = true,
                });
            }
            await _dbContext.SaveChangesAsync();

            return Ok(new { message = "AWS credentials saved and verified.", accountCount = results.Count });
        }
        catch (Amazon.CostExplorer.AmazonCostExplorerException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            _logger.LogWarning(ex, "AWS credentials denied for Cost Explorer");
            return StatusCode(403, new { error = "Access denied. Ensure the IAM user has ce:GetCostAndUsage permission." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to AWS");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Fetch cost data from AWS Cost Explorer using the provided credentials.
    /// Returns a summary per linked account with monthly and service breakdowns.
    /// </summary>
    [HttpPost("costs")]
    public async Task<IActionResult> GetCosts([FromBody] AwsCredentials credentials)
    {
        if (string.IsNullOrWhiteSpace(credentials.AccessKeyId) ||
            string.IsNullOrWhiteSpace(credentials.SecretAccessKey))
        {
            // Fall back to global credentials + cached data
            var globalCred = await _dbContext.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive);
            if (globalCred == null)
                return BadRequest(new { error = "AccessKeyId and SecretAccessKey are required." });

            var cached = await _dbContext.CachedCloudCosts
                .Where(c => c.Provider == "aws")
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

            credentials = new AwsCredentials
            {
                AccessKeyId = globalCred.AccessKeyId,
                SecretAccessKey = globalCred.SecretAccessKey,
                Region = globalCred.Region,
            };
        }

        try
        {
            var results = await _awsService.GetCostsAsync(credentials);
            return Ok(results);
        }
        catch (Amazon.CostExplorer.AmazonCostExplorerException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            _logger.LogWarning(ex, "AWS credentials denied for Cost Explorer");
            return StatusCode(403, new { error = "Access denied. Ensure the IAM user has ce:GetCostAndUsage permission." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching AWS costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

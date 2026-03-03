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
public class AccessReviewController : ControllerBase
{
    private readonly IAccessReviewService _service;
    private readonly ICredentialCacheService _credentialCache;
    private readonly AppDbContext _dbContext;

    public AccessReviewController(IAccessReviewService service, ICredentialCacheService credentialCache, AppDbContext dbContext)
    {
        _service = service;
        _credentialCache = credentialCache;
        _dbContext = dbContext;
    }

    [HttpPost("summary")]
    public async Task<IActionResult> GetSummary([FromBody] SubscriptionRequest? request = null)
    {
        var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
        if (credentials == null) return Unauthorized("No active credentials found");
        return Ok(await _service.GetAccessReviewAsync(credentials));
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

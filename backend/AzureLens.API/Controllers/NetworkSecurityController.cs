using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AzureLens.API.Models;
using AzureLens.API.Services;
using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using System.Text.Json;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NetworkSecurityController : ControllerBase
{
    private readonly INetworkSecurityService _service;
    private readonly AppDbContext _dbContext;

    public NetworkSecurityController(INetworkSecurityService service, AppDbContext dbContext)
    {
        _service = service;
        _dbContext = dbContext;
    }

    private async Task<AzureCredentials?> GetGlobalCredentialsAsync(List<string>? subscriptionIds = null)
    {
        var globalCred = await _dbContext.GlobalAzureCredentials
            .FirstOrDefaultAsync(c => c.IsActive);
        
        if (globalCred == null) return null;

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

    [HttpPost("report")]
    public async Task<IActionResult> GetReport([FromBody] SubscriptionRequest? request = null)
    {
        var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
        if (credentials == null) return Unauthorized("No active credentials found");
        return Ok(await _service.GetNetworkSecurityReportAsync(credentials));
    }
}

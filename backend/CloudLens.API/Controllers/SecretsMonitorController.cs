using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CloudLens.API.Models;
using CloudLens.API.Services;
using CloudLens.API.Data;
using System.Text.Json;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SecretsMonitorController : ControllerBase
{
    private readonly ISecretsMonitorService _service;
    private readonly AppDbContext _dbContext;

    public SecretsMonitorController(ISecretsMonitorService service, AppDbContext dbContext)
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

    [HttpPost("app-secrets")]
    public async Task<IActionResult> GetAppSecrets([FromBody] SubscriptionRequest? request = null)
    {
        var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
        if (credentials == null) return Unauthorized("No active credentials found");
        return Ok(await _service.GetAppSecretsReportAsync(credentials));
    }

    [HttpPost("keyvault-expiry")]
    public async Task<IActionResult> GetKeyVaultExpiry([FromBody] SubscriptionRequest? request = null)
    {
        var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
        if (credentials == null) return Unauthorized("No active credentials found");
        return Ok(await _service.GetKeyVaultExpiryReportAsync(credentials));
    }
}

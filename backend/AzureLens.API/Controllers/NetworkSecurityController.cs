using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NetworkSecurityController : ControllerBase
{
    private readonly INetworkSecurityService _service;
    private readonly ICredentialCacheService _credentialCache;

    public NetworkSecurityController(INetworkSecurityService service, ICredentialCacheService credentialCache)
    {
        _service = service;
        _credentialCache = credentialCache;
    }

    [HttpPost("report")]
    public async Task<IActionResult> GetReport([FromBody] SubscriptionRequest request)
    {
        var credentials = _credentialCache.GetCredentials(request.SessionId);
        if (credentials == null) return Unauthorized("Invalid session");
        credentials.SubscriptionIds = request.SubscriptionIds;
        return Ok(await _service.GetNetworkSecurityReportAsync(credentials));
    }
}

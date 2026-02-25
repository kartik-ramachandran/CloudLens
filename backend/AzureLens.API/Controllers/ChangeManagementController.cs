using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChangeManagementController : ControllerBase
{
    private readonly IChangeManagementService _service;
    private readonly ICredentialCacheService _credentialCache;

    public ChangeManagementController(IChangeManagementService service, ICredentialCacheService credentialCache)
    {
        _service = service;
        _credentialCache = credentialCache;
    }

    [HttpPost("report")]
    public async Task<IActionResult> GetReport([FromBody] ChangeManagementRequest request)
    {
        var credentials = _credentialCache.GetCredentials(request.SessionId);
        if (credentials == null) return Unauthorized("Invalid session");
        credentials.SubscriptionIds = request.SubscriptionIds;
        return Ok(await _service.GetActivityLogAsync(credentials, request.Days));
    }
}

public class ChangeManagementRequest : SubscriptionRequest
{
    public int Days { get; set; } = 30;
}

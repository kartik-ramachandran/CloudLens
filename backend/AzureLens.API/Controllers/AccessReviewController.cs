using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccessReviewController : ControllerBase
{
    private readonly IAccessReviewService _service;
    private readonly ICredentialCacheService _credentialCache;

    public AccessReviewController(IAccessReviewService service, ICredentialCacheService credentialCache)
    {
        _service = service;
        _credentialCache = credentialCache;
    }

    [HttpPost("summary")]
    public async Task<IActionResult> GetSummary([FromBody] SubscriptionRequest request)
    {
        var credentials = _credentialCache.GetCredentials(request.SessionId);
        if (credentials == null) return Unauthorized("Invalid session");
        credentials.SubscriptionIds = request.SubscriptionIds;
        return Ok(await _service.GetAccessReviewAsync(credentials));
    }
}

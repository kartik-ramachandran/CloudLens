using Microsoft.AspNetCore.Mvc;
using AzureLens.API.Models;
using AzureLens.API.Services;

namespace AzureLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AzureController : ControllerBase
{
    private readonly IAzureService _azureService;
    private readonly IAIService _aiService;
    private readonly IAISettingsService _aiSettingsService;
    private readonly ICacheService _cacheService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly IJiraService _jiraService;
    private readonly ILogger<AzureController> _logger;

    public AzureController(
        IAzureService azureService, 
        IAIService aiService, 
        IAISettingsService aiSettingsService,
        ICacheService cacheService,
        ICredentialCacheService credentialCache,
        IJiraService jiraService,
        ILogger<AzureController> logger)
    {
        _azureService = azureService;
        _aiService = aiService;
        _aiSettingsService = aiSettingsService;
        _cacheService = cacheService;
        _credentialCache = credentialCache;
        _jiraService = jiraService;
        _logger = logger;
    }

    [HttpPost("connect")]
    public async Task<IActionResult> Connect([FromBody] AzureCredentials credentials)
    {
        try
        {
            if (string.IsNullOrEmpty(credentials.TenantId) ||
                string.IsNullOrEmpty(credentials.ClientId) ||
                string.IsNullOrEmpty(credentials.ClientSecret))
            {
                return BadRequest("All credentials are required");
            }

            var isValid = await _azureService.ValidateCredentialsAsync(credentials);
            
            if (!isValid)
            {
                return Unauthorized("Invalid Azure credentials");
            }

            var subscriptions = await _azureService.GetSubscriptionsAsync(credentials);

            // Check if these credentials already exist in cache
            var existingSessionId = _credentialCache.FindSessionByCredentials(credentials);
            
            string sessionId;
            bool isNewSession;
            
            if (existingSessionId != null)
            {
                // Reuse existing session ID for same credentials
                sessionId = existingSessionId;
                isNewSession = false;
                _logger.LogInformation($"Reusing existing session {sessionId} for tenant {credentials.TenantId?.Substring(0, 8)}...");
            }
            else
            {
                // Create new session ID for new credentials
                sessionId = Guid.NewGuid().ToString();
                _credentialCache.StoreCredentials(sessionId, credentials);
                isNewSession = true;
                _logger.LogInformation($"Generated new session {sessionId} for tenant {credentials.TenantId?.Substring(0, 8)}...");
            }

            return Ok(new
            {
                success = true,
                message = "Successfully connected to Azure",
                sessionId,
                isNewSession,
                subscriptions
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to Azure");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("resources")]
    public async Task<IActionResult> GetResources([FromBody] SubscriptionRequest request, [FromQuery] bool forceRefresh = false)
    {
        try
        {
            // Get credentials from cache using sessionId
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                _logger.LogWarning($"Session expired or not found: {request.SessionId}");
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            // Try to get from cache first (unless forceRefresh is true)
            if (!forceRefresh)
            {
                var cachedResources = await _cacheService.GetCachedResourcesAsync(request.SubscriptionIds ?? new List<string>());
                
                if (cachedResources != null && cachedResources.Any())
                {
                    _logger.LogInformation($"Returning {cachedResources.Count} resources from cache");
                    return Ok(cachedResources);
                }
            }
            else
            {
                _logger.LogInformation("Force refresh requested - bypassing cache");
            }

            // Cache miss or force refresh - fetch from Azure and cache
            var resources = await _azureService.GetResourcesAsync(credentials);
            await _cacheService.CacheResourcesAsync(resources);
            
            _logger.LogInformation($"Fetched and cached {resources.Count} resources from Azure");
            return Ok(resources);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Azure resources");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("costs")]
    public async Task<IActionResult> GetCosts([FromBody] SubscriptionRequest request, [FromQuery] bool forceRefresh = false)
    {
        try
        {
            // Get credentials from cache using sessionId
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                _logger.LogWarning($"Session expired or not found: {request.SessionId}");
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            // Try to get from cache first (unless forceRefresh is true)
            if (!forceRefresh)
            {
                var cachedCosts = await _cacheService.GetCachedCostsAsync(request.SubscriptionIds ?? new List<string>());
                
                if (cachedCosts != null && cachedCosts.Any())
                {
                    _logger.LogInformation($"Returning costs for {cachedCosts.Count} subscriptions from cache");
                    return Ok(cachedCosts);
                }
            }
            else
            {
                _logger.LogInformation("Force refresh requested - bypassing cache");
            }

            // Cache miss or force refresh - fetch from Azure and cache
            var costs = await _azureService.GetCostsAsync(credentials);
            await _cacheService.CacheCostsAsync(costs);
            
            _logger.LogInformation($"Fetched and cached costs for {costs.Count} subscriptions from Azure");
            return Ok(costs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Azure costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("costs/monthly")]
    public async Task<IActionResult> GetMonthlyCosts([FromBody] SubscriptionRequest request, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            // Default to last 12 months if not specified
            var start = startDate ?? DateTime.UtcNow.AddMonths(-12);
            var end = endDate ?? DateTime.UtcNow;
            
            _logger.LogInformation($"Fetching monthly costs from {start:yyyy-MM-dd} to {end:yyyy-MM-dd}");
            
            credentials.SubscriptionIds = request.SubscriptionIds;
            var subscriptionIds = request.SubscriptionIds ?? new List<string>();
            
            // Create cache key with date range
            var cacheKey = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{start:yyyyMMdd}_{end:yyyyMMdd}";
            
            // Check cache first
            var cachedCosts = await _cacheService.GetCachedMonthlyCostsAsync(subscriptionIds, start, end);
            if (cachedCosts != null)
            {
                _logger.LogInformation($"Returning {cachedCosts.Count} cached monthly costs");
                return Ok(cachedCosts);
            }
            
            // Fetch from Azure
            _logger.LogInformation("Cache miss - fetching monthly costs from Azure");
            var monthlyCosts = await _azureService.GetMonthlyCostsAsync(credentials, start, end);
            
            // Cache the results
            await _cacheService.CacheMonthlyCostsAsync(monthlyCosts, subscriptionIds, start, end);
            
            return Ok(monthlyCosts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching monthly costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("costs/resources")]
    public async Task<IActionResult> GetResourceCosts([FromBody] SubscriptionRequest request, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            // Default to last 6 months if not specified
            var start = startDate ?? DateTime.UtcNow.AddMonths(-6);
            var end = endDate ?? DateTime.UtcNow;
            
            _logger.LogInformation($"Fetching resource costs from {start:yyyy-MM-dd} to {end:yyyy-MM-dd}");
            
            credentials.SubscriptionIds = request.SubscriptionIds;
            var subscriptionIds = request.SubscriptionIds ?? new List<string>();
            
            // Check cache first
            var cachedCosts = await _cacheService.GetCachedResourceCostsAsync(subscriptionIds, start, end);
            if (cachedCosts != null)
            {
                _logger.LogInformation($"Returning {cachedCosts.Count} cached resource costs");
                return Ok(cachedCosts);
            }
            
            // Fetch from Azure
            _logger.LogInformation("Cache miss - fetching resource costs from Azure");
            var resourceCosts = await _azureService.GetResourceCostsAsync(credentials, start, end);
            
            // Cache the results
            await _cacheService.CacheResourceCostsAsync(resourceCosts, subscriptionIds, start, end);
            
            return Ok(resourceCosts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching resource costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("recommendations")]
    public async Task<IActionResult> GetRecommendations([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            credentials.SubscriptionIds = request.SubscriptionIds;
            var recommendations = await _azureService.GetSecurityRecommendationsAsync(credentials);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching security recommendations");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("ai-insights")]
    public async Task<IActionResult> GetAIInsights([FromBody] AIInsightsRequest request)
    {
        try
        {
            var subscriptionIds = request.SubscriptionIds ?? new List<string>();
            
            if (!subscriptionIds.Any())
            {
                return BadRequest(new { error = "At least one subscription ID is required" });
            }

            // Get resources and costs from cache or Azure
            var cachedResources = await _cacheService.GetCachedResourcesAsync(subscriptionIds);
            List<AzureResource> resources;
            
            if (cachedResources != null && cachedResources.Any())
            {
                resources = cachedResources;
                _logger.LogInformation($"Using {resources.Count} cached resources for AI analysis");
            }
            else
            {
                _logger.LogWarning("No cached resources found for AI analysis");
                return BadRequest(new { error = "No cached data available. Please load resources first from the Resources tab." });
            }

            var cachedCosts = await _cacheService.GetCachedCostsAsync(subscriptionIds);
            List<CostData> costs;
            
            if (cachedCosts != null && cachedCosts.Any())
            {
                costs = cachedCosts;
                _logger.LogInformation($"Using cached costs for {costs.Count} subscriptions for AI analysis");
            }
            else
            {
                _logger.LogWarning("No cached costs found for AI analysis");
                return BadRequest(new { error = "No cached cost data available. Please load costs first from the Costs tab." });
            }

            // Build context for AI analysis from cached/fresh data
            var context = new AzureContext
            {
                ResourceCount = resources.Count,
                TotalCost = (double)costs.Sum(c => c.TotalCost),
                SubscriptionCount = subscriptionIds.Count,
                ResourceTypes = resources.Select(r => r.Type).Distinct().ToList(),
                Locations = resources.Select(r => r.Location).Distinct().ToList()
            };

            _logger.LogInformation($"Analyzing: {context.ResourceCount} resources, ${context.TotalCost:F2} total cost, {context.ResourceTypes.Count} resource types, {context.Locations.Count} locations");

            // Check for cached AI recommendations first
            var cachedRecommendations = await _cacheService.GetCachedAIRecommendationsAsync(subscriptionIds);
            List<AIRecommendation> recommendations;
            
            if (cachedRecommendations != null && cachedRecommendations.Any())
            {
                recommendations = cachedRecommendations;
                _logger.LogInformation($"Using {recommendations.Count} cached AI recommendations");
            }
            else
            {
                // Generate AI recommendations
                recommendations = await _aiService.GenerateRecommendationsAsync(context);
                
                // Cache the recommendations
                await _cacheService.CacheAIRecommendationsAsync(recommendations, subscriptionIds);
                
                _logger.LogInformation($"Generated and cached {recommendations.Count} AI recommendations");
            }
            
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating AI insights");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("ai-settings")]
    public async Task<IActionResult> GetAISettings()
    {
        try
        {
            var settings = await _aiSettingsService.GetSettingsAsync();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching AI settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("ai-settings")]
    public async Task<IActionResult> SaveAISettings([FromBody] AISettingsDto settings)
    {
        try
        {
            var result = await _aiSettingsService.SaveSettingsAsync(settings);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving AI settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("cache/clear")]
    public async Task<IActionResult> ClearCache()
    {
        try
        {
            await _cacheService.ClearAllCacheAsync();
            _logger.LogInformation("Cache cleared successfully");
            return Ok(new { message = "All cached data has been cleared successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing cache");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("alerts")]
    public async Task<IActionResult> GetAlertRules([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            credentials.SubscriptionIds = request.SubscriptionIds;
            var alerts = await _azureService.GetAlertRulesAsync(credentials);
            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching alert rules");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("aks/services")]
    public async Task<IActionResult> GetAKSServices([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            credentials.SubscriptionIds = request.SubscriptionIds;
            var services = await _azureService.GetAKSServicesAsync(credentials);
            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching AKS services");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("aks/pods")]
    public async Task<IActionResult> GetAKSPods([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            credentials.SubscriptionIds = request.SubscriptionIds;
            var pods = await _azureService.GetAKSPodsAsync(credentials);
            return Ok(pods);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching AKS pods");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("secure-scores")]
    public async Task<IActionResult> GetSecureScores([FromBody] SubscriptionRequest request)
    {
        try
        {
            var credentials = _credentialCache.GetCredentials(request.SessionId);
            if (credentials == null)
            {
                return Unauthorized(new { error = "Session expired. Please reconnect." });
            }

            credentials.SubscriptionIds = request.SubscriptionIds;
            var secureScores = await _azureService.GetSecureScoresAsync(credentials);
            return Ok(secureScores);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching secure scores");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("jira/settings")]
    public async Task<IActionResult> GetJiraSettings()
    {
        try
        {
            var settings = await _jiraService.GetSettingsAsync();
            if (settings == null)
            {
                return Ok(new JiraSettingsDto { IsEnabled = false });
            }

            return Ok(new JiraSettingsDto
            {
                JiraUrl = settings.JiraUrl,
                Username = settings.Username,
                ApiToken = "********", // Don't send the actual token
                ProjectKey = settings.ProjectKey,
                DefaultIssueType = settings.DefaultIssueType,
                IsEnabled = settings.IsEnabled
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching JIRA settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("jira/settings")]
    public async Task<IActionResult> SaveJiraSettings([FromBody] JiraSettingsDto settings)
    {
        try
        {
            var result = await _jiraService.SaveSettingsAsync(settings);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving JIRA settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("jira/test-connection")]
    public async Task<IActionResult> TestJiraConnection()
    {
        try
        {
            var isConnected = await _jiraService.TestConnectionAsync();
            return Ok(new { success = isConnected, message = isConnected ? "Connection successful" : "Connection failed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing JIRA connection");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("jira/create-ticket")]
    public async Task<IActionResult> CreateJiraTicket([FromBody] CreateJiraTicketRequest request)
    {
        try
        {
            var result = await _jiraService.CreateTicketAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating JIRA ticket");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("jira/create-ticket-from-alert")]
    public async Task<IActionResult> CreateJiraTicketFromAlert([FromBody] AlertRule alert)
    {
        try
        {
            var result = await _jiraService.CreateTicketFromAlertAsync(alert);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating JIRA ticket from alert");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

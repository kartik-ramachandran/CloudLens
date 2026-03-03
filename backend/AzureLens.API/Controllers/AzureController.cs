using Microsoft.AspNetCore.Authorization;
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
[Authorize]
public class AzureController : ControllerBase
{
    private readonly IAzureService _azureService;
    private readonly IAIService _aiService;
    private readonly IAISettingsService _aiSettingsService;
    private readonly ICacheService _cacheService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly IJiraService _jiraService;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AzureController> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public AzureController(
        IAzureService azureService, 
        IAIService aiService, 
        IAISettingsService aiSettingsService,
        ICacheService cacheService,
        ICredentialCacheService credentialCache,
        IJiraService jiraService,
        AppDbContext dbContext,
        ILogger<AzureController> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _azureService = azureService;
        _aiService = aiService;
        _aiSettingsService = aiSettingsService;
        _cacheService = cacheService;
        _credentialCache = credentialCache;
        _jiraService = jiraService;
        _dbContext = dbContext;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
        // Set longer timeout for Functions calls (they fetch from Azure APIs)
        _httpClient.Timeout = TimeSpan.FromMinutes(5);
    }

    private async Task<bool> TriggerFunctionsRefreshAsync()
    {
        try
        {
            var functionsUrl = _configuration["AzureFunctions:BaseUrl"];
            if (string.IsNullOrEmpty(functionsUrl))
            {
                _logger.LogWarning("Azure Functions URL not configured");
                return false;
            }

            _logger.LogInformation("Triggering Azure Functions cache refresh...");
            var response = await _httpClient.PostAsync($"{functionsUrl}/api/TriggerRefresh", null);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Azure Functions refresh triggered successfully");
                // Wait a bit for function to populate data
                await Task.Delay(5000);
                return true;
            }
            
            _logger.LogWarning("Failed to trigger Azure Functions refresh: {StatusCode}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering Azure Functions refresh");
            return false;
        }
    }

    [HttpGet("check-credentials")]
    public async Task<IActionResult> CheckCredentials()
    {
        try
        {
            var globalCred = await _dbContext.GlobalAzureCredentials.FirstOrDefaultAsync(c => c.IsActive);
            
            if (globalCred == null)
            {
                return Ok(new { exists = false });
            }

            // Return stored subscription data from database - NO Azure API calls
            var subscriptionIds = JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) ?? new List<string>();
            var subscriptionNames = JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionNamesJson) ?? new List<string>();
            
            // Build subscription objects from stored IDs and names
            var subscriptions = subscriptionIds.Select((id, index) => new
            {
                subscriptionId = id,
                displayName = index < subscriptionNames.Count ? subscriptionNames[index] : id
            }).ToList();
            
            _logger.LogInformation($"Global credentials exist: {globalCred.SubscriptionCount} subscriptions stored");
            
            return Ok(new
            {
                exists = true,
                subscriptionCount = globalCred.SubscriptionCount,
                subscriptions
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking credentials");
            return Ok(new { exists = false });
        }
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
            var subscriptionIds = subscriptions.Select(s => s.SubscriptionId).ToList();
            var subscriptionNames = subscriptions.Select(s => s.DisplayName).ToList();

            // Store or update global credentials in database
            var globalCred = await _dbContext.GlobalAzureCredentials.FirstOrDefaultAsync(c => c.IsActive);
            
            if (globalCred == null)
            {
                // Create new global credentials
                globalCred = new GlobalAzureCredentials
                {
                    TenantId = credentials.TenantId!,
                    ClientId = credentials.ClientId!,
                    ClientSecret = credentials.ClientSecret!,
                    SubscriptionIdsJson = JsonSerializer.Serialize(subscriptionIds),
                    SubscriptionNamesJson = JsonSerializer.Serialize(subscriptionNames),
                    SubscriptionCount = subscriptions.Count,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };
                _dbContext.GlobalAzureCredentials.Add(globalCred);
                _logger.LogInformation($"Created new global credentials for tenant {credentials.TenantId?.Substring(0, 8)}...");
            }
            else
            {
                // Update existing global credentials
                globalCred.TenantId = credentials.TenantId!;
                globalCred.ClientId = credentials.ClientId!;
                globalCred.ClientSecret = credentials.ClientSecret!;
                globalCred.SubscriptionIdsJson = JsonSerializer.Serialize(subscriptionIds);
                globalCred.SubscriptionNamesJson = JsonSerializer.Serialize(subscriptionNames);
                globalCred.SubscriptionCount = subscriptions.Count;
                globalCred.UpdatedAt = DateTime.UtcNow;
                _logger.LogInformation($"Updated global credentials for tenant {credentials.TenantId?.Substring(0, 8)}...");
            }
            
            await _dbContext.SaveChangesAsync();

            // Trigger Functions to populate initial data (fire-and-forget - don't wait)
            _logger.LogInformation("Triggering Functions to populate cache data in background...");
            _ = Task.Run(async () => 
            {
                try 
                {
                    await TriggerFunctionsRefreshAsync();
                    _logger.LogInformation("Background Functions trigger completed");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background Functions trigger failed");
                }
            });

            return Ok(new
            {
                success = true,
                message = "Successfully connected to Azure. Loading data in background...",
                subscriptionCount = subscriptions.Count,
                subscriptions
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to Azure");
            return StatusCode(500, new { error = ex.Message });
        }
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

    [HttpPost("resources")]
    public async Task<IActionResult> GetResources([FromBody] SubscriptionRequest? request = null, [FromQuery] bool forceRefresh = false)
    {
        try
        {
            // Get global credentials
            var subscriptionIds = request?.SubscriptionIds?.Distinct().ToList();
            var credentials = await GetGlobalCredentialsAsync(subscriptionIds);
            
            if (credentials == null)
            {
                _logger.LogWarning("No global credentials configured");
                return Unauthorized(new { error = "No Azure credentials configured. Please connect first." });
            }

            var subIds = credentials.SubscriptionIds ?? new List<string>();

            // Try to get from cache first (unless forceRefresh is true)
            if (!forceRefresh && subIds.Any())
            {
                var cachedResources = await _cacheService.GetCachedResourcesAsync(subIds);
                
                if (cachedResources != null && cachedResources.Any())
                {
                    _logger.LogInformation($"Returning {cachedResources.Count} resources from cache");
                    return Ok(cachedResources);
                }
            }
            else if (forceRefresh)
            {
                _logger.LogInformation("Force refresh requested - bypassing cache");
            }

            // Only read from PostgreSQL - if empty, trigger Functions to populate
            var resources = await _cacheService.GetCachedResourcesAsync(subIds);
            if (resources == null || !resources.Any())
            {
                _logger.LogWarning("No resources in database, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                resources = await _cacheService.GetCachedResourcesAsync(subIds);
                if (resources == null || !resources.Any())
                {
                    _logger.LogWarning("No resources found after triggering refresh");
                    return Ok(new List<object>());
                }
            }
            
            return Ok(resources);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Azure resources");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("costs")]
    public async Task<IActionResult> GetCosts([FromBody] SubscriptionRequest? request = null, [FromQuery] bool forceRefresh = false)
    {
        try
        {
            // Get global credentials
            var subscriptionIds = request?.SubscriptionIds?.Distinct().ToList();
            var credentials = await GetGlobalCredentialsAsync(subscriptionIds);
            
            if (credentials == null)
            {
                _logger.LogWarning("No global credentials configured");
                return Unauthorized(new { error = "No Azure credentials configured. Please connect first." });
            }

            var subIds = credentials.SubscriptionIds ?? new List<string>();

            // Try to get from cache first (unless forceRefresh is true)
            if (!forceRefresh && subIds.Any())
            {
                var cachedCosts = await _cacheService.GetCachedCostsAsync(subIds);
                
                if (cachedCosts != null && cachedCosts.Any())
                {
                    _logger.LogInformation($"Returning costs for {cachedCosts.Count} subscriptions from cache");
                    return Ok(cachedCosts);
                }
            }
            else if (forceRefresh)
            {
                _logger.LogInformation("Force refresh requested - bypassing cache");
            }

            // Only read from PostgreSQL - if empty, trigger Functions to populate
            var costs = await _cacheService.GetCachedCostsAsync(subIds);
            if (costs == null || !costs.Any())
            {
                _logger.LogWarning("No costs in database, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                costs = await _cacheService.GetCachedCostsAsync(subIds);
                if (costs == null || !costs.Any())
                {
                    _logger.LogWarning("No costs found after triggering refresh");
                    return Ok(new List<object>());
                }
            }
            
            return Ok(costs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Azure costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("costs/monthly")]
    public async Task<IActionResult> GetMonthlyCosts([FromBody] SubscriptionRequest? request = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            // Default to last 12 months if not specified
            var start = startDate ?? DateTime.UtcNow.AddMonths(-12);
            var end = endDate ?? DateTime.UtcNow;
            
            _logger.LogInformation($"Fetching monthly costs from {start:yyyy-MM-dd} to {end:yyyy-MM-dd}");
            
            var subscriptionIds = request?.SubscriptionIds ?? new List<string>();
            
            // Create cache key with date range
            var cacheKey = $"{string.Join(",", subscriptionIds.OrderBy(s => s))}_{start:yyyyMMdd}_{end:yyyyMMdd}";
            
            // Check cache first
            var cachedCosts = await _cacheService.GetCachedMonthlyCostsAsync(subscriptionIds, start, end);
            if (cachedCosts != null && cachedCosts.Any())
            {
                _logger.LogInformation($"Returning {cachedCosts.Count} cached monthly costs");
                return Ok(cachedCosts);
            }
            
            // Only read from PostgreSQL - if empty, trigger Functions to populate
            _logger.LogWarning("No monthly costs in database, triggering Azure Function refresh...");
            await TriggerFunctionsRefreshAsync();
            
            // Retry query
            cachedCosts = await _cacheService.GetCachedMonthlyCostsAsync(subscriptionIds, start, end);
            if (cachedCosts == null || !cachedCosts.Any())
            {
                _logger.LogWarning("No monthly costs found after triggering refresh");
                return Ok(new List<object>());
            }
            
            return Ok(cachedCosts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching monthly costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("costs/resources")]
    public async Task<IActionResult> GetResourceCosts([FromBody] SubscriptionRequest? request = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            // Default to last 3 months if not specified
            var start = startDate ?? DateTime.UtcNow.AddMonths(-3);
            var end = endDate ?? DateTime.UtcNow;
            
            _logger.LogInformation($"Fetching resource costs from {start:yyyy-MM-dd} to {end:yyyy-MM-dd}");
            
            var subscriptionIds = request?.SubscriptionIds ?? new List<string>();
            
            // Try cache first for faster response
            var cachedCosts = await _cacheService.GetCachedResourceCostsAsync(subscriptionIds, start, end);
            if (cachedCosts != null && cachedCosts.Any())
            {
                _logger.LogInformation($"Returning {cachedCosts.Count} cached resource costs");
                return Ok(cachedCosts);
            }
            
            // Cache miss - make direct call to Azure Cost Management API for user-selected date range
            _logger.LogInformation($"Cache miss, fetching resource costs directly from Azure Cost Management API");
            var resourceCosts = await _azureService.GetResourceCostsAsync(credentials, start, end);
            
            if (resourceCosts == null || !resourceCosts.Any())
            {
                _logger.LogWarning("No resource costs found in Azure for the selected date range");
                return Ok(new List<object>());
            }
            
            _logger.LogInformation($"Retrieved {resourceCosts.Count} resource costs from Azure API");
            return Ok(resourceCosts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching resource costs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("recommendations")]
    public async Task<IActionResult> GetRecommendations([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            // Only read from PostgreSQL - recommendations populated by Functions
            var subscriptionIds = request?.SubscriptionIds ?? new List<string>();
            var recommendations = await _cacheService.GetCachedAIRecommendationsAsync(subscriptionIds);
            if (recommendations == null || !recommendations.Any())
            {
                _logger.LogWarning("No AI recommendations in database, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                recommendations = await _cacheService.GetCachedAIRecommendationsAsync(subscriptionIds);
                if (recommendations == null || !recommendations.Any())
                {
                    _logger.LogWarning("No AI recommendations found after triggering refresh");
                    return Ok(new List<object>());
                }
            }
            
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching security recommendations");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("ai-insights")]
    public async Task<IActionResult> GetAIInsights([FromBody] AIInsightsRequest? request = null)
    {
        try
        {
            // Get credentials from cache
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            var subscriptionIds = (request?.SubscriptionIds ?? new List<string>()).Distinct().ToList();

            if (!subscriptionIds.Any())
            {
                return BadRequest(new { error = "At least one subscription ID is required" });
            }

            // Get resources from cache ONLY
            var cachedResources = await _cacheService.GetCachedResourcesAsync(subscriptionIds);
            if (cachedResources == null || !cachedResources.Any())
            {
                _logger.LogWarning("No resources in database for AI analysis, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                cachedResources = await _cacheService.GetCachedResourcesAsync(subscriptionIds);
                if (cachedResources == null || !cachedResources.Any())
                {
                    _logger.LogWarning("No resources found after triggering refresh");
                    return BadRequest(new { error = "No resources found. Please wait and retry." });
                }
            }
            var resources = cachedResources;
            _logger.LogInformation($"Using {resources.Count} resources from database for AI analysis");

            // Get costs from cache ONLY
            var cachedCosts = await _cacheService.GetCachedCostsAsync(subscriptionIds);
            if (cachedCosts == null || !cachedCosts.Any())
            {
                _logger.LogWarning("No costs in database for AI analysis, triggering Azure Function refresh...");
                await TriggerFunctionsRefreshAsync();
                
                // Retry query
                cachedCosts = await _cacheService.GetCachedCostsAsync(subscriptionIds);
                if (cachedCosts == null || !cachedCosts.Any())
                {
                    _logger.LogWarning("No costs found after triggering refresh");
                    return BadRequest(new { error = "No costs found. Please wait and retry." });
                }
            }
            var costs = cachedCosts;
            _logger.LogInformation($"Using costs from database for {costs.Count} subscriptions for AI analysis");

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
    public async Task<IActionResult> GetAlertRules([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            // TODO: Alerts need to be cached by Functions - no cache table exists yet
            // For now, trigger Functions and return empty data
            _logger.LogWarning("Alert rules endpoint called but no cache table exists. Triggering Functions...");
            await TriggerFunctionsRefreshAsync();
            
            // Return empty until Functions populate alert cache table
            return Ok(new List<object>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching alert rules");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("aks/services")]
    public async Task<IActionResult> GetAKSServices([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            // TODO: AKS services need to be cached by Functions - no cache table exists yet
            // For now, trigger Functions and return empty data
            _logger.LogWarning("AKS services endpoint called but no cache table exists. Triggering Functions...");
            await TriggerFunctionsRefreshAsync();
            
            // Return empty until Functions populate AKS cache table
            return Ok(new List<object>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching AKS services");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("aks/pods")]
    public async Task<IActionResult> GetAKSPods([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            // TODO: AKS pods need to be cached by Functions - no cache table exists yet
            // For now, trigger Functions and return empty data
            _logger.LogWarning("AKS pods endpoint called but no cache table exists. Triggering Functions...");
            await TriggerFunctionsRefreshAsync();
            
            // Return empty until Functions populate AKS cache table
            return Ok(new List<object>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching AKS pods");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("secure-scores")]
    public async Task<IActionResult> GetSecureScores([FromBody] SubscriptionRequest? request = null)
    {
        try
        {
            var credentials = await GetGlobalCredentialsAsync(request?.SubscriptionIds);
            if (credentials == null)
            {
                return Unauthorized(new { error = "No active credentials found" });
            }

            // TODO: Secure scores need to be cached by Functions - no cache table exists yet
            // For now, trigger Functions and return empty data
            _logger.LogWarning("Secure scores endpoint called but no cache table exists. Triggering Functions...");
            await TriggerFunctionsRefreshAsync();
            
            // Return empty until Functions populate secure scores cache table
            return Ok(new List<object>());
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

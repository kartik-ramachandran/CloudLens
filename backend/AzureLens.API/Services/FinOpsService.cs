using System.Text;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using Azure.ResourceManager;
using AzureLens.API.Models;

namespace AzureLens.API.Services;

public class FinOpsService : IFinOpsService
{
    private readonly IAzureService _azureService;
    private readonly IAIService _aiService;
    private readonly ILogger<FinOpsService> _logger;

    public FinOpsService(IAzureService azureService, IAIService aiService, ILogger<FinOpsService> logger)
    {
        _azureService = azureService;
        _aiService = aiService;
        _logger = logger;
    }

    private TokenCredential GetCredential(AzureCredentials credentials)
    {
        return new ClientSecretCredential(
            credentials.TenantId,
            credentials.ClientId,
            credentials.ClientSecret
        );
    }

    public async Task<FinOpsMetrics> GetFinOpsMetricsAsync(AzureCredentials credentials)
    {
        try
        {
            var wastedTask = GetWastedResourcesAsync(credentials);
            var advisorTask = GetAdvisorRecommendationsAsync(credentials, "Cost");
            var tagTask = GetTagComplianceAsync(credentials);
            var anomalyTask = DetectCostAnomaliesAsync(credentials);

            await Task.WhenAll(wastedTask, advisorTask, tagTask, anomalyTask);

            var wasted = await wastedTask;
            var advisor = await advisorTask;
            var tags = await tagTask;
            var anomalies = await anomalyTask;

            var totalWaste = wasted.Sum(w => w.EstimatedMonthlyCost);
            var advisorSavings = advisor.Sum(a => (a.AnnualSavingsAmount ?? 0) / 12);

            return new FinOpsMetrics
            {
                TotalWaste = totalWaste,
                WastedResourceCount = wasted.Count,
                TagCoveragePercent = tags.TagCoveragePercent,
                PotentialMonthlySavings = totalWaste + advisorSavings,
                AdvisorRecommendationCount = advisor.Count,
                TopWastedResources = wasted.OrderByDescending(w => w.EstimatedMonthlyCost).Take(10).ToList(),
                TopAdvisorRecommendations = advisor.Take(10).ToList(),
                RecentAnomalies = anomalies.Take(5).ToList(),
                GeneratedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating FinOps metrics");
            throw;
        }
    }

    public async Task<List<WastedResource>> GetWastedResourcesAsync(AzureCredentials credentials)
    {
        try
        {
            var resources = await _azureService.GetResourcesAsync(credentials);
            var costs = await _azureService.GetCostsAsync(credentials);
            var wastedList = new List<WastedResource>();

            // Build cost lookup by subscription
            var costBySubscription = costs.ToDictionary(c => c.SubscriptionId, c => c.TotalCost);

            foreach (var resource in resources)
            {
                var wasteReason = DetectWasteReason(resource);
                if (wasteReason != null)
                {
                    var subscriptionCost = costBySubscription.GetValueOrDefault(resource.SubscriptionId, 0);
                    // Estimate resource cost as a fraction of subscription cost (rough heuristic)
                    var estimatedCost = EstimateResourceCost(resource, (double)subscriptionCost);

                    wastedList.Add(new WastedResource
                    {
                        ResourceId = resource.Id,
                        ResourceName = resource.Name,
                        ResourceType = resource.Type,
                        ResourceGroup = resource.ResourceGroup,
                        SubscriptionId = resource.SubscriptionId,
                        WasteReason = wasteReason,
                        EstimatedMonthlyCost = estimatedCost,
                        Recommendation = GetWasteRecommendation(wasteReason, resource.Type),
                        Severity = GetWasteSeverity(estimatedCost)
                    });
                }
            }

            return wastedList.OrderByDescending(w => w.EstimatedMonthlyCost).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting wasted resources");
            return new List<WastedResource>();
        }
    }

    public async Task<List<AdvisorRecommendation>> GetAdvisorRecommendationsAsync(AzureCredentials credentials, string? category = null)
    {
        try
        {
            var credential = GetCredential(credentials);
            var token = await credential.GetTokenAsync(
                new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);

            var recommendations = new List<AdvisorRecommendation>();
            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();

            if (!subscriptionIds.Any())
            {
                var subs = await _azureService.GetSubscriptionsAsync(credentials);
                subscriptionIds = subs.Select(s => s.SubscriptionId).ToList();
            }

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);

            foreach (var subscriptionId in subscriptionIds)
            {
                try
                {
                    var filter = category != null ? $"&$filter=category eq '{category}'" : "";
                    var url = $"https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.Advisor/recommendations?api-version=2023-01-01{filter}";
                    var response = await httpClient.GetAsync(url);

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning($"Advisor API returned {response.StatusCode} for subscription {subscriptionId}");
                        continue;
                    }

                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);

                    if (doc.RootElement.TryGetProperty("value", out var items))
                    {
                        foreach (var item in items.EnumerateArray())
                        {
                            var rec = ParseAdvisorRecommendation(item, subscriptionId);
                            if (rec != null) recommendations.Add(rec);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to get Advisor recommendations for subscription {subscriptionId}");
                }
            }

            return recommendations.OrderByDescending(r => r.AnnualSavingsAmount).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Azure Advisor recommendations");
            return new List<AdvisorRecommendation>();
        }
    }

    public async Task<List<RightsizingRecommendation>> GetRightsizingRecommendationsAsync(AzureCredentials credentials)
    {
        var advisorRecs = await GetAdvisorRecommendationsAsync(credentials, "Cost");

        return advisorRecs
            .Where(r => !string.IsNullOrEmpty(r.CurrentSku) || r.ShortDescription.Contains("right", StringComparison.OrdinalIgnoreCase)
                     || r.ShortDescription.Contains("resize", StringComparison.OrdinalIgnoreCase))
            .Select(r => new RightsizingRecommendation
            {
                ResourceId = r.ResourceId,
                ResourceName = r.ResourceName,
                ResourceType = r.ResourceType,
                SubscriptionId = r.SubscriptionId,
                CurrentSku = r.CurrentSku ?? "Unknown",
                RecommendedSku = r.RecommendedSku ?? "See recommendation",
                EstimatedMonthlySavings = (r.AnnualSavingsAmount ?? 0) / 12,
                Currency = r.SavingsCurrency ?? "USD",
                Justification = r.LongDescription,
                Impact = r.Impact,
                MigrationSteps = r.RecommendedAction ?? "Follow Azure Advisor guidance to resize this resource."
            })
            .OrderByDescending(r => r.EstimatedMonthlySavings)
            .ToList();
    }

    public async Task<List<CostAnomaly>> DetectCostAnomaliesAsync(AzureCredentials credentials)
    {
        try
        {
            var anomalies = new List<CostAnomaly>();
            var costs = await _azureService.GetCostsAsync(credentials);

            foreach (var cost in costs)
            {
                if (cost.CostsByService == null) continue;

                // Detect services with unusually high costs (simple heuristic: > 2x average per service)
                var avgCost = cost.CostsByService.Average(s => s.Cost);
                var stdDev = CalculateStdDev(cost.CostsByService.Select(s => (double)s.Cost).ToList());

                foreach (var service in cost.CostsByService)
                {
                    var zScore = stdDev > 0 ? ((double)service.Cost - (double)avgCost) / stdDev : 0;
                    if (zScore > 2.0 && service.Cost > avgCost * 2)
                    {
                        anomalies.Add(new CostAnomaly
                        {
                            SubscriptionId = cost.SubscriptionId,
                            SubscriptionName = cost.SubscriptionName,
                            ServiceName = service.ServiceName,
                            DetectedDate = DateTime.UtcNow,
                            ExpectedCost = avgCost,
                            ActualCost = service.Cost,
                            CostDelta = service.Cost - avgCost,
                            PercentageIncrease = avgCost > 0 ? (double)((service.Cost - avgCost) / avgCost * 100) : 0,
                            Severity = zScore > 3 ? "High" : "Medium",
                            PossibleCause = $"{service.ServiceName} spend is significantly above the average service cost of ${avgCost:F2}. Investigate recent deployments or scaling events.",
                            Currency = cost.Currency
                        });
                    }
                }
            }

            return anomalies.OrderByDescending(a => a.PercentageIncrease).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting cost anomalies");
            return new List<CostAnomaly>();
        }
    }

    public async Task<List<CostForecast>> GetCostForecastAsync(AzureCredentials credentials)
    {
        try
        {
            var costs = await _azureService.GetCostsAsync(credentials);
            var forecasts = new List<CostForecast>();

            foreach (var cost in costs)
            {
                var monthlyCosts = cost.MonthlyCosts ?? new List<MonthlyCost>();
                var orderedMonths = monthlyCosts.OrderBy(m => m.Month).ToList();

                // Simple linear regression for forecasting
                double avgMonthly = orderedMonths.Any() ? (double)orderedMonths.Average(m => m.Cost) : (double)cost.TotalCost;
                double trend = 0;
                if (orderedMonths.Count >= 2)
                {
                    var recent = orderedMonths.TakeLast(3).ToList();
                    if (recent.Count >= 2)
                        trend = (double)(recent.Last().Cost - recent.First().Cost) / recent.Count;
                }

                var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
                var nextMonth = DateTime.UtcNow.AddMonths(1).ToString("yyyy-MM");
                var month3 = DateTime.UtcNow.AddMonths(3).ToString("yyyy-MM");

                var currentForecast = (decimal)(avgMonthly + trend);
                var nextForecast = (decimal)(avgMonthly + trend * 2);
                var q3Forecast = (decimal)((avgMonthly + trend * 3) * 3);

                var trendPct = avgMonthly > 0 ? (trend / avgMonthly) * 100 : 0;

                forecasts.Add(new CostForecast
                {
                    SubscriptionId = cost.SubscriptionId,
                    SubscriptionName = cost.SubscriptionName,
                    CurrentMonthActual = cost.TotalCost,
                    CurrentMonthForecast = Math.Max(0, currentForecast),
                    NextMonthForecast = Math.Max(0, nextForecast),
                    Next3MonthForecast = Math.Max(0, q3Forecast),
                    Currency = cost.Currency,
                    TrendPercentage = Math.Round(trendPct, 2),
                    TrendDirection = trendPct > 5 ? "Increasing" : trendPct < -5 ? "Decreasing" : "Stable",
                    ForecastPoints = BuildForecastPoints(orderedMonths, trend, avgMonthly, cost.Currency)
                });
            }

            return forecasts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating cost forecast");
            return new List<CostForecast>();
        }
    }

    public async Task<List<BudgetData>> GetBudgetsAsync(AzureCredentials credentials)
    {
        try
        {
            var credential = GetCredential(credentials);
            var token = await credential.GetTokenAsync(
                new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);

            var budgets = new List<BudgetData>();
            var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();

            if (!subscriptionIds.Any())
            {
                var subs = await _azureService.GetSubscriptionsAsync(credentials);
                subscriptionIds = subs.Select(s => s.SubscriptionId).ToList();
            }

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);

            foreach (var subscriptionId in subscriptionIds)
            {
                try
                {
                    var url = $"https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.Consumption/budgets?api-version=2023-11-01";
                    var response = await httpClient.GetAsync(url);

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning($"Budget API returned {response.StatusCode} for subscription {subscriptionId}");
                        continue;
                    }

                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);

                    if (doc.RootElement.TryGetProperty("value", out var items))
                    {
                        foreach (var item in items.EnumerateArray())
                        {
                            var budget = ParseBudget(item, subscriptionId);
                            if (budget != null) budgets.Add(budget);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to get budgets for subscription {subscriptionId}");
                }
            }

            return budgets;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching budgets");
            return new List<BudgetData>();
        }
    }

    public async Task<TagComplianceReport> GetTagComplianceAsync(AzureCredentials credentials, List<string>? requiredTags = null)
    {
        try
        {
            var resources = await _azureService.GetResourcesAsync(credentials);
            var defaultRequiredTags = requiredTags ?? new List<string> { "Environment", "Owner", "CostCenter", "Project" };

            var violations = new List<TagViolation>();
            int taggedCount = 0;

            foreach (var resource in resources)
            {
                var missingTags = new List<string>();
                var hasTags = resource.Tags != null && resource.Tags.Any();

                foreach (var tag in defaultRequiredTags)
                {
                    if (resource.Tags == null || !resource.Tags.ContainsKey(tag))
                        missingTags.Add(tag);
                }

                if (missingTags.Count == 0) taggedCount++;

                if (missingTags.Any())
                {
                    violations.Add(new TagViolation
                    {
                        ResourceId = resource.Id,
                        ResourceName = resource.Name,
                        ResourceType = resource.Type,
                        ResourceGroup = resource.ResourceGroup,
                        MissingTags = missingTags
                    });
                }
            }

            var subscriptionId = credentials.SubscriptionIds?.FirstOrDefault() ?? "all";

            return new TagComplianceReport
            {
                SubscriptionId = subscriptionId,
                SubscriptionName = subscriptionId,
                TotalResources = resources.Count,
                TaggedResources = taggedCount,
                UntaggedResources = violations.Count,
                TagCoveragePercent = resources.Count > 0 ? Math.Round((double)taggedCount / resources.Count * 100, 1) : 0,
                RequiredTags = defaultRequiredTags,
                Violations = violations.Take(100).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating tag compliance report");
            throw;
        }
    }

    public async Task<List<AIRecommendation>> GenerateFinOpsAIInsightsAsync(AzureCredentials credentials, string insightType)
    {
        try
        {
            var resources = await _azureService.GetResourcesAsync(credentials);
            var costs = await _azureService.GetCostsAsync(credentials);
            var wasted = await GetWastedResourcesAsync(credentials);
            var advisor = await GetAdvisorRecommendationsAsync(credentials, "Cost");

            var context = new AzureFinOpsContext
            {
                ResourceCount = resources.Count,
                TotalCost = (double)costs.Sum(c => c.TotalCost),
                SubscriptionCount = credentials.SubscriptionIds?.Count ?? 1,
                ResourceTypes = resources.Select(r => r.Type).Distinct().ToList(),
                Locations = resources.Select(r => r.Location).Distinct().ToList(),
                WastedResourceCount = wasted.Count,
                EstimatedWaste = (double)wasted.Sum(w => w.EstimatedMonthlyCost),
                AdvisorSavingsOpportunity = (double)advisor.Sum(a => (a.AnnualSavingsAmount ?? 0) / 12),
                TopServices = costs.SelectMany(c => c.CostsByService ?? new List<CostByService>())
                    .GroupBy(s => s.ServiceName)
                    .OrderByDescending(g => g.Sum(s => s.Cost))
                    .Take(10)
                    .Select(g => $"{g.Key}: ${g.Sum(s => s.Cost):F0}")
                    .ToList(),
                InsightType = insightType
            };

            return await _aiService.GenerateFinOpsRecommendationsAsync(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating FinOps AI insights");
            throw;
        }
    }

    // --- Private helpers ---

    private string? DetectWasteReason(AzureResource resource)
    {
        var type = resource.Type.ToLower();

        if (type.Contains("microsoft.compute/disks") &&
            (resource.Tags == null || !resource.Tags.ContainsKey("AttachedTo")))
            return "Orphaned";

        if (type.Contains("microsoft.network/publicipaddresses") &&
            resource.Tags?.ContainsKey("DissociatedFrom") == true)
            return "Unattached";

        if (type.Contains("microsoft.compute/snapshots"))
            return "Orphaned";

        if (type.Contains("microsoft.network/loadbalancers") &&
            (resource.Tags == null || !resource.Tags.Any()))
            return "Potentially Unused";

        return null;
    }

    private decimal EstimateResourceCost(AzureResource resource, double subscriptionCost)
    {
        var type = resource.Type.ToLower();
        if (type.Contains("microsoft.compute/disks")) return (decimal)(subscriptionCost * 0.02);
        if (type.Contains("microsoft.network/publicipaddresses")) return 3.0m;
        if (type.Contains("microsoft.compute/snapshots")) return (decimal)(subscriptionCost * 0.01);
        return (decimal)(subscriptionCost * 0.005);
    }

    private string GetWasteRecommendation(string reason, string resourceType)
    {
        return reason switch
        {
            "Orphaned" => $"Delete or re-attach this {resourceType}. Orphaned resources incur ongoing costs without providing value.",
            "Unattached" => $"Release or re-associate this {resourceType}. Unattached resources still incur hourly charges.",
            "Potentially Unused" => $"Review this {resourceType}. If not actively used, consider deleting to reduce cost.",
            _ => "Review resource utilization and consider deleting if no longer needed."
        };
    }

    private string GetWasteSeverity(decimal cost) =>
        cost > 100 ? "High" : cost > 20 ? "Medium" : "Low";

    private AdvisorRecommendation? ParseAdvisorRecommendation(JsonElement item, string subscriptionId)
    {
        try
        {
            if (!item.TryGetProperty("properties", out var props)) return null;

            var category = props.TryGetProperty("category", out var cat) ? cat.GetString() ?? "" : "";
            var impact = props.TryGetProperty("impact", out var imp) ? imp.GetString() ?? "" : "";
            var resourceId = props.TryGetProperty("resourceMetadata", out var rm) &&
                             rm.TryGetProperty("resourceId", out var rid) ? rid.GetString() ?? "" : "";
            var shortDesc = props.TryGetProperty("shortDescription", out var sd) &&
                            sd.TryGetProperty("problem", out var prob) ? prob.GetString() ?? "" : "";
            var longDesc = props.TryGetProperty("shortDescription", out var sd2) &&
                           sd2.TryGetProperty("solution", out var sol) ? sol.GetString() ?? "" : "";

            decimal? savings = null;
            string? currency = null;
            if (props.TryGetProperty("extendedProperties", out var extProps))
            {
                if (extProps.TryGetProperty("annualSavingsAmount", out var savingsEl))
                    decimal.TryParse(savingsEl.GetString(), out var s) ;
                if (extProps.TryGetProperty("savingsCurrency", out var currEl))
                    currency = currEl.GetString();
                if (extProps.TryGetProperty("annualSavingsAmount", out var annualEl))
                {
                    if (annualEl.ValueKind == JsonValueKind.Number)
                        savings = annualEl.GetDecimal();
                    else if (annualEl.ValueKind == JsonValueKind.String)
                        decimal.TryParse(annualEl.GetString(), out var parsedSavings);
                }
            }

            var resourceName = resourceId.Split('/').LastOrDefault() ?? "";
            var resourceType = item.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";

            return new AdvisorRecommendation
            {
                Id = item.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "",
                Name = item.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
                Category = category,
                Impact = impact,
                ShortDescription = shortDesc,
                LongDescription = longDesc,
                ResourceId = resourceId,
                ResourceName = resourceName,
                ResourceType = resourceType,
                SubscriptionId = subscriptionId,
                AnnualSavingsAmount = savings,
                SavingsCurrency = currency ?? "USD",
                RecommendedAction = longDesc
            };
        }
        catch
        {
            return null;
        }
    }

    private BudgetData? ParseBudget(JsonElement item, string subscriptionId)
    {
        try
        {
            if (!item.TryGetProperty("properties", out var props)) return null;

            var amount = props.TryGetProperty("amount", out var amt) ? amt.GetDecimal() : 0m;
            var currentSpend = 0m;
            if (props.TryGetProperty("currentSpend", out var spend) &&
                spend.TryGetProperty("amount", out var spendAmt))
                currentSpend = spendAmt.GetDecimal();

            var forecastSpend = currentSpend * 1.1m; // simple estimate

            return new BudgetData
            {
                BudgetId = item.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "",
                BudgetName = item.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
                SubscriptionId = subscriptionId,
                BudgetAmount = amount,
                CurrentSpend = currentSpend,
                ForecastedSpend = forecastSpend,
                Currency = "USD",
                UtilizationPercent = amount > 0 ? Math.Round((double)(currentSpend / amount * 100), 1) : 0
            };
        }
        catch
        {
            return null;
        }
    }

    private double CalculateStdDev(List<double> values)
    {
        if (values.Count < 2) return 0;
        var avg = values.Average();
        var variance = values.Sum(v => Math.Pow(v - avg, 2)) / (values.Count - 1);
        return Math.Sqrt(variance);
    }

    private List<MonthlyForecastPoint> BuildForecastPoints(List<MonthlyCost> actuals, double trend, double avg, string currency)
    {
        var points = actuals.Select(m => new MonthlyForecastPoint
        {
            Month = m.Month,
            Amount = m.Cost,
            IsActual = true,
            Currency = currency
        }).ToList();

        // Add 3 forecast months
        for (int i = 1; i <= 3; i++)
        {
            var month = DateTime.UtcNow.AddMonths(i).ToString("yyyy-MM");
            if (!points.Any(p => p.Month == month))
            {
                points.Add(new MonthlyForecastPoint
                {
                    Month = month,
                    Amount = (decimal)Math.Max(0, avg + trend * (i + 1)),
                    IsActual = false,
                    Currency = currency
                });
            }
        }

        return points.OrderBy(p => p.Month).ToList();
    }

    public async Task<BulkTagResult> ApplyBulkTagsAsync(AzureCredentials credentials, BulkTagRequest request)
    {
        var result = new BulkTagResult
        {
            TotalResources = request.ResourceIds.Count
        };

        var credential = GetCredential(credentials);
        var armClient = new ArmClient(credential);

        foreach (var resourceId in request.ResourceIds)
        {
            try
            {
                // Get the resource
                var resourceIdentifier = new Azure.Core.ResourceIdentifier(resourceId);
                var genericResource = armClient.GetGenericResource(resourceIdentifier);
                var resource = await genericResource.GetAsync();

                // Prepare tags
                var updatedTags = request.ReplaceExisting 
                    ? new Dictionary<string, string>(request.Tags)
                    : new Dictionary<string, string>(resource.Value.Data.Tags ?? new Dictionary<string, string>());

                if (!request.ReplaceExisting)
                {
                    foreach (var tag in request.Tags)
                    {
                        updatedTags[tag.Key] = tag.Value;
                    }
                }

                // Update the resource with new tags
                var updateData = resource.Value.Data;
                updateData.Tags.Clear();
                foreach (var tag in updatedTags)
                {
                    updateData.Tags.Add(tag.Key, tag.Value);
                }

                await genericResource.UpdateAsync(Azure.WaitUntil.Completed, updateData);

                result.SuccessCount++;
                result.SuccessfulResources.Add(resourceId);
            }
            catch (Exception ex)
            {
                result.FailureCount++;
                result.Failures.Add(new TagOperationFailure
                {
                    ResourceId = resourceId,
                    ResourceName = resourceId.Split('/').LastOrDefault() ?? resourceId,
                    ErrorMessage = ex.Message
                });
            }
        }

        return result;
    }

    public async Task<byte[]> ExportTagViolationsToCsvAsync(AzureCredentials credentials, List<string>? requiredTags = null)
    {
        var tagReport = await GetTagComplianceAsync(credentials, requiredTags);

        using var memoryStream = new System.IO.MemoryStream();
        using var writer = new System.IO.StreamWriter(memoryStream);

        // Write CSV header
        await writer.WriteLineAsync("Resource ID,Resource Name,Resource Type,Resource Group,Subscription,Missing Tags");

        // Write violations
        foreach (var violation in tagReport.Violations)
        {
            var line = $"\"{violation.ResourceId}\",\"{violation.ResourceName}\",\"{violation.ResourceType}\",\"{violation.ResourceGroup}\",\"{tagReport.SubscriptionName}\",\"{string.Join(", ", violation.MissingTags)}\"";
            await writer.WriteLineAsync(line);
        }

        await writer.FlushAsync();
        return memoryStream.ToArray();
    }

    public async Task<List<TagSuggestion>> GetAITagSuggestionsAsync(AzureCredentials credentials, List<string> resourceIds)
    {
        var suggestions = new List<TagSuggestion>();
        var credential = GetCredential(credentials);
        var armClient = new ArmClient(credential);

        foreach (var resourceId in resourceIds)
        {
            try
            {
                // Get resource details
                var resourceIdentifier = new Azure.Core.ResourceIdentifier(resourceId);
                var genericResource = armClient.GetGenericResource(resourceIdentifier);
                var resource = await genericResource.GetAsync();

                var resourceName = resource.Value.Data.Name;
                var resourceType = resource.Value.Data.ResourceType.ToString();
                var resourceGroup = resourceIdentifier.ResourceGroupName ?? "";

                    // Generate AI suggestions based on patterns
                    var suggestedTags = new Dictionary<string, string>();
                    var reasoning = new List<string>();

                    // Environment inference from resource name
                    if (resourceName.Contains("prod", StringComparison.OrdinalIgnoreCase) || 
                        resourceName.Contains("production", StringComparison.OrdinalIgnoreCase))
                    {
                        suggestedTags["Environment"] = "Production";
                        reasoning.Add("Resource name contains 'prod'");
                    }
                    else if (resourceName.Contains("dev", StringComparison.OrdinalIgnoreCase) || 
                             resourceName.Contains("development", StringComparison.OrdinalIgnoreCase))
                    {
                        suggestedTags["Environment"] = "Development";
                        reasoning.Add("Resource name contains 'dev'");
                    }
                    else if (resourceName.Contains("test", StringComparison.OrdinalIgnoreCase) || 
                             resourceName.Contains("qa", StringComparison.OrdinalIgnoreCase))
                    {
                        suggestedTags["Environment"] = "Test";
                        reasoning.Add("Resource name contains 'test' or 'qa'");
                    }
                    else if (resourceName.Contains("staging", StringComparison.OrdinalIgnoreCase) || 
                             resourceName.Contains("stg", StringComparison.OrdinalIgnoreCase))
                    {
                        suggestedTags["Environment"] = "Staging";
                        reasoning.Add("Resource name contains 'staging'");
                    }

                // Project inference from resource group
                if (!string.IsNullOrEmpty(resourceGroup))
                {
                    suggestedTags["Project"] = resourceGroup;
                    reasoning.Add($"Inherited from resource group: {resourceGroup}");
                }

                suggestions.Add(new TagSuggestion
                {
                    ResourceId = resourceId,
                    ResourceName = resourceName,
                    ResourceType = resourceType,
                    SuggestedTags = suggestedTags,
                    Reasoning = string.Join("; ", reasoning),
                    ConfidenceScore = reasoning.Count > 0 ? 0.7 : 0.3
                });
            }
            catch (Exception ex)
            {
                // Skip resources that can't be accessed
                _logger.LogWarning($"Error getting suggestions for {resourceId}: {ex.Message}");
            }
        }

        return suggestions;
    }
}


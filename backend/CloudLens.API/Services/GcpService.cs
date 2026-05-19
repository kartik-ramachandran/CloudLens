using System.Net.Http.Headers;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IGcpService
{
    Task<List<CloudCostSummary>> GetCostsAsync(GcpCredentials credentials);
}

public class GcpService : IGcpService
{
    private readonly ILogger<GcpService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    private static readonly string[] GcpScopes = new[]
    {
        "https://www.googleapis.com/auth/cloud-billing.readonly",
        "https://www.googleapis.com/auth/cloudplatformprojects.readonly"
    };

    public GcpService(ILogger<GcpService> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<List<CloudCostSummary>> GetCostsAsync(GcpCredentials credentials)
    {
        // Authenticate using service account JSON
        var googleCred = GoogleCredential.FromJson(credentials.ServiceAccountJson)
            .CreateScoped(GcpScopes);
        var token = await googleCred.UnderlyingCredential.GetAccessTokenForRequestAsync();

        using var http = _httpClientFactory.CreateClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Resolve project list
        var projectIds = credentials.ProjectIds ?? new List<string>();
        if (!projectIds.Any())
            projectIds = await ListProjectsAsync(http);

        _logger.LogInformation("Fetching GCP costs for {count} projects", projectIds.Count);

        var results = new List<CloudCostSummary>();
        var endDate   = DateTime.UtcNow.Date;
        var startDate = endDate.AddMonths(-12);

        foreach (var projectId in projectIds)
        {
            try
            {
                var summary = await GetProjectCostAsync(http, projectId, startDate, endDate);
                if (summary != null) results.Add(summary);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get costs for GCP project {project}", projectId);
            }
        }

        return results;
    }

    private async Task<List<string>> ListProjectsAsync(HttpClient http)
    {
        var url = "https://cloudresourcemanager.googleapis.com/v1/projects?filter=lifecycleState:ACTIVE";
        var response = await http.GetAsync(url);
        if (!response.IsSuccessStatusCode) return new List<string>();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var projects = new List<string>();
        if (doc.RootElement.TryGetProperty("projects", out var arr))
        {
            foreach (var proj in arr.EnumerateArray())
            {
                if (proj.TryGetProperty("projectId", out var id))
                    projects.Add(id.GetString()!);
            }
        }
        _logger.LogInformation("Discovered {count} GCP projects", projects.Count);
        return projects;
    }

    private async Task<CloudCostSummary?> GetProjectCostAsync(HttpClient http, string projectId, DateTime startDate, DateTime endDate)
    {
        // GCP Cloud Billing Budget API — get billing account for the project first
        var billingUrl = $"https://cloudbilling.googleapis.com/v1/projects/{projectId}/billingInfo";
        var billingResp = await http.GetAsync(billingUrl);
        if (!billingResp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Cannot get billing info for project {project}: {status}", projectId, billingResp.StatusCode);
            return null;
        }

        var billingJson = await billingResp.Content.ReadAsStringAsync();
        using var billingDoc = JsonDocument.Parse(billingJson);
        string billingAccountName = "";
        if (billingDoc.RootElement.TryGetProperty("billingAccountName", out var ban))
            billingAccountName = ban.GetString() ?? "";

        if (string.IsNullOrEmpty(billingAccountName))
        {
            _logger.LogWarning("Project {project} has no billing account attached", projectId);
            return null;
        }

        // Use Cloud Billing v1beta to get cost data via Reports API
        // billingAccountName format: "billingAccounts/XXXXXX-XXXXXX-XXXXXX"
        var reportsUrl = $"https://cloudbilling.googleapis.com/v1beta/{billingAccountName}/reports" +
            $"?dateRange.invoiceMonth.year={startDate.Year}" +
            $"&dateRange.invoiceMonth.month={startDate.Month}" +
            $"&projects={projectId}";

        var costResp = await http.GetAsync(reportsUrl);
        if (!costResp.IsSuccessStatusCode)
        {
            // Fall back to budgets API to at least get budget amounts
            return await GetProjectCostFromBudgetsAsync(http, billingAccountName, projectId, startDate, endDate);
        }

        var costJson = await costResp.Content.ReadAsStringAsync();
        return ParseCostReports(costJson, projectId, startDate, endDate);
    }

    private async Task<CloudCostSummary?> GetProjectCostFromBudgetsAsync(HttpClient http, string billingAccountName, string projectId, DateTime startDate, DateTime endDate)
    {
        // Fall back: list budgets for the billing account to show spend vs budget
        var budgetUrl = $"https://billingbudgets.googleapis.com/v1/{billingAccountName}/budgets";
        var resp = await http.GetAsync(budgetUrl);
        if (!resp.IsSuccessStatusCode) return null;

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var summary = new CloudCostSummary
        {
            AccountId   = projectId,
            AccountName = projectId,
            StartDate   = startDate,
            EndDate     = endDate,
            Currency    = "USD"
        };

        if (doc.RootElement.TryGetProperty("budgets", out var budgets))
        {
            foreach (var budget in budgets.EnumerateArray())
            {
                if (budget.TryGetProperty("displayName", out var name) &&
                    budget.TryGetProperty("amount", out var amount) &&
                    amount.TryGetProperty("specifiedAmount", out var specified) &&
                    specified.TryGetProperty("units", out var units))
                {
                    var cost = decimal.TryParse(units.GetString(), out var d) ? d : 0m;
                    summary.TotalCost += cost;
                    summary.CostsByService.Add(new CloudCostByService
                    {
                        ServiceName = name.GetString() ?? "Budget",
                        Cost = cost
                    });
                }
            }
        }

        return summary.TotalCost > 0 ? summary : null;
    }

    private CloudCostSummary? ParseCostReports(string json, string projectId, DateTime startDate, DateTime endDate)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var summary = new CloudCostSummary
            {
                AccountId   = projectId,
                AccountName = projectId,
                StartDate   = startDate,
                EndDate     = endDate,
                Currency    = "USD"
            };

            // Parse cost report response structure
            if (doc.RootElement.TryGetProperty("costRecords", out var records))
            {
                foreach (var record in records.EnumerateArray())
                {
                    decimal cost = 0;
                    string service = "Unknown";
                    string month = "";
                    string currency = "USD";

                    if (record.TryGetProperty("amount", out var amtEl) &&
                        amtEl.TryGetProperty("units", out var units))
                        decimal.TryParse(units.GetString(), out cost);

                    if (record.TryGetProperty("service", out var svcEl) &&
                        svcEl.TryGetProperty("description", out var desc))
                        service = desc.GetString() ?? "Unknown";

                    if (record.TryGetProperty("month", out var monthEl))
                        month = $"{monthEl.GetProperty("year").GetInt32()}-{monthEl.GetProperty("month").GetInt32():D2}";

                    if (record.TryGetProperty("amount", out var amtEl2) &&
                        amtEl2.TryGetProperty("currencyCode", out var cc))
                        currency = cc.GetString() ?? "USD";

                    summary.TotalCost += cost;
                    summary.Currency = currency;

                    var svc = summary.CostsByService.FirstOrDefault(s => s.ServiceName == service);
                    if (svc == null) { svc = new CloudCostByService { ServiceName = service }; summary.CostsByService.Add(svc); }
                    svc.Cost += cost;

                    if (!string.IsNullOrEmpty(month))
                    {
                        var mc = summary.MonthlyCosts.FirstOrDefault(m => m.Month == month);
                        if (mc == null) { mc = new CloudMonthlyCost { Month = month, Currency = currency }; summary.MonthlyCosts.Add(mc); }
                        mc.Cost += cost;
                    }
                }
            }

            summary.CostsByService = summary.CostsByService.OrderByDescending(s => s.Cost).ToList();
            summary.MonthlyCosts   = summary.MonthlyCosts.OrderBy(m => m.Month).ToList();
            return summary;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse GCP cost report for project {project}", projectId);
            return null;
        }
    }
}

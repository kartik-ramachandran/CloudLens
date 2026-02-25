using System.Net.Http.Headers;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using AzureLens.API.Models;
using Microsoft.Extensions.Logging;

namespace AzureLens.API.Services;

public class ChangeManagementService : IChangeManagementService
{
    private readonly ILogger<ChangeManagementService> _logger;

    public ChangeManagementService(ILogger<ChangeManagementService> logger) => _logger = logger;

    private static ClientSecretCredential GetCredential(AzureCredentials c) =>
        new(c.TenantId, c.ClientId, c.ClientSecret);

    public async Task<ChangeManagementReport> GetActivityLogAsync(AzureCredentials credentials, int days = 30)
    {
        var allEvents = new List<ActivityLogEvent>();
        var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
        try
        {
            var credential = GetCredential(credentials);
            var token = await credential.GetTokenAsync(
                new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);

            var startDate = DateTime.UtcNow.AddDays(-days).ToString("yyyy-MM-ddTHH:mm:ssZ");
            var endDate = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

            foreach (var subId in subscriptionIds)
            {
                try
                {
                    var filter = Uri.EscapeDataString(
                        $"eventTimestamp ge '{startDate}' and eventTimestamp le '{endDate}'");
                    var url = $"https://management.azure.com/subscriptions/{subId}/providers/microsoft.insights/eventtypes/management/values?api-version=2015-04-01&$filter={filter}&$select=eventTimestamp,operationName,resourceId,caller,status,category,description";
                    var resp = await http.GetAsync(url);
                    if (!resp.IsSuccessStatusCode) continue;

                    var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                    if (!doc.RootElement.TryGetProperty("value", out var arr)) continue;

                    foreach (var item in arr.EnumerateArray())
                    {
                        var opName = item.TryGetProperty("operationName", out var op) && op.TryGetProperty("value", out var opV) ? opV.GetString() ?? "" : "";
                        var opLower = opName.ToLowerInvariant();
                        var isWrite = opLower.Contains("/write");
                        var isDelete = opLower.Contains("/delete");
                        if (!isWrite && !isDelete) continue;

                        var resourceId = item.TryGetProperty("resourceId", out var rid) ? rid.GetString() ?? "" : "";
                        var caller = item.TryGetProperty("caller", out var cal) ? cal.GetString() ?? "" : "";
                        var status = item.TryGetProperty("status", out var st) && st.TryGetProperty("value", out var stV) ? stV.GetString() ?? "" : "";
                        var timestamp = item.TryGetProperty("eventTimestamp", out var ts) ? ts.GetString() ?? "" : "";
                        var category = item.TryGetProperty("category", out var cat) && cat.TryGetProperty("value", out var catV) ? catV.GetString() ?? "" : "";

                        var parts = resourceId.Split('/');
                        var resourceName = parts.Length > 0 ? parts[^1] : resourceId;
                        var resourceType = parts.Length >= 8 ? $"{parts[6]}/{parts[7]}" : "";
                        var rgIdx = Array.FindIndex(parts, p => p.Equals("resourceGroups", StringComparison.OrdinalIgnoreCase));
                        var rg = rgIdx >= 0 && rgIdx + 1 < parts.Length ? parts[rgIdx + 1] : "";

                        allEvents.Add(new ActivityLogEvent
                        {
                            EventId = Guid.NewGuid().ToString(),
                            OperationName = opName,
                            ResourceId = resourceId,
                            ResourceName = resourceName,
                            ResourceType = resourceType,
                            ResourceGroup = rg,
                            SubscriptionId = subId,
                            Caller = caller,
                            Status = status,
                            EventTimestamp = timestamp,
                            Category = category,
                            Description = opName,
                            IsWrite = isWrite,
                            IsDelete = isDelete
                        });
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Activity log error for {Sub}", subId); }
            }
        }
        catch (Exception ex) { _logger.LogError(ex, "Error in change management"); }

        var topActors = allEvents
            .Where(e => !string.IsNullOrEmpty(e.Caller))
            .GroupBy(e => e.Caller)
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => $"{g.Key} ({g.Count()} changes)")
            .ToList();

        return new ChangeManagementReport
        {
            Events = allEvents.OrderByDescending(e => e.EventTimestamp).Take(500).ToList(),
            TotalChanges = allEvents.Count,
            WriteOperations = allEvents.Count(e => e.IsWrite),
            DeleteOperations = allEvents.Count(e => e.IsDelete),
            TopActors = topActors
        };
    }
}

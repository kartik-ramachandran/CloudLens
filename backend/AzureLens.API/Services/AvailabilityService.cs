using System.Net.Http.Headers;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using AzureLens.API.Models;
using Microsoft.Extensions.Logging;

namespace AzureLens.API.Services;

public class AvailabilityService : IAvailabilityService
{
    private readonly ILogger<AvailabilityService> _logger;

    public AvailabilityService(ILogger<AvailabilityService> logger) => _logger = logger;

    private static ClientSecretCredential GetCredential(AzureCredentials c) =>
        new(c.TenantId, c.ClientId, c.ClientSecret);

    public async Task<AvailabilityReport> GetAvailabilityReportAsync(AzureCredentials credentials)
    {
        var healthEvents = new List<ServiceHealthEvent>();
        var backupItems = new List<BackupStatusItem>();
        var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
        try
        {
            var cred = GetCredential(credentials);
            var token = await cred.GetTokenAsync(
                new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);

            foreach (var subId in subscriptionIds)
            {
                // Service Health
                try
                {
                    var resp = await http.GetAsync(
                        $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.ResourceHealth/events?api-version=2022-10-01");
                    if (resp.IsSuccessStatusCode)
                    {
                        var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                        if (doc.RootElement.TryGetProperty("value", out var arr))
                            foreach (var item in arr.EnumerateArray())
                            {
                                var p = item.TryGetProperty("properties", out var pp) ? pp : item;
                                healthEvents.Add(new ServiceHealthEvent
                                {
                                    EventId = item.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
                                    Title = p.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "",
                                    ServiceName = p.TryGetProperty("service", out var s) ? s.GetString() ?? "" : "",
                                    Region = p.TryGetProperty("region", out var r) ? r.GetString() ?? "" : "",
                                    Status = p.TryGetProperty("status", out var st) ? st.GetString() ?? "" : "",
                                    EventType = p.TryGetProperty("eventType", out var et) ? et.GetString() ?? "" : "",
                                    StartTime = p.TryGetProperty("impactStartTime", out var start) ? start.GetString() ?? "" : "",
                                    EndTime = p.TryGetProperty("impactMitigationTime", out var end) ? end.GetString() : null,
                                    Level = p.TryGetProperty("level", out var lvl) ? lvl.GetString() ?? "" : "",
                                    Summary = p.TryGetProperty("summary", out var sum) ? sum.GetString() ?? "" : ""
                                });
                            }
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Service health error for {Sub}", subId); }

                // Recovery Services Vaults
                try
                {
                    var resp = await http.GetAsync(
                        $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.RecoveryServices/vaults?api-version=2023-01-01");
                    if (resp.IsSuccessStatusCode)
                    {
                        var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                        if (doc.RootElement.TryGetProperty("value", out var arr))
                            foreach (var vault in arr.EnumerateArray())
                            {
                                var vaultId = vault.TryGetProperty("id", out var vid) ? vid.GetString() ?? "" : "";
                                var vaultName = vault.TryGetProperty("name", out var vn) ? vn.GetString() ?? "" : "";
                                var parts = vaultId.Split('/');
                                var rgIdx = Array.FindIndex(parts, p => p.Equals("resourceGroups", StringComparison.OrdinalIgnoreCase));
                                var rg = rgIdx >= 0 && rgIdx + 1 < parts.Length ? parts[rgIdx + 1] : "";
                                backupItems.Add(new BackupStatusItem
                                {
                                    ResourceId = vaultId, ResourceName = vaultName,
                                    ResourceType = "Microsoft.RecoveryServices/vaults",
                                    SubscriptionId = subId, ResourceGroup = rg,
                                    HasBackup = true, VaultName = vaultName, BackupStatus = "Active"
                                });
                            }
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Backup vault error for {Sub}", subId); }
            }
        }
        catch (Exception ex) { _logger.LogError(ex, "Error in availability report"); }

        var withBackup = backupItems.Count(b => b.HasBackup);
        var total = backupItems.Count;
        return new AvailabilityReport
        {
            ServiceHealthEvents = healthEvents,
            BackupStatuses = backupItems,
            ResourcesWithBackup = withBackup,
            ResourcesWithoutBackup = total - withBackup,
            BackupCoveragePercent = total > 0 ? (int)Math.Round((double)withBackup / total * 100) : 0,
            ActiveIncidents = healthEvents.Count(e => string.IsNullOrEmpty(e.EndTime))
        };
    }
}

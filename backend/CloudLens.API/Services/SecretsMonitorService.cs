using System.Net.Http.Headers;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using CloudLens.API.Models;

namespace CloudLens.API.Services;

public class SecretsMonitorService : ISecretsMonitorService
{
    private readonly ILogger<SecretsMonitorService> _logger;

    public SecretsMonitorService(ILogger<SecretsMonitorService> logger) => _logger = logger;

    private static ClientSecretCredential GetCredential(AzureCredentials c) =>
        new(c.TenantId, c.ClientId, c.ClientSecret);

    // ── App Registration Secrets ──────────────────────────────────────────────

    public async Task<AppSecretsReport> GetAppSecretsReportAsync(AzureCredentials credentials)
    {
        var secrets = new List<AppSecretInfo>();
        try
        {
            var cred = GetCredential(credentials);
            var token = await cred.GetTokenAsync(
                new TokenRequestContext(new[] { "https://graph.microsoft.com/.default" }), default);

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);

            // Page through all app registrations
            var nextUrl = "https://graph.microsoft.com/v1.0/applications?$select=id,appId,displayName,passwordCredentials&$top=999";
            while (!string.IsNullOrEmpty(nextUrl))
            {
                var resp = await http.GetAsync(nextUrl);
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Graph API returned {StatusCode} for applications", resp.StatusCode);
                    break;
                }

                var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("value", out var apps))
                {
                    foreach (var app in apps.EnumerateArray())
                    {
                        var appObjectId = app.TryGetProperty("id", out var oid) ? oid.GetString() ?? "" : "";
                        var appId = app.TryGetProperty("appId", out var aid) ? aid.GetString() ?? "" : "";
                        var displayName = app.TryGetProperty("displayName", out var dn) ? dn.GetString() ?? "" : "";

                        if (!app.TryGetProperty("passwordCredentials", out var creds)) continue;
                        foreach (var pc in creds.EnumerateArray())
                        {
                            var secretId = pc.TryGetProperty("keyId", out var kid) ? kid.GetString() ?? "" : "";
                            var hint = pc.TryGetProperty("displayName", out var sh) ? sh.GetString() ?? "" : "(unnamed)";
                            var expiryStr = pc.TryGetProperty("endDateTime", out var ed) ? ed.GetString() : null;

                            int daysUntil = 0;
                            string status;
                            if (expiryStr != null && DateTime.TryParse(expiryStr, out var expiry))
                            {
                                daysUntil = (int)(expiry.ToUniversalTime() - DateTime.UtcNow).TotalDays;
                                status = daysUntil < 0 ? "expired"
                                       : daysUntil <= 30 ? "expiring_soon"
                                       : daysUntil <= 90 ? "expiring_90d"
                                       : "healthy";
                            }
                            else
                            {
                                status = "no_expiry";
                            }

                            secrets.Add(new AppSecretInfo
                            {
                                AppObjectId = appObjectId,
                                AppId = appId,
                                DisplayName = displayName,
                                SecretId = secretId,
                                SecretDisplayName = hint,
                                ExpiryDate = expiryStr,
                                DaysUntilExpiry = daysUntil,
                                Status = status,
                            });
                        }
                    }
                }

                nextUrl = doc.RootElement.TryGetProperty("@odata.nextLink", out var nl) ? nl.GetString() ?? "" : "";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching app registration secrets");
        }

        var appIds = secrets.Select(s => s.AppObjectId).Distinct().Count();
        return new AppSecretsReport
        {
            TotalApps = appIds,
            TotalSecrets = secrets.Count,
            ExpiredSecrets = secrets.Count(s => s.Status == "expired"),
            ExpiringSoon30d = secrets.Count(s => s.Status is "expired" or "expiring_soon"),
            ExpiringSoon90d = secrets.Count(s => s.Status is "expired" or "expiring_soon" or "expiring_90d"),
            HealthySecrets = secrets.Count(s => s.Status == "healthy"),
            Secrets = secrets.OrderBy(s => s.DaysUntilExpiry).ToList(),
        };
    }

    // ── Key Vault Expiry ──────────────────────────────────────────────────────

    public async Task<KeyVaultExpiryReport> GetKeyVaultExpiryReportAsync(AzureCredentials credentials)
    {
        var items = new List<KeyVaultExpiryItem>();
        var vaultNames = new HashSet<string>();
        var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();

        try
        {
            var cred = GetCredential(credentials);

            // Get ARM token for listing vaults
            var armToken = await cred.GetTokenAsync(
                new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);

            // Get Key Vault data plane token for listing secrets/certs
            var kvToken = await cred.GetTokenAsync(
                new TokenRequestContext(new[] { "https://vault.azure.net/.default" }), default);

            using var http = new HttpClient();

            foreach (var subId in subscriptionIds)
            {
                http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", armToken.Token);
                var vaultsResp = await http.GetAsync(
                    $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.KeyVault/vaults?api-version=2023-07-01");

                if (!vaultsResp.IsSuccessStatusCode) continue;

                var vaultsDoc = JsonDocument.Parse(await vaultsResp.Content.ReadAsStringAsync());
                if (!vaultsDoc.RootElement.TryGetProperty("value", out var vaultsArr)) continue;

                foreach (var vault in vaultsArr.EnumerateArray())
                {
                    var vaultId = vault.TryGetProperty("id", out var vid) ? vid.GetString() ?? "" : "";
                    var vaultName = vault.TryGetProperty("name", out var vn) ? vn.GetString() ?? "" : "";
                    if (string.IsNullOrEmpty(vaultName)) continue;

                    var vaultProps = vault.TryGetProperty("properties", out var vp) ? vp : vault;
                    var vaultUri = vaultProps.TryGetProperty("vaultUri", out var vu) ? vu.GetString() ?? $"https://{vaultName}.vault.azure.net/" : $"https://{vaultName}.vault.azure.net/";

                    var parts = vaultId.Split('/');
                    var rgIdx = Array.FindIndex(parts, p => p.Equals("resourceGroups", StringComparison.OrdinalIgnoreCase));
                    var rg = rgIdx >= 0 && rgIdx + 1 < parts.Length ? parts[rgIdx + 1] : "";

                    vaultNames.Add(vaultName);

                    // Switch to KV data plane token
                    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", kvToken.Token);

                    // Secrets
                    await FetchKvItems(http, vaultUri, vaultName, vaultId, rg, subId, "secret", items);

                    // Certificates
                    await FetchKvItems(http, vaultUri, vaultName, vaultId, rg, subId, "certificate", items);

                    // Restore ARM token for next vault listing
                    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", armToken.Token);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Key Vault expiry data");
        }

        return new KeyVaultExpiryReport
        {
            TotalVaults = vaultNames.Count,
            TotalItems = items.Count,
            ExpiredItems = items.Count(i => i.Status == "expired"),
            ExpiringSoon30d = items.Count(i => i.Status is "expired" or "expiring_soon"),
            ExpiringSoon90d = items.Count(i => i.Status is "expired" or "expiring_soon" or "expiring_90d"),
            HealthyItems = items.Count(i => i.Status == "healthy"),
            NoExpiryItems = items.Count(i => i.Status == "no_expiry"),
            Items = items.OrderBy(i => i.DaysUntilExpiry).ToList(),
        };
    }

    private async Task FetchKvItems(
        HttpClient http, string vaultUri, string vaultName, string vaultId,
        string rg, string subId, string itemType, List<KeyVaultExpiryItem> items)
    {
        try
        {
            var endpoint = itemType == "certificate" ? "certificates" : "secrets";
            var resp = await http.GetAsync($"{vaultUri.TrimEnd('/')}/{endpoint}?api-version=7.4&maxresults=25");
            if (!resp.IsSuccessStatusCode) return;

            var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("value", out var arr)) return;

            foreach (var entry in arr.EnumerateArray())
            {
                // Skip managed secrets (auto-managed by certificate)
                if (itemType == "secret" &&
                    entry.TryGetProperty("managed", out var mgd) && mgd.ValueKind == JsonValueKind.True)
                    continue;

                var itemId = entry.TryGetProperty("id", out var iid) ? iid.GetString() ?? "" : "";
                var itemName = itemId.Split('/').LastOrDefault() ?? "";

                string? expiryStr = null;
                if (entry.TryGetProperty("attributes", out var attrs) &&
                    attrs.TryGetProperty("exp", out var expUnix) &&
                    expUnix.ValueKind == JsonValueKind.Number)
                {
                    var expiry = DateTimeOffset.FromUnixTimeSeconds(expUnix.GetInt64()).UtcDateTime;
                    expiryStr = expiry.ToString("O");
                    var daysUntil = (int)(expiry - DateTime.UtcNow).TotalDays;
                    var status = daysUntil < 0 ? "expired"
                               : daysUntil <= 30 ? "expiring_soon"
                               : daysUntil <= 90 ? "expiring_90d"
                               : "healthy";

                    items.Add(new KeyVaultExpiryItem
                    {
                        VaultName = vaultName, VaultId = vaultId, ResourceGroup = rg, SubscriptionId = subId,
                        ItemName = itemName, ItemType = itemType,
                        ExpiryDate = expiryStr, DaysUntilExpiry = daysUntil, Status = status,
                    });
                }
                else
                {
                    items.Add(new KeyVaultExpiryItem
                    {
                        VaultName = vaultName, VaultId = vaultId, ResourceGroup = rg, SubscriptionId = subId,
                        ItemName = itemName, ItemType = itemType,
                        ExpiryDate = null, DaysUntilExpiry = int.MaxValue, Status = "no_expiry",
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not fetch {Type}s from vault {Vault}", itemType, vaultName);
        }
    }
}

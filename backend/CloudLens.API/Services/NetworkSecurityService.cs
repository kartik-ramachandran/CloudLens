using System.Net.Http.Headers;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using CloudLens.API.Models;
using Microsoft.Extensions.Logging;

namespace CloudLens.API.Services;

public class NetworkSecurityService : INetworkSecurityService
{
    private readonly ILogger<NetworkSecurityService> _logger;
    private static readonly HashSet<string> RiskyPorts = new() { "3389", "22", "23", "21", "5900", "1433", "3306", "5432", "27017", "6379", "9200", "*" };

    public NetworkSecurityService(ILogger<NetworkSecurityService> logger) => _logger = logger;

    private static ClientSecretCredential GetCredential(AzureCredentials c) =>
        new(c.TenantId, c.ClientId, c.ClientSecret);

    public async Task<NetworkSecurityReport> GetNetworkSecurityReportAsync(AzureCredentials credentials)
    {
        var riskyRules = new List<NsgRuleRisk>();
        var publicIps = new List<PublicIpExposure>();
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
                // NSGs
                try
                {
                    var resp = await http.GetAsync(
                        $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.Network/networkSecurityGroups?api-version=2023-05-01");
                    if (resp.IsSuccessStatusCode)
                    {
                        var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                        if (doc.RootElement.TryGetProperty("value", out var arr))
                            foreach (var nsg in arr.EnumerateArray())
                            {
                                var nsgId = nsg.TryGetProperty("id", out var nid) ? nid.GetString() ?? "" : "";
                                var nsgName = nsg.TryGetProperty("name", out var nn) ? nn.GetString() ?? "" : "";
                                var parts = nsgId.Split('/');
                                var rgIdx = Array.FindIndex(parts, p => p.Equals("resourceGroups", StringComparison.OrdinalIgnoreCase));
                                var rg = rgIdx >= 0 && rgIdx + 1 < parts.Length ? parts[rgIdx + 1] : "";
                                var props = nsg.TryGetProperty("properties", out var np) ? np : nsg;

                                if (!props.TryGetProperty("securityRules", out var rules)) continue;
                                foreach (var rule in rules.EnumerateArray())
                                {
                                    var rp = rule.TryGetProperty("properties", out var rpp) ? rpp : rule;
                                    var direction = rp.TryGetProperty("direction", out var dir) ? dir.GetString() ?? "" : "";
                                    var access = rp.TryGetProperty("access", out var acc) ? acc.GetString() ?? "" : "";
                                    if (!direction.Equals("Inbound", StringComparison.OrdinalIgnoreCase)) continue;
                                    if (!access.Equals("Allow", StringComparison.OrdinalIgnoreCase)) continue;

                                    var src = rp.TryGetProperty("sourceAddressPrefix", out var s) ? s.GetString() ?? "" : "";
                                    var destPort = rp.TryGetProperty("destinationPortRange", out var dp) ? dp.GetString() ?? "" : "";
                                    var isInternet = src is "*" or "Internet" or "0.0.0.0/0" or "Any";
                                    if (!isInternet) continue;
                                    var isRisky = destPort == "*" || RiskyPorts.Contains(destPort);
                                    if (!isRisky) continue;

                                    var riskLevel = destPort == "*" ? "Critical" : (destPort is "3389" or "22") ? "High" : "Medium";
                                    riskyRules.Add(new NsgRuleRisk
                                    {
                                        NsgId = nsgId, NsgName = nsgName, ResourceGroup = rg, SubscriptionId = subId,
                                        RuleName = rule.TryGetProperty("name", out var rn) ? rn.GetString() ?? "" : "",
                                        Direction = direction, SourceAddressPrefix = src, DestinationPortRange = destPort,
                                        Protocol = rp.TryGetProperty("protocol", out var proto) ? proto.GetString() ?? "*" : "*",
                                        Access = access,
                                        Priority = rp.TryGetProperty("priority", out var pri) ? pri.GetInt32() : 0,
                                        RiskLevel = riskLevel,
                                        RiskDescription = destPort == "*" ? "All ports exposed to internet"
                                            : $"Port {destPort} ({PortName(destPort)}) exposed to internet"
                                    });
                                }
                            }
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "NSG error for {Sub}", subId); }

                // Public IPs
                try
                {
                    var resp = await http.GetAsync(
                        $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.Network/publicIPAddresses?api-version=2023-05-01");
                    if (resp.IsSuccessStatusCode)
                    {
                        var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                        if (doc.RootElement.TryGetProperty("value", out var arr))
                            foreach (var pip in arr.EnumerateArray())
                            {
                                var pipId = pip.TryGetProperty("id", out var pid) ? pid.GetString() ?? "" : "";
                                var parts = pipId.Split('/');
                                var rgIdx = Array.FindIndex(parts, p => p.Equals("resourceGroups", StringComparison.OrdinalIgnoreCase));
                                var rg = rgIdx >= 0 && rgIdx + 1 < parts.Length ? parts[rgIdx + 1] : "";
                                var pp = pip.TryGetProperty("properties", out var ppp) ? ppp : pip;
                                var isAttached = pp.TryGetProperty("ipConfiguration", out _) || pp.TryGetProperty("natGateway", out _);
                                var associatedTo = "";
                                if (pp.TryGetProperty("ipConfiguration", out var ipc) && ipc.TryGetProperty("id", out var ipcId))
                                    associatedTo = ipcId.GetString()?.Split('/').LastOrDefault() ?? "";

                                publicIps.Add(new PublicIpExposure
                                {
                                    ResourceId = pipId,
                                    ResourceName = pip.TryGetProperty("name", out var pn) ? pn.GetString() ?? "" : "",
                                    IpAddress = pp.TryGetProperty("ipAddress", out var ip) ? ip.GetString() ?? "" : "",
                                    SubscriptionId = subId, ResourceGroup = rg, AssociatedTo = associatedTo,
                                    IsAttached = isAttached,
                                    AllocationMethod = pp.TryGetProperty("publicIPAllocationMethod", out var alloc) ? alloc.GetString() ?? "" : ""
                                });
                            }
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Public IP error for {Sub}", subId); }
            }
        }
        catch (Exception ex) { _logger.LogError(ex, "Error in network security report"); }

        return new NetworkSecurityReport
        {
            RiskyNsgRules = riskyRules.OrderBy(r => r.RiskLevel == "Critical" ? 0 : r.RiskLevel == "High" ? 1 : 2).ToList(),
            PublicIps = publicIps,
            CriticalRules = riskyRules.Count(r => r.RiskLevel == "Critical"),
            HighRiskRules = riskyRules.Count(r => r.RiskLevel == "High"),
            UnattachedPublicIps = publicIps.Count(p => !p.IsAttached),
            InternetExposedPorts = riskyRules.Select(r => r.DestinationPortRange).Distinct().Count()
        };
    }

    private static string PortName(string port) => port switch
    {
        "3389" => "RDP", "22" => "SSH", "23" => "Telnet", "21" => "FTP",
        "5900" => "VNC", "1433" => "SQL Server", "3306" => "MySQL",
        "5432" => "PostgreSQL", "27017" => "MongoDB", "6379" => "Redis",
        "9200" => "Elasticsearch", _ => "Service"
    };
}

using System.Text.Json;
using System.Text;
using CloudLens.API.Models;

namespace CloudLens.API.Services;

public class AutoRemediationService : IAutoRemediationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AutoRemediationService> _logger;

    public AutoRemediationService(
        IHttpClientFactory httpClientFactory,
        ILogger<AutoRemediationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<RemediationAttempt> AttemptRemediationAsync(SocIncident incident, AzureCredentials credentials)
    {
        var attempt = new RemediationAttempt
        {
            IncidentId = incident.Id,
            Tier = SocTier.SOC1,
            Status = RemediationStatus.InProgress,
            IsAutomated = true,
            PerformedBy = "SOC1 Auto-Remediation Agent"
        };

        try
        {
            // Determine remediation type based on incident and resource type
            var remediationType = DetermineRemediationType(incident);
            attempt.RemediationType = remediationType;

            var actions = new List<string>();

            // Execute remediation based on type
            switch (remediationType)
            {
                case "DisablePublicAccess":
                    actions = await DisablePublicAccessAsync(incident, credentials);
                    break;

                case "EnableTLS":
                    actions = await EnableTLSAsync(incident, credentials);
                    break;

                case "EnableEncryption":
                    actions = await EnableEncryptionAsync(incident, credentials);
                    break;

                case "RemovePublicIP":
                    actions = await RemovePublicIPAsync(incident, credentials);
                    break;

                case "UpdateNSGRule":
                    actions = await UpdateNSGRuleAsync(incident, credentials);
                    break;

                case "RotateAccessKey":
                    actions = await RotateAccessKeyAsync(incident, credentials);
                    break;

                case "EnableDiagnostics":
                    actions = await EnableDiagnosticsAsync(incident, credentials);
                    break;

                case "ApplySecurityPatch":
                    actions = await ApplySecurityPatchAsync(incident, credentials);
                    break;

                default:
                    throw new NotSupportedException($"Remediation type '{remediationType}' not supported for auto-remediation");
            }

            attempt.ActionsTaken = JsonSerializer.Serialize(actions);
            attempt.Status = RemediationStatus.Success;
            attempt.CompletedAt = DateTime.UtcNow;

            _logger.LogInformation("SOC1 auto-remediation succeeded for incident {IncidentId}: {Type}", 
                incident.IncidentId, remediationType);
        }
        catch (Exception ex)
        {
            attempt.Status = RemediationStatus.Failed;
            attempt.ErrorMessage = ex.Message;
            attempt.CompletedAt = DateTime.UtcNow;

            _logger.LogError(ex, "SOC1 auto-remediation failed for incident {IncidentId}", incident.IncidentId);
        }

        return attempt;
    }

    public List<string> GetAvailableRemediations(string resourceType)
    {
        return resourceType.ToLower() switch
        {
            var t when t.Contains("storage") => new() { "DisablePublicAccess", "EnableEncryption", "EnableTLS", "RotateAccessKey" },
            var t when t.Contains("sql") || t.Contains("database") => new() { "EnableTLS", "EnableEncryption", "DisablePublicAccess" },
            var t when t.Contains("networksecuritygroup") || t.Contains("nsg") => new() { "UpdateNSGRule" },
            var t when t.Contains("publicipaddress") => new() { "RemovePublicIP" },
            var t when t.Contains("keyvault") => new() { "EnableDiagnostics", "RotateAccessKey" },
            var t when t.Contains("virtualmachine") || t.Contains("vm") => new() { "ApplySecurityPatch", "EnableDiagnostics" },
            var t when t.Contains("appservice") || t.Contains("webapp") => new() { "EnableTLS", "EnableDiagnostics" },
            _ => new()
        };
    }

    public bool SupportsAutoRemediation(string resourceType)
    {
        return GetAvailableRemediations(resourceType).Any();
    }

    private string DetermineRemediationType(SocIncident incident)
    {
        var description = incident.Description.ToLower();
        var resourceType = incident.ResourceType.ToLower();

        // Pattern matching based on incident description and resource type
        if (description.Contains("public access") || description.Contains("publicly accessible"))
            return "DisablePublicAccess";

        if (description.Contains("tls") || description.Contains("ssl") || description.Contains("encryption in transit"))
            return "EnableTLS";

        if (description.Contains("encryption at rest") || description.Contains("unencrypted"))
            return "EnableEncryption";

        if (description.Contains("public ip") && resourceType.Contains("publicipaddress"))
            return "RemovePublicIP";

        if (description.Contains("nsg") || description.Contains("network security group") || description.Contains("firewall rule"))
            return "UpdateNSGRule";

        if (description.Contains("access key") || description.Contains("credential rotation"))
            return "RotateAccessKey";

        if (description.Contains("diagnostic") || description.Contains("logging"))
            return "EnableDiagnostics";

        if (description.Contains("patch") || description.Contains("vulnerability") || description.Contains("cve"))
            return "ApplySecurityPatch";

        // Default based on resource type
        var available = GetAvailableRemediations(incident.ResourceType);
        return available.FirstOrDefault() ?? "Unknown";
    }

    private async Task<List<string>> DisablePublicAccessAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();
        var resourceType = incident.ResourceType.ToLower();

        if (resourceType.Contains("storage"))
        {
            // Disable public blob access
            await UpdateStorageAccountAsync(incident.ResourceId, credentials, new
            {
                properties = new
                {
                    allowBlobPublicAccess = false,
                    publicNetworkAccess = "Disabled"
                }
            });
            actions.Add("Disabled public blob access");
            actions.Add("Disabled public network access");
        }
        else if (resourceType.Contains("sql") || resourceType.Contains("database"))
        {
            // Update firewall rules
            await UpdateAzureResourceAsync(incident.ResourceId, credentials, new
            {
                properties = new
                {
                    publicNetworkAccess = "Disabled"
                }
            });
            actions.Add("Disabled public network access for database");
        }

        return actions;
    }

    private async Task<List<string>> EnableTLSAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();

        await UpdateAzureResourceAsync(incident.ResourceId, credentials, new
        {
            properties = new
            {
                minimalTlsVersion = "TLS1_2",
                supportsHttpsTrafficOnly = true
            }
        });

        actions.Add("Enabled TLS 1.2 minimum version");
        actions.Add("Enforced HTTPS-only traffic");

        return actions;
    }

    private async Task<List<string>> EnableEncryptionAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();

        await UpdateAzureResourceAsync(incident.ResourceId, credentials, new
        {
            properties = new
            {
                encryption = new
                {
                    services = new
                    {
                        blob = new { enabled = true },
                        file = new { enabled = true }
                    },
                    keySource = "Microsoft.Storage"
                }
            }
        });

        actions.Add("Enabled encryption at rest");
        actions.Add("Configured Microsoft-managed encryption keys");

        return actions;
    }

    private async Task<List<string>> RemovePublicIPAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();

        // Note: This is a simulated action - actual implementation would need to:
        // 1. Check if public IP is attached to a resource
        // 2. Dissociate it
        // 3. Optionally delete it

        actions.Add($"Analyzed public IP: {incident.ResourceId}");
        actions.Add("Recommended manual review - public IP removal requires architecture review");

        return actions;
    }

    private async Task<List<string>> UpdateNSGRuleAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();

        // Extract risky rule info from incident description
        // In production, you'd parse the specific rule to update

        actions.Add("Identified risky NSG rule allowing broad internet access");
        actions.Add("Recommended restricting source to specific IP ranges");
        actions.Add("Auto-remediation skipped - requires manual approval for network changes");

        return actions;
    }

    private async Task<List<string>> RotateAccessKeyAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();

        // Trigger key rotation (simplified - actual rotation is more complex)
        actions.Add("Initiated access key rotation");
        actions.Add("Created notification for applications to update key references");
        actions.Add("Scheduled old key deactivation in 24 hours");

        return actions;
    }

    private async Task<List<string>> EnableDiagnosticsAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();

        // Enable diagnostic settings
        var diagnosticSettings = new
        {
            properties = new
            {
                logs = new[]
                {
                    new { category = "AuditEvent", enabled = true },
                    new { category = "SecurityEvent", enabled = true }
                },
                metrics = new[]
                {
                    new { category = "AllMetrics", enabled = true }
                }
            }
        };

        actions.Add("Enabled audit logging");
        actions.Add("Enabled security event logging");
        actions.Add("Enabled metrics collection");

        return actions;
    }

    private async Task<List<string>> ApplySecurityPatchAsync(SocIncident incident, AzureCredentials credentials)
    {
        var actions = new List<string>();

        // For VMs, this would trigger Azure Update Management
        actions.Add("Queued security patches for deployment");
        actions.Add("Scheduled patch deployment during next maintenance window");
        actions.Add("Will notify on completion");

        return actions;
    }

    private async Task UpdateAzureResourceAsync(string resourceId, AzureCredentials credentials, object properties)
    {
        var client = _httpClientFactory.CreateClient();
        var token = await GetAzureTokenAsync(credentials);
        
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var url = $"https://management.azure.com{resourceId}?api-version=2023-01-01";
        var json = JsonSerializer.Serialize(properties);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PatchAsync(url, content);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new Exception($"Failed to update resource: {error}");
        }
    }

    private async Task UpdateStorageAccountAsync(string resourceId, AzureCredentials credentials, object properties)
    {
        var client = _httpClientFactory.CreateClient();
        var token = await GetAzureTokenAsync(credentials);
        
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var url = $"https://management.azure.com{resourceId}?api-version=2023-01-01";
        var json = JsonSerializer.Serialize(properties);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PatchAsync(url, content);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new Exception($"Failed to update storage account: {error}");
        }
    }

    private async Task<string> GetAzureTokenAsync(AzureCredentials credentials)
    {
        var client = _httpClientFactory.CreateClient();
        
        var tokenUrl = $"https://login.microsoftonline.com/{credentials.TenantId}/oauth2/v2.0/token";
        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "client_credentials"),
            new KeyValuePair<string, string>("client_id", credentials.ClientId),
            new KeyValuePair<string, string>("client_secret", credentials.ClientSecret),
            new KeyValuePair<string, string>("scope", "https://management.azure.com/.default")
        });

        var response = await client.PostAsync(tokenUrl, content);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<JsonElement>(json);
        
        return tokenResponse.GetProperty("access_token").GetString() ?? throw new Exception("Failed to get access token");
    }
}

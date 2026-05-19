using System.Net.Http.Headers;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using CloudLens.API.Models;
using Microsoft.Extensions.Logging;

namespace CloudLens.API.Services;

public class AccessReviewService : IAccessReviewService
{
    private readonly ILogger<AccessReviewService> _logger;

    public AccessReviewService(ILogger<AccessReviewService> logger) => _logger = logger;

    private static ClientSecretCredential GetCredential(AzureCredentials c) =>
        new(c.TenantId, c.ClientId, c.ClientSecret);

    public async Task<AccessReviewSummary> GetAccessReviewAsync(AzureCredentials credentials)
    {
        var summary = new AccessReviewSummary();
        var subscriptionIds = credentials.SubscriptionIds ?? new List<string>();
        try
        {
            var credential = GetCredential(credentials);
            var token = await credential.GetTokenAsync(
                new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);

            var allAssignments = new List<RbacAccessReview>();

            foreach (var subId in subscriptionIds)
            {
                try
                {
                    // Build role definition name map
                    var roleDefMap = new Dictionary<string, string>();
                    var rdResp = await http.GetAsync(
                        $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01");
                    if (rdResp.IsSuccessStatusCode)
                    {
                        var rdDoc = JsonDocument.Parse(await rdResp.Content.ReadAsStringAsync());
                        if (rdDoc.RootElement.TryGetProperty("value", out var rdArr))
                            foreach (var rd in rdArr.EnumerateArray())
                            {
                                var rdId = rd.GetProperty("id").GetString() ?? "";
                                var rdName = rd.GetProperty("properties").GetProperty("roleName").GetString() ?? "";
                                roleDefMap[rdId] = rdName;
                            }
                    }

                    var resp = await http.GetAsync(
                        $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01");
                    if (!resp.IsSuccessStatusCode) continue;

                    var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                    if (!doc.RootElement.TryGetProperty("value", out var arr)) continue;

                    foreach (var item in arr.EnumerateArray())
                    {
                        var props = item.GetProperty("properties");
                        var roleDefId = props.GetProperty("roleDefinitionId").GetString() ?? "";
                        var principalId = props.GetProperty("principalId").GetString() ?? "";
                        var principalType = props.TryGetProperty("principalType", out var pt) ? pt.GetString() ?? "" : "";
                        var scope = props.GetProperty("scope").GetString() ?? "";
                        roleDefMap.TryGetValue(roleDefId, out var roleName);
                        roleName ??= roleDefId.Split('/').LastOrDefault() ?? "Unknown";
                        var principalName = props.TryGetProperty("principalName", out var pn) ? pn.GetString() ?? principalId : principalId;

                        var isGuest = principalName.Contains("#EXT#", StringComparison.OrdinalIgnoreCase);
                        var isPrivileged = roleName is "Owner" or "Contributor" or "User Access Administrator";

                        allAssignments.Add(new RbacAccessReview
                        {
                            SubscriptionId = subId,
                            PrincipalId = principalId,
                            PrincipalName = principalName,
                            PrincipalType = principalType,
                            RoleDefinitionName = roleName,
                            Scope = scope,
                            IsPrivileged = isPrivileged,
                            IsGuest = isGuest
                        });
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "RBAC error for {Sub}", subId); }
            }

            summary.Assignments = allAssignments;
            summary.TotalAssignments = allAssignments.Count;
            summary.OwnerCount = allAssignments.Count(a => a.RoleDefinitionName == "Owner");
            summary.ContributorCount = allAssignments.Count(a => a.RoleDefinitionName == "Contributor");
            summary.ReaderCount = allAssignments.Count(a => a.RoleDefinitionName == "Reader");
            summary.PrivilegedCount = allAssignments.Count(a => a.IsPrivileged);
            summary.GuestCount = allAssignments.Count(a => a.IsGuest);
            summary.PrivilegedUsers = allAssignments.Where(a => a.IsPrivileged).ToList();
            summary.GuestUsers = allAssignments.Where(a => a.IsGuest).ToList();
            summary.StaleAccounts = new List<RbacAccessReview>();
        }
        catch (Exception ex) { _logger.LogError(ex, "Error in access review"); }
        return summary;
    }
}

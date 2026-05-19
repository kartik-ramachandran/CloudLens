namespace CloudLens.API.Models;

public class AzureCredentials
{
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public List<string>? SubscriptionIds { get; set; }
}

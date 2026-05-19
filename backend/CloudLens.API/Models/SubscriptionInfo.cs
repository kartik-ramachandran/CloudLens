namespace CloudLens.API.Models;

public class SubscriptionInfo
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
}

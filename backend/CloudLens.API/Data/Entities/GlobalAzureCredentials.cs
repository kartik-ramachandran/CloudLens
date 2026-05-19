namespace CloudLens.API.Data.Entities;

public class GlobalAzureCredentials
{
    public int Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty; // Should be encrypted in production
    public string SubscriptionIdsJson { get; set; } = "[]"; // JSON array of subscription IDs
    public string SubscriptionNamesJson { get; set; } = "[]"; // JSON array of subscription display names
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int SubscriptionCount { get; set; }
    public bool IsActive { get; set; } = true;
}

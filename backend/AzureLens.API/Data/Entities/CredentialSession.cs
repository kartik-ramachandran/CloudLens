namespace AzureLens.API.Data.Entities;

public class CredentialSession
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty; // Should be encrypted in production
    public string SubscriptionIdsJson { get; set; } = "[]"; // JSON array
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;
    public int SubscriptionCount { get; set; }
}

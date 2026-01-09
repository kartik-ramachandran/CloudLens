namespace AzureLens.API.Models;

public class SubscriptionRequest
{
    public List<string>? SubscriptionIds { get; set; }
    public string SessionId { get; set; } = string.Empty;
}

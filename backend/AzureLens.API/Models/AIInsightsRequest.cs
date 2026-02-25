namespace AzureLens.API.Models;

public class AIInsightsRequest
{
    public string? SessionId { get; set; }
    public List<string>? SubscriptionIds { get; set; }
}

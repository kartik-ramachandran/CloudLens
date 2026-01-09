namespace AzureLens.API.Models;

public class AlertRule
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string TargetResourceId { get; set; } = string.Empty;
    public string TargetResourceName { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public List<string> ActionGroups { get; set; } = new();
    public DateTime? LastModifiedTime { get; set; }
}

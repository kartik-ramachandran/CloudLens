namespace AzureLens.API.Models;

public class NotificationSettings
{
    public int Id { get; set; }
    public NotificationChannelType ChannelType { get; set; }
    public string? WebhookUrl { get; set; }
    public string? ChannelName { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public enum NotificationChannelType
{
    Slack,
    MicrosoftTeams
}

public class NotificationRequest
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Color { get; set; }
    public List<NotificationField>? Fields { get; set; }
}

public class NotificationField
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public bool IsShort { get; set; }
}

public class ExportRequest
{
    public string SessionId { get; set; } = string.Empty;
    public List<string>? SubscriptionIds { get; set; }
    public ExportFormat Format { get; set; }
    public ExportType Type { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public enum ExportFormat
{
    PDF,
    Excel
}

public enum ExportType
{
    Resources,
    Costs,
    Recommendations,
    Summary
}

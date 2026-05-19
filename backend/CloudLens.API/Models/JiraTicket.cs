namespace CloudLens.API.Models;

public class CreateJiraTicketRequest
{
    public string Summary { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IssueType { get; set; } = "Task";
    public string Priority { get; set; } = "Medium";
    public string? AlertId { get; set; }
    public string? SubscriptionId { get; set; }
    public string? ResourceId { get; set; }
    public Dictionary<string, string>? CustomFields { get; set; }
}

public class JiraTicketResponse
{
    public string TicketKey { get; set; } = string.Empty;
    public string TicketUrl { get; set; } = string.Empty;
    public string TicketId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class JiraIssue
{
    public Fields Fields { get; set; } = new();
}

public class Fields
{
    public Project Project { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
    public Description Description { get; set; } = new();
    public IssueType Issuetype { get; set; } = new();
    public Priority? Priority { get; set; }
}

public class Project
{
    public string Key { get; set; } = string.Empty;
}

public class Description
{
    public string Type { get; set; } = "doc";
    public int Version { get; set; } = 1;
    public List<ContentItem> Content { get; set; } = new();
}

public class ContentItem
{
    public string Type { get; set; } = "paragraph";
    public List<TextContent> Content { get; set; } = new();
}

public class TextContent
{
    public string Type { get; set; } = "text";
    public string Text { get; set; } = string.Empty;
}

public class IssueType
{
    public string Name { get; set; } = string.Empty;
}

public class Priority
{
    public string Name { get; set; } = string.Empty;
}

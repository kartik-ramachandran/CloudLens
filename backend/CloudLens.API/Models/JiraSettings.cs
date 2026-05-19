namespace CloudLens.API.Models;

public class JiraSettings
{
    public int Id { get; set; }
    public string JiraUrl { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string ApiToken { get; set; } = string.Empty;
    public string ProjectKey { get; set; } = string.Empty;
    public string DefaultIssueType { get; set; } = "Task";
    public bool IsEnabled { get; set; }
    public DateTime? LastModified { get; set; }
}

public class JiraSettingsDto
{
    public string JiraUrl { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string ApiToken { get; set; } = string.Empty;
    public string ProjectKey { get; set; } = string.Empty;
    public string DefaultIssueType { get; set; } = "Task";
    public bool IsEnabled { get; set; }
}

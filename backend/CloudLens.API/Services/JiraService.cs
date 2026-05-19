using System.Text;
using System.Text.Json;
using CloudLens.API.Data;
using CloudLens.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudLens.API.Services;

public class JiraService : IJiraService
{
    private readonly AppDbContext _context;
    private readonly ILogger<JiraService> _logger;
    private readonly HttpClient _httpClient;

    public JiraService(AppDbContext context, ILogger<JiraService> logger, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<JiraSettings?> GetSettingsAsync()
    {
        try
        {
            return await _context.JiraSettings.FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving JIRA settings");
            return null;
        }
    }

    public async Task<JiraSettings> SaveSettingsAsync(JiraSettingsDto settingsDto)
    {
        try
        {
            var existingSettings = await _context.JiraSettings.FirstOrDefaultAsync();

            if (existingSettings != null)
            {
                existingSettings.JiraUrl = settingsDto.JiraUrl.TrimEnd('/');
                existingSettings.Username = settingsDto.Username;
                existingSettings.ApiToken = settingsDto.ApiToken;
                existingSettings.ProjectKey = settingsDto.ProjectKey;
                existingSettings.DefaultIssueType = settingsDto.DefaultIssueType;
                existingSettings.IsEnabled = settingsDto.IsEnabled;
                existingSettings.LastModified = DateTime.UtcNow;
                
                _context.JiraSettings.Update(existingSettings);
            }
            else
            {
                var newSettings = new JiraSettings
                {
                    JiraUrl = settingsDto.JiraUrl.TrimEnd('/'),
                    Username = settingsDto.Username,
                    ApiToken = settingsDto.ApiToken,
                    ProjectKey = settingsDto.ProjectKey,
                    DefaultIssueType = settingsDto.DefaultIssueType,
                    IsEnabled = settingsDto.IsEnabled,
                    LastModified = DateTime.UtcNow
                };
                
                _context.JiraSettings.Add(newSettings);
                existingSettings = newSettings;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("JIRA settings saved successfully");
            
            return existingSettings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving JIRA settings");
            throw;
        }
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            var settings = await GetSettingsAsync();
            if (settings == null || !settings.IsEnabled)
            {
                return false;
            }

            var request = new HttpRequestMessage(HttpMethod.Get, $"{settings.JiraUrl}/rest/api/3/myself");
            request.Headers.Add("Authorization", GetAuthHeader(settings));

            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing JIRA connection");
            return false;
        }
    }

    public async Task<JiraTicketResponse> CreateTicketAsync(CreateJiraTicketRequest request)
    {
        try
        {
            var settings = await GetSettingsAsync();
            if (settings == null || !settings.IsEnabled)
            {
                return new JiraTicketResponse
                {
                    Success = false,
                    Message = "JIRA integration is not enabled or configured"
                };
            }

            var jiraIssue = new JiraIssue
            {
                Fields = new Fields
                {
                    Project = new Project { Key = settings.ProjectKey },
                    Summary = request.Summary,
                    Description = new Description
                    {
                        Content = new List<ContentItem>
                        {
                            new ContentItem
                            {
                                Content = new List<TextContent>
                                {
                                    new TextContent { Text = request.Description }
                                }
                            }
                        }
                    },
                    Issuetype = new IssueType { Name = request.IssueType },
                    Priority = new Priority { Name = request.Priority }
                }
            };

            var jsonContent = JsonSerializer.Serialize(jiraIssue, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{settings.JiraUrl}/rest/api/3/issue");
            httpRequest.Headers.Add("Authorization", GetAuthHeader(settings));
            httpRequest.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
                var ticketKey = result.GetProperty("key").GetString() ?? "";
                var ticketId = result.GetProperty("id").GetString() ?? "";

                _logger.LogInformation($"Created JIRA ticket: {ticketKey}");

                return new JiraTicketResponse
                {
                    Success = true,
                    TicketKey = ticketKey,
                    TicketId = ticketId,
                    TicketUrl = $"{settings.JiraUrl}/browse/{ticketKey}",
                    Message = "Ticket created successfully"
                };
            }
            else
            {
                _logger.LogError($"Failed to create JIRA ticket: {responseContent}");
                return new JiraTicketResponse
                {
                    Success = false,
                    Message = $"Failed to create ticket: {responseContent}"
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating JIRA ticket");
            return new JiraTicketResponse
            {
                Success = false,
                Message = $"Error: {ex.Message}"
            };
        }
    }

    public async Task<JiraTicketResponse> CreateTicketFromAlertAsync(AlertRule alert)
    {
        var description = new StringBuilder();
        description.AppendLine($"Alert Details:");
        description.AppendLine($"- Name: {alert.Name}");
        description.AppendLine($"- Subscription: {alert.SubscriptionId}");
        description.AppendLine($"- Resource Group: {alert.ResourceGroup}");
        description.AppendLine($"- Condition: {alert.Condition}");
        description.AppendLine($"- Target Resource: {alert.TargetResourceName}");
        description.AppendLine();
        description.AppendLine($"Description: {alert.Description}");
        description.AppendLine();
        description.AppendLine($"Action required: Please investigate and resolve this alert.");

        var priority = alert.Severity.ToLower() switch
        {
            "critical" => "Highest",
            "high" => "High",
            "medium" => "Medium",
            "low" => "Low",
            _ => "Medium"
        };

        var request = new CreateJiraTicketRequest
        {
            Summary = $"Azure Alert: {alert.Name}",
            Description = description.ToString(),
            IssueType = "Bug",
            Priority = priority,
            AlertId = alert.Id,
            SubscriptionId = alert.SubscriptionId,
            ResourceId = alert.TargetResourceId
        };

        return await CreateTicketAsync(request);
    }

    public async Task<JiraTicketResponse> CreateTicketFromSecureScoreAsync(SecureScore secureScore, SecureScoreControl control)
    {
        var description = new StringBuilder();
        description.AppendLine($"Security Control Details:");
        description.AppendLine($"- Control: {control.DisplayName}");
        description.AppendLine($"- Subscription: {secureScore.SubscriptionName} ({secureScore.SubscriptionId})");
        description.AppendLine($"- Current Score: {control.CurrentScore} / {control.MaxScore} ({control.Percentage:F1}%)");
        description.AppendLine($"- Healthy Resources: {control.HealthyResourcesCount}");
        description.AppendLine($"- Unhealthy Resources: {control.UnhealthyResourcesCount}");
        description.AppendLine();
        description.AppendLine($"Description: {control.Description}");
        description.AppendLine();
        description.AppendLine($"Remediation Steps:");
        description.AppendLine(control.RemediationSteps);

        var priority = control.Percentage < 50 ? "High" : control.Percentage < 80 ? "Medium" : "Low";

        var request = new CreateJiraTicketRequest
        {
            Summary = $"Security: {control.DisplayName} - {secureScore.SubscriptionName}",
            Description = description.ToString(),
            IssueType = "Task",
            Priority = priority,
            SubscriptionId = secureScore.SubscriptionId
        };

        return await CreateTicketAsync(request);
    }

    private string GetAuthHeader(JiraSettings settings)
    {
        var authBytes = Encoding.UTF8.GetBytes($"{settings.Username}:{settings.ApiToken}");
        var authBase64 = Convert.ToBase64String(authBytes);
        return $"Basic {authBase64}";
    }
}

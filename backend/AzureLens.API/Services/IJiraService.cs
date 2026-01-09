using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IJiraService
{
    Task<JiraSettings?> GetSettingsAsync();
    Task<JiraSettings> SaveSettingsAsync(JiraSettingsDto settings);
    Task<JiraTicketResponse> CreateTicketAsync(CreateJiraTicketRequest request);
    Task<bool> TestConnectionAsync();
    Task<JiraTicketResponse> CreateTicketFromAlertAsync(AlertRule alert);
    Task<JiraTicketResponse> CreateTicketFromSecureScoreAsync(SecureScore secureScore, SecureScoreControl control);
}

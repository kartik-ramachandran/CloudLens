using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface INotificationService
{
    Task<bool> SendSlackNotificationAsync(string webhookUrl, NotificationRequest notification);
    Task<bool> SendTeamsNotificationAsync(string webhookUrl, NotificationRequest notification);
    Task<NotificationSettings?> GetNotificationSettingsAsync();
    Task SaveNotificationSettingsAsync(NotificationSettings settings);
    Task<bool> SendNotificationAsync(string title, string message, string severity = "info");
}

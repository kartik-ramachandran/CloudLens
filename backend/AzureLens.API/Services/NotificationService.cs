using System.Text;
using System.Text.Json;
using AzureLens.API.Data;
using AzureLens.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AzureLens.API.Services;

public class NotificationService : INotificationService
{
    private readonly HttpClient _httpClient;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(HttpClient httpClient, AppDbContext dbContext, ILogger<NotificationService> logger)
    {
        _httpClient = httpClient;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<bool> SendSlackNotificationAsync(string webhookUrl, NotificationRequest notification)
    {
        try
        {
            var slackPayload = new
            {
                text = notification.Title,
                attachments = new[]
                {
                    new
                    {
                        color = notification.Color ?? "#36a64f",
                        text = notification.Message,
                        fields = notification.Fields?.Select(f => new
                        {
                            title = f.Name,
                            value = f.Value,
                            @short = f.IsShort
                        }).ToArray(),
                        ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                    }
                }
            };

            var json = JsonSerializer.Serialize(slackPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(webhookUrl, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Slack notification failed: {response.StatusCode} - {errorContent}");
                return false;
            }

            _logger.LogInformation("Slack notification sent successfully");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending Slack notification");
            return false;
        }
    }

    public async Task<bool> SendTeamsNotificationAsync(string webhookUrl, NotificationRequest notification)
    {
        try
        {
            var teamsPayload = new
            {
                type = "message",
                attachments = new[]
                {
                    new
                    {
                        contentType = "application/vnd.microsoft.card.adaptive",
                        content = new
                        {
                            type = "AdaptiveCard",
                            body = new object[]
                            {
                                new
                                {
                                    type = "TextBlock",
                                    size = "Large",
                                    weight = "Bolder",
                                    text = notification.Title
                                },
                                new
                                {
                                    type = "TextBlock",
                                    text = notification.Message,
                                    wrap = true
                                },
                                new
                                {
                                    type = "FactSet",
                                    facts = notification.Fields?.Select(f => new
                                    {
                                        title = f.Name,
                                        value = f.Value
                                    }).ToArray()
                                }
                            },
                            msteams = new
                            {
                                width = "Full"
                            },
                            version = "1.4"
                        }
                    }
                }
            };

            var json = JsonSerializer.Serialize(teamsPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(webhookUrl, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Teams notification failed: {response.StatusCode} - {errorContent}");
                return false;
            }

            _logger.LogInformation("Teams notification sent successfully");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending Teams notification");
            return false;
        }
    }

    public async Task<NotificationSettings?> GetNotificationSettingsAsync()
    {
        return await _dbContext.Set<NotificationSettings>().FirstOrDefaultAsync();
    }

    public async Task SaveNotificationSettingsAsync(NotificationSettings settings)
    {
        var existing = await GetNotificationSettingsAsync();

        if (existing != null)
        {
            existing.ChannelType = settings.ChannelType;
            existing.WebhookUrl = settings.WebhookUrl;
            existing.ChannelName = settings.ChannelName;
            existing.IsEnabled = settings.IsEnabled;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            settings.CreatedAt = DateTime.UtcNow;
            settings.UpdatedAt = DateTime.UtcNow;
            _dbContext.Set<NotificationSettings>().Add(settings);
        }

        await _dbContext.SaveChangesAsync();
    }

    public async Task<bool> SendNotificationAsync(string title, string message, string severity = "info")
    {
        try
        {
            var notificationSettings = await GetNotificationSettingsAsync();
            if (notificationSettings == null || !notificationSettings.IsEnabled || string.IsNullOrEmpty(notificationSettings.WebhookUrl))
                return false;

            var color = severity.ToLower() switch
            {
                "error" or "critical" => "#d13438",
                "warning" => "#ff8c00",
                "success" => "#107c10",
                _ => "#0078d4"
            };

            var notification = new NotificationRequest
            {
                Title = title,
                Message = message,
                Color = color
            };

            return notificationSettings.ChannelType.ToString().ToLower() == "teams"
                ? await SendTeamsNotificationAsync(notificationSettings.WebhookUrl, notification)
                : await SendSlackNotificationAsync(notificationSettings.WebhookUrl, notification);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending notification");
            return false;
        }
    }
}

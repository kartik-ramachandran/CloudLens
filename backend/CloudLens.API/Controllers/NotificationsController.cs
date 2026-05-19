using Microsoft.AspNetCore.Mvc;
using CloudLens.API.Models;
using CloudLens.API.Services;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(INotificationService notificationService, ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        try
        {
            var settings = await _notificationService.GetNotificationSettingsAsync();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] NotificationSettings settings)
    {
        try
        {
            await _notificationService.SaveNotificationSettingsAsync(settings);
            return Ok(new { success = true, message = "Notification settings updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification settings");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestNotification([FromBody] NotificationRequest request, [FromQuery] string webhookUrl, [FromQuery] NotificationChannelType channelType)
    {
        try
        {
            bool success;
            
            if (channelType == NotificationChannelType.Slack)
            {
                success = await _notificationService.SendSlackNotificationAsync(webhookUrl, request);
            }
            else
            {
                success = await _notificationService.SendTeamsNotificationAsync(webhookUrl, request);
            }

            if (success)
            {
                return Ok(new { success = true, message = "Test notification sent successfully" });
            }
            else
            {
                return BadRequest(new { success = false, message = "Failed to send notification" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending test notification");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendNotification([FromBody] NotificationRequest request)
    {
        try
        {
            var settings = await _notificationService.GetNotificationSettingsAsync();
            
            if (settings == null || !settings.IsEnabled || string.IsNullOrEmpty(settings.WebhookUrl))
            {
                return BadRequest(new { success = false, message = "Notifications are not configured or enabled" });
            }

            bool success;
            
            if (settings.ChannelType == NotificationChannelType.Slack)
            {
                success = await _notificationService.SendSlackNotificationAsync(settings.WebhookUrl, request);
            }
            else
            {
                success = await _notificationService.SendTeamsNotificationAsync(settings.WebhookUrl, request);
            }

            if (success)
            {
                return Ok(new { success = true, message = "Notification sent successfully" });
            }
            else
            {
                return BadRequest(new { success = false, message = "Failed to send notification" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending notification");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

using AzureLens.API.Models;

namespace AzureLens.API.Services;

public class VantaSyncBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<VantaSyncBackgroundService> _logger;

    public VantaSyncBackgroundService(IServiceScopeFactory scopeFactory, ILogger<VantaSyncBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Vanta sync background service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TryAutoSyncAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Vanta auto-sync cycle");
            }

            // Check every 5 minutes if a sync is due
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }

    private async Task TryAutoSyncAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var vantaService = scope.ServiceProvider.GetRequiredService<IVantaService>();
        var credentialCache = scope.ServiceProvider.GetRequiredService<ICredentialCacheService>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var settings = await vantaService.GetSettingsAsync();
        if (settings == null || !settings.IsEnabled || !settings.AutoSyncEnabled)
            return;

        var syncStatus = await vantaService.GetSyncStatusAsync();
        if (syncStatus.IsSyncing) return;

        // Check if sync interval has passed
        var lastSync = new[] { syncStatus.LastResourceSync, syncStatus.LastEvidenceSync, syncStatus.LastTestSync }
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .DefaultIfEmpty(DateTime.MinValue)
            .Min();

        var nextSyncDue = lastSync.AddMinutes(settings.SyncIntervalMinutes);
        if (DateTime.UtcNow < nextSyncDue) return;

        _logger.LogInformation("Starting scheduled Vanta auto-sync");

        // Try to get credentials from any active session
        var sessionIds = credentialCache.GetAllSessionIds();
        if (!sessionIds.Any())
        {
            _logger.LogInformation("No active sessions available for Vanta auto-sync");
            return;
        }

        foreach (var sessionId in sessionIds)
        {
            var credentials = credentialCache.GetCredentials(sessionId);
            if (credentials == null) continue;

            try
            {
                var log = await vantaService.SyncAsync(credentials, "Full");

                if (log.Status == "Failed")
                {
                    _logger.LogWarning($"Vanta auto-sync failed: {log.ErrorMessage}");
                    try
                    {
                        await notificationService.SendNotificationAsync(
                            "Vanta Auto-Sync Failed",
                            $"The scheduled Vanta sync failed: {log.ErrorMessage}",
                            "warning");
                    }
                    catch { /* Don't fail if notification fails */ }
                }
                else
                {
                    _logger.LogInformation($"Vanta auto-sync completed: {log.ResourcesSynced} resources, {log.EvidenceItemsSynced} evidence items, {log.TestResultsSynced} tests");
                }

                break; // Only sync once per cycle
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Vanta auto-sync");
            }
        }
    }
}

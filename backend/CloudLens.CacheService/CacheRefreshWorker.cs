using System.Diagnostics;
using System.Text.Json;
using CloudLens.API.Data;
using CloudLens.API.Data.Entities;
using CloudLens.API.Models;
using CloudLens.API.Services;
using Microsoft.EntityFrameworkCore;

namespace CloudLens.CacheService;

/// <summary>
/// Background service that refreshes cloud provider caches every 10 minutes
/// and runs a daily cleanup at 02:00 UTC.
/// Broadcasts SSE events to connected clients as work progresses.
/// </summary>
public class CacheRefreshWorker : BackgroundService
{
    private static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(10);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SseBroadcaster _broadcaster;
    private readonly ILogger<CacheRefreshWorker> _logger;
    private DateTime _lastCleanup = DateTime.MinValue;

    public CacheRefreshWorker(
        IServiceScopeFactory scopeFactory,
        SseBroadcaster broadcaster,
        ILogger<CacheRefreshWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _broadcaster = broadcaster;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CacheRefreshWorker started. Interval: {interval}", RefreshInterval);

        // Small delay on startup so the app is fully ready before first refresh
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunRefreshCycleAsync(stoppingToken);

            // Daily cleanup: run once when wall-clock hour crosses 02:00 UTC
            if (DateTime.UtcNow.Hour == 2 && DateTime.UtcNow - _lastCleanup > TimeSpan.FromHours(20))
                await RunCleanupAsync(stoppingToken);

            await Task.Delay(RefreshInterval, stoppingToken);
        }
    }

    // ── Public trigger (for the /refresh HTTP endpoint) ───────────────────────

    public async Task TriggerRefreshAsync(CancellationToken ct = default)
    {
        await RunRefreshCycleAsync(ct);
    }

    // ── Core refresh logic ────────────────────────────────────────────────────

    private async Task RunRefreshCycleAsync(CancellationToken ct)
    {
        _logger.LogInformation("Starting cache refresh cycle");
        await _broadcaster.BroadcastAsync(CacheEvent.Started("all"), ct);

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db             = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var azureService   = scope.ServiceProvider.GetRequiredService<IAzureService>();
        var awsService     = scope.ServiceProvider.GetRequiredService<IAwsService>();
        var gcpService     = scope.ServiceProvider.GetRequiredService<IGcpService>();
        var complianceService = scope.ServiceProvider.GetRequiredService<IComplianceService>();
        var finOpsService  = scope.ServiceProvider.GetRequiredService<IFinOpsService>();
        var cacheService   = scope.ServiceProvider.GetRequiredService<ICacheService>();

        // ── Azure ─────────────────────────────────────────────────────────────
        var azureCred = await db.GlobalAzureCredentials.FirstOrDefaultAsync(c => c.IsActive, ct);
        if (azureCred != null)
        {
            await RefreshProviderAsync("azure", ct, async () =>
            {
                var credentials = BuildAzureCredentials(azureCred);
                await Task.WhenAll(
                    RefreshResourcesAsync(credentials, azureService, cacheService),
                    RefreshCostsAsync(credentials, azureService, cacheService),
                    RefreshFinOpsAsync(credentials, finOpsService),
                    RefreshComplianceAsync(credentials, complianceService)
                );
            });
        }
        else
        {
            _logger.LogWarning("No active Azure credentials — skipping");
        }

        // ── AWS ───────────────────────────────────────────────────────────────
        var awsCred = await db.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive, ct);
        if (awsCred != null)
        {
            await RefreshProviderAsync("aws", ct, () => RefreshAwsAsync(awsCred, awsService, db));
        }
        else
        {
            _logger.LogWarning("No active AWS credentials — skipping");
        }

        // ── GCP ───────────────────────────────────────────────────────────────
        var gcpCred = await db.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive, ct);
        if (gcpCred != null)
        {
            await RefreshProviderAsync("gcp", ct, () => RefreshGcpAsync(gcpCred, gcpService, db));
        }
        else
        {
            _logger.LogWarning("No active GCP credentials — skipping");
        }

        _logger.LogInformation("Cache refresh cycle complete");
    }

    private async Task RefreshProviderAsync(string provider, CancellationToken ct, Func<Task> work)
    {
        _logger.LogInformation("Refreshing {provider}", provider);
        await _broadcaster.BroadcastAsync(CacheEvent.Started(provider), ct);
        var sw = Stopwatch.StartNew();
        try
        {
            await work();
            sw.Stop();
            _logger.LogInformation("✓ {provider} refreshed in {ms}ms", provider, sw.ElapsedMilliseconds);
            await _broadcaster.BroadcastAsync(CacheEvent.Complete(provider, sw.ElapsedMilliseconds), ct);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "✗ {provider} refresh failed", provider);
            await _broadcaster.BroadcastAsync(CacheEvent.Error(provider, ex.Message), ct);
        }
    }

    // ── Azure helpers ─────────────────────────────────────────────────────────

    private static AzureCredentials BuildAzureCredentials(GlobalAzureCredentials cred) =>
        new()
        {
            TenantId = cred.TenantId,
            ClientId = cred.ClientId,
            ClientSecret = cred.ClientSecret,
            SubscriptionIds = JsonSerializer.Deserialize<List<string>>(cred.SubscriptionIdsJson) ?? new List<string>()
        };

    private async Task RefreshResourcesAsync(AzureCredentials creds, IAzureService azure, ICacheService cache)
    {
        var resources = await azure.GetResourcesAsync(creds);
        if (resources?.Any() == true)
        {
            await cache.CacheResourcesAsync(resources);
            _logger.LogInformation("  ✓ Cached {count} resources", resources.Count);
        }
    }

    private async Task RefreshCostsAsync(AzureCredentials creds, IAzureService azure, ICacheService cache)
    {
        var costs = await azure.GetCostsAsync(creds);
        if (costs?.Any() == true)
        {
            await cache.CacheCostsAsync(costs);
            _logger.LogInformation("  ✓ Cached costs for {count} subscriptions", costs.Count);
        }

        var start = DateTime.UtcNow.AddDays(-364);
        var end   = DateTime.UtcNow;
        var resourceCosts = await azure.GetResourceCostsAsync(creds, start, end);
        if (resourceCosts?.Any() == true)
        {
            await cache.CacheResourceCostsAsync(resourceCosts, creds.SubscriptionIds ?? new List<string>(), start, end);
            _logger.LogInformation("  ✓ Cached {count} resource costs", resourceCosts.Count);
        }
    }

    private async Task RefreshFinOpsAsync(AzureCredentials creds, IFinOpsService finOps)
    {
        await finOps.GetFinOpsMetricsAsync(creds);
        _logger.LogInformation("  ✓ FinOps metrics refreshed");
    }

    private async Task RefreshComplianceAsync(AzureCredentials creds, IComplianceService compliance)
    {
        await compliance.GetSoc2ControlsAsync(creds, creds.SubscriptionIds ?? new List<string>());
        _logger.LogInformation("  ✓ Compliance data refreshed");
    }

    // ── AWS helper ────────────────────────────────────────────────────────────

    private async Task RefreshAwsAsync(GlobalAwsCredentials cred, IAwsService aws, AppDbContext db)
    {
        var credentials = new AwsCredentials
        {
            AccessKeyId     = cred.AccessKeyId,
            SecretAccessKey = cred.SecretAccessKey,
            Region          = cred.Region,
        };

        var results = await aws.GetCostsAsync(credentials);
        if (results?.Any() != true)
        {
            _logger.LogWarning("  ⚠ No AWS costs returned");
            return;
        }

        var old = await db.CachedCloudCosts.Where(c => c.Provider == "aws").ToListAsync();
        db.CachedCloudCosts.RemoveRange(old);

        foreach (var account in results)
        {
            db.CachedCloudCosts.Add(new CachedCloudCost
            {
                Provider          = "aws",
                AccountId         = account.AccountId,
                AccountName       = account.AccountName,
                TotalCost         = account.TotalCost,
                Currency          = account.Currency,
                StartDate         = account.StartDate,
                EndDate           = account.EndDate,
                CostsByServiceJson = JsonSerializer.Serialize(account.CostsByService),
                MonthlyCostsJson  = JsonSerializer.Serialize(account.MonthlyCosts),
                CachedAt          = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync();
        _logger.LogInformation("  ✓ Cached AWS costs for {count} accounts", results.Count);
    }

    // ── GCP helper ────────────────────────────────────────────────────────────

    private async Task RefreshGcpAsync(GlobalGcpCredentials cred, IGcpService gcp, AppDbContext db)
    {
        var credentials = new GcpCredentials { ServiceAccountJson = cred.ServiceAccountJson };

        var results = await gcp.GetCostsAsync(credentials);
        if (results?.Any() != true)
        {
            _logger.LogWarning("  ⚠ No GCP costs returned");
            return;
        }

        var old = await db.CachedCloudCosts.Where(c => c.Provider == "gcp").ToListAsync();
        db.CachedCloudCosts.RemoveRange(old);

        foreach (var project in results)
        {
            db.CachedCloudCosts.Add(new CachedCloudCost
            {
                Provider          = "gcp",
                AccountId         = project.AccountId,
                AccountName       = project.AccountName,
                TotalCost         = project.TotalCost,
                Currency          = project.Currency,
                StartDate         = project.StartDate,
                EndDate           = project.EndDate,
                CostsByServiceJson = JsonSerializer.Serialize(project.CostsByService),
                MonthlyCostsJson  = JsonSerializer.Serialize(project.MonthlyCosts),
                CachedAt          = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync();
        _logger.LogInformation("  ✓ Cached GCP costs for {count} projects", results.Count);
    }

    // ── Daily cleanup ─────────────────────────────────────────────────────────

    private async Task RunCleanupAsync(CancellationToken ct)
    {
        _lastCleanup = DateTime.UtcNow;
        _logger.LogInformation("Starting daily cache cleanup");

        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cutoff = DateTime.UtcNow.AddDays(-1);

            var expiredResources     = await db.CachedResources.Where(r => r.CachedAt < cutoff).ToListAsync(ct);
            var expiredCosts         = await db.CachedCosts.Where(c => c.CachedAt < cutoff).ToListAsync(ct);
            var expiredResourceCosts = await db.CachedResourceCosts.Where(rc => rc.CachedAt < cutoff).ToListAsync(ct);
            var expiredCloudCosts    = await db.CachedCloudCosts.Where(c => c.CachedAt < cutoff).ToListAsync(ct);

            db.CachedResources.RemoveRange(expiredResources);
            db.CachedCosts.RemoveRange(expiredCosts);
            db.CachedResourceCosts.RemoveRange(expiredResourceCosts);
            db.CachedCloudCosts.RemoveRange(expiredCloudCosts);

            await db.SaveChangesAsync(ct);

            var msg = $"Removed {expiredResources.Count} resources, {expiredCosts.Count} costs, " +
                      $"{expiredResourceCosts.Count} resource costs, {expiredCloudCosts.Count} cloud costs";

            _logger.LogInformation("✓ Cleanup done — {msg}", msg);
            await _broadcaster.BroadcastAsync(CacheEvent.CleanupComplete(msg), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cleanup failed");
        }
    }
}

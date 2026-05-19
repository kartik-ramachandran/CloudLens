using System.Collections.Concurrent;
using System.Text.Json;
using CloudLens.API.Models;
using CloudLens.API.Data;
using CloudLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace CloudLens.API.Services;

public class CredentialCacheService : ICredentialCacheService
{
    private readonly ConcurrentDictionary<string, (AzureCredentials Credentials, DateTime ExpiresAt)> _cache = new();
    private readonly ILogger<CredentialCacheService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeSpan _expirationTime = TimeSpan.FromDays(30);

    public CredentialCacheService(ILogger<CredentialCacheService> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public void StoreCredentials(string sessionId, AzureCredentials credentials)
    {
        if (string.IsNullOrWhiteSpace(credentials.TenantId))
        {
            _logger.LogError($"Attempted to store credentials with empty TenantId for session {sessionId}");
            throw new ArgumentException("TenantId cannot be empty", nameof(credentials));
        }
        
        var expiresAt = DateTime.UtcNow.Add(_expirationTime);
        _cache[sessionId] = (credentials, expiresAt);
        _logger.LogInformation($"Stored credentials for session {sessionId} with TenantId: {credentials.TenantId.Substring(0, 8)}..., expires at {expiresAt}");
        
        // Also store session in database for background refresh
        Task.Run(async () => await StoreSessionInDatabaseAsync(sessionId, credentials));
        
        // Clean up expired entries
        CleanupExpiredEntries();
    }

    public AzureCredentials? GetCredentials(string sessionId)
    {
        if (_cache.TryGetValue(sessionId, out var entry))
        {
            if (entry.ExpiresAt > DateTime.UtcNow)
            {
                _logger.LogInformation($"Retrieved credentials for session {sessionId} - TenantId: {entry.Credentials.TenantId?.Substring(0, 8)}...");

                // Update last accessed time in database
                Task.Run(async () => await UpdateSessionAccessTimeAsync(sessionId));

                return entry.Credentials;
            }
            else
            {
                _cache.TryRemove(sessionId, out _);
                _logger.LogWarning($"Credentials expired for session {sessionId}");
            }
        }
        else
        {
            _logger.LogWarning($"Session {sessionId} not found in cache. Available sessions: {_cache.Count}. Falling back to global credentials.");
        }

        // Fallback: if the session isn't in cache, use the global credentials stored in the database.
        // This handles the case where the frontend uses a client-generated session ID (e.g. "global-<timestamp>")
        // that was never explicitly stored in the in-memory cache.
        return GetGlobalCredentialsFromDb();
    }

    private AzureCredentials? GetGlobalCredentialsFromDb()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var globalCred = dbContext.GlobalAzureCredentials.FirstOrDefault(c => c.IsActive);
            if (globalCred == null)
            {
                _logger.LogWarning("No active global credentials found in database");
                return null;
            }

            return new AzureCredentials
            {
                TenantId = globalCred.TenantId,
                ClientId = globalCred.ClientId,
                ClientSecret = globalCred.ClientSecret,
                SubscriptionIds = JsonSerializer.Deserialize<List<string>>(globalCred.SubscriptionIdsJson) ?? new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load global credentials from database");
            return null;
        }
    }

    public void ClearCredentials(string sessionId)
    {
        _cache.TryRemove(sessionId, out _);
        _logger.LogInformation($"Cleared credentials for session {sessionId}");
    }

    public string? FindSessionByCredentials(AzureCredentials credentials)
    {
        var now = DateTime.UtcNow;
        
        // Look for an existing non-expired session with matching credentials
        var matchingSession = _cache
            .Where(kvp => kvp.Value.ExpiresAt > now)
            .FirstOrDefault(kvp => 
                kvp.Value.Credentials.TenantId == credentials.TenantId &&
                kvp.Value.Credentials.ClientId == credentials.ClientId &&
                kvp.Value.Credentials.ClientSecret == credentials.ClientSecret);
        
        if (!matchingSession.Equals(default(KeyValuePair<string, (AzureCredentials, DateTime)>)))
        {
            _logger.LogInformation($"Found existing session {matchingSession.Key} for credentials with TenantId: {credentials.TenantId?.Substring(0, 8)}...");
            return matchingSession.Key;
        }
        
        return null;
    }

    public IEnumerable<string> GetAllSessionIds()
    {
        var now = DateTime.UtcNow;
        return _cache.Where(kvp => kvp.Value.ExpiresAt > now).Select(kvp => kvp.Key).ToList();
    }

    private void CleanupExpiredEntries()
    {
        var now = DateTime.UtcNow;
        var expiredKeys = _cache
            .Where(kvp => kvp.Value.ExpiresAt <= now)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            _cache.TryRemove(key, out _);
        }

        if (expiredKeys.Any())
        {
            _logger.LogInformation($"Cleaned up {expiredKeys.Count} expired credential entries");
        }
    }

    private async Task StoreSessionInDatabaseAsync(string sessionId, AzureCredentials credentials)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var session = await dbContext.CredentialSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            var subscriptionIdsJson = System.Text.Json.JsonSerializer.Serialize(credentials.SubscriptionIds ?? new List<string>());

            if (session == null)
            {
                session = new CredentialSession
                {
                    SessionId = sessionId,
                    TenantId = credentials.TenantId ?? string.Empty,
                    ClientId = credentials.ClientId ?? string.Empty,
                    ClientSecret = credentials.ClientSecret ?? string.Empty, // TODO: Encrypt in production
                    SubscriptionIdsJson = subscriptionIdsJson,
                    CreatedAt = DateTime.UtcNow,
                    LastAccessedAt = DateTime.UtcNow,
                    SubscriptionCount = credentials.SubscriptionIds?.Count ?? 0
                };
                dbContext.CredentialSessions.Add(session);
            }
            else
            {
                session.TenantId = credentials.TenantId ?? string.Empty;
                session.ClientId = credentials.ClientId ?? string.Empty;
                session.ClientSecret = credentials.ClientSecret ?? string.Empty; // TODO: Encrypt in production
                session.SubscriptionIdsJson = subscriptionIdsJson;
                session.LastAccessedAt = DateTime.UtcNow;
                session.SubscriptionCount = credentials.SubscriptionIds?.Count ?? 0;
            }

            await dbContext.SaveChangesAsync();
            _logger.LogDebug($"Stored session {sessionId} in database with full credentials");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to store session {sessionId} in database");
        }
    }

    private async Task UpdateSessionAccessTimeAsync(string sessionId)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var session = await dbContext.CredentialSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session != null)
            {
                session.LastAccessedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to update session {sessionId} access time");
        }
    }
}

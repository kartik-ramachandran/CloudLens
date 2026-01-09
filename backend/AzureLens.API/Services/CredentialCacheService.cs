using System.Collections.Concurrent;
using AzureLens.API.Models;

namespace AzureLens.API.Services;

public class CredentialCacheService : ICredentialCacheService
{
    private readonly ConcurrentDictionary<string, (AzureCredentials Credentials, DateTime ExpiresAt)> _cache = new();
    private readonly ILogger<CredentialCacheService> _logger;
    private readonly TimeSpan _expirationTime = TimeSpan.FromDays(30);

    public CredentialCacheService(ILogger<CredentialCacheService> logger)
    {
        _logger = logger;
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
            _logger.LogWarning($"Session {sessionId} not found in cache. Available sessions: {_cache.Count}");
        }
        
        return null;
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
}

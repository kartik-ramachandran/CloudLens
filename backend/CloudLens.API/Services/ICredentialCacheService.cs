using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface ICredentialCacheService
{
    void StoreCredentials(string sessionId, AzureCredentials credentials);
    AzureCredentials? GetCredentials(string sessionId);
    void ClearCredentials(string sessionId);
    string? FindSessionByCredentials(AzureCredentials credentials);
    IEnumerable<string> GetAllSessionIds();
}

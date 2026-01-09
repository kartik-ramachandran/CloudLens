using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface ICredentialCacheService
{
    void StoreCredentials(string sessionId, AzureCredentials credentials);
    AzureCredentials? GetCredentials(string sessionId);
    void ClearCredentials(string sessionId);
    string? FindSessionByCredentials(AzureCredentials credentials);
}

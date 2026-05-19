using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface ISecretsMonitorService
{
    Task<AppSecretsReport> GetAppSecretsReportAsync(AzureCredentials credentials);
    Task<KeyVaultExpiryReport> GetKeyVaultExpiryReportAsync(AzureCredentials credentials);
}

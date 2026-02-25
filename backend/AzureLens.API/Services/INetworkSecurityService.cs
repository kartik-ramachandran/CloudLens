using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface INetworkSecurityService
{
    Task<NetworkSecurityReport> GetNetworkSecurityReportAsync(AzureCredentials credentials);
}

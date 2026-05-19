using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface INetworkSecurityService
{
    Task<NetworkSecurityReport> GetNetworkSecurityReportAsync(AzureCredentials credentials);
}

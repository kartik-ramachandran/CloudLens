using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IChangeManagementService
{
    Task<ChangeManagementReport> GetActivityLogAsync(AzureCredentials credentials, int days = 30);
}

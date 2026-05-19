using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IChangeManagementService
{
    Task<ChangeManagementReport> GetActivityLogAsync(AzureCredentials credentials, int days = 30);
}

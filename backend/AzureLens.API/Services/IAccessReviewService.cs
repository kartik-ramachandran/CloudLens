using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IAccessReviewService
{
    Task<AccessReviewSummary> GetAccessReviewAsync(AzureCredentials credentials);
}

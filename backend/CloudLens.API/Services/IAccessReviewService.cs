using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IAccessReviewService
{
    Task<AccessReviewSummary> GetAccessReviewAsync(AzureCredentials credentials);
}

using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IAvailabilityService
{
    Task<AvailabilityReport> GetAvailabilityReportAsync(AzureCredentials credentials);
}

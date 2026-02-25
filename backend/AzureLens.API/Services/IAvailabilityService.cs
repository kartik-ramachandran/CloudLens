using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IAvailabilityService
{
    Task<AvailabilityReport> GetAvailabilityReportAsync(AzureCredentials credentials);
}

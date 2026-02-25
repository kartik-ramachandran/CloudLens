using AzureLens.API.Models;

namespace AzureLens.API.Services;

public interface IRemediationService
{
    Task<List<RemediationItem>> GetAllAsync(string? subscriptionId = null);
    Task<RemediationItem> CreateAsync(RemediationItemDto dto);
    Task<RemediationItem?> UpdateAsync(int id, RemediationItemDto dto);
    Task<bool> DeleteAsync(int id);
    Task<RemediationItem?> CreateJiraTicketAsync(int id);
}

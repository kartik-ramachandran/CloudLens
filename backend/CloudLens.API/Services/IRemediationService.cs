using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IRemediationService
{
    Task<List<RemediationItem>> GetAllAsync(string? subscriptionId = null);
    Task<RemediationItem> CreateAsync(RemediationItemDto dto);
    Task<RemediationItem?> UpdateAsync(int id, RemediationItemDto dto);
    Task<bool> DeleteAsync(int id);
    Task<RemediationItem?> CreateJiraTicketAsync(int id);
}

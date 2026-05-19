using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface ICostAlertService
{
    Task<List<CostAlertRule>> GetAlertRulesAsync(string sessionId);
    Task<CostAlertRule?> GetAlertRuleByIdAsync(int id);
    Task<CostAlertRule> CreateAlertRuleAsync(CostAlertRuleDto dto, string createdBy);
    Task<CostAlertRule?> UpdateAlertRuleAsync(int id, CostAlertRuleDto dto);
    Task<bool> DeleteAlertRuleAsync(int id);
    Task<bool> ToggleAlertRuleAsync(int id, bool isEnabled);
    
    Task<List<CostAlertHistory>> GetAlertHistoryAsync(string sessionId, int? alertRuleId = null, int pageSize = 50);
    Task<CostAlertHistory?> AcknowledgeAlertAsync(int alertId, string acknowledgedBy);
    Task<CostAlertHistory?> ResolveAlertAsync(int alertId);
    
    // Background job method
    Task EvaluateAlertRulesAsync();
}

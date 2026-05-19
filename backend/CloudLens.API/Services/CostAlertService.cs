using CloudLens.API.Data;
using CloudLens.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudLens.API.Services;

public class CostAlertService : ICostAlertService
{
    private readonly AppDbContext _context;
    private readonly IFinOpsService _finOpsService;
    private readonly ILogger<CostAlertService> _logger;

    public CostAlertService(
        AppDbContext context, 
        IFinOpsService finOpsService,
        ILogger<CostAlertService> logger)
    {
        _context = context;
        _finOpsService = finOpsService;
        _logger = logger;
    }

    public async Task<List<CostAlertRule>> GetAlertRulesAsync(string sessionId)
    {
        return await _context.CostAlertRules
            .Where(r => r.SessionId == sessionId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<CostAlertRule?> GetAlertRuleByIdAsync(int id)
    {
        return await _context.CostAlertRules.FindAsync(id);
    }

    public async Task<CostAlertRule> CreateAlertRuleAsync(CostAlertRuleDto dto, string createdBy)
    {
        var rule = new CostAlertRule
        {
            Name = dto.Name,
            Description = dto.Description,
            AlertType = dto.AlertType,
            ThresholdAmount = dto.ThresholdAmount,
            Currency = dto.Currency,
            ThresholdOperator = dto.ThresholdOperator,
            SubscriptionId = dto.SubscriptionId,
            ResourceType = dto.ResourceType,
            ResourceGroup = dto.ResourceGroup,
            ServiceName = dto.ServiceName,
            CheckFrequency = dto.CheckFrequency,
            IsEnabled = dto.IsEnabled,
            NotificationEmail = dto.NotificationEmail,
            SendJiraTicket = dto.SendJiraTicket,
            SessionId = dto.SessionId,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CostAlertRules.Add(rule);
        await _context.SaveChangesAsync();
        return rule;
    }

    public async Task<CostAlertRule?> UpdateAlertRuleAsync(int id, CostAlertRuleDto dto)
    {
        var rule = await _context.CostAlertRules.FindAsync(id);
        if (rule == null) return null;

        rule.Name = dto.Name;
        rule.Description = dto.Description;
        rule.AlertType = dto.AlertType;
        rule.ThresholdAmount = dto.ThresholdAmount;
        rule.Currency = dto.Currency;
        rule.ThresholdOperator = dto.ThresholdOperator;
        rule.SubscriptionId = dto.SubscriptionId;
        rule.ResourceType = dto.ResourceType;
        rule.ResourceGroup = dto.ResourceGroup;
        rule.ServiceName = dto.ServiceName;
        rule.CheckFrequency = dto.CheckFrequency;
        rule.IsEnabled = dto.IsEnabled;
        rule.NotificationEmail = dto.NotificationEmail;
        rule.SendJiraTicket = dto.SendJiraTicket;
        rule.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return rule;
    }

    public async Task<bool> DeleteAlertRuleAsync(int id)
    {
        var rule = await _context.CostAlertRules.FindAsync(id);
        if (rule == null) return false;

        _context.CostAlertRules.Remove(rule);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleAlertRuleAsync(int id, bool isEnabled)
    {
        var rule = await _context.CostAlertRules.FindAsync(id);
        if (rule == null) return false;

        rule.IsEnabled = isEnabled;
        rule.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<CostAlertHistory>> GetAlertHistoryAsync(string sessionId, int? alertRuleId = null, int pageSize = 50)
    {
        var query = _context.CostAlertHistory
            .Include(h => h.AlertRule)
            .Where(h => h.AlertRule!.SessionId == sessionId);

        if (alertRuleId.HasValue)
        {
            query = query.Where(h => h.AlertRuleId == alertRuleId.Value);
        }

        return await query
            .OrderByDescending(h => h.TriggeredAt)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<CostAlertHistory?> AcknowledgeAlertAsync(int alertId, string acknowledgedBy)
    {
        var alert = await _context.CostAlertHistory.FindAsync(alertId);
        if (alert == null) return null;

        alert.Status = "Acknowledged";
        alert.AcknowledgedAt = DateTime.UtcNow;
        alert.AcknowledgedBy = acknowledgedBy;
        await _context.SaveChangesAsync();
        return alert;
    }

    public async Task<CostAlertHistory?> ResolveAlertAsync(int alertId)
    {
        var alert = await _context.CostAlertHistory.FindAsync(alertId);
        if (alert == null) return null;

        alert.Status = "Resolved";
        alert.ResolvedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return alert;
    }

    public async Task EvaluateAlertRulesAsync()
    {
        _logger.LogInformation("Starting alert rule evaluation...");

        var enabledRules = await _context.CostAlertRules
            .Where(r => r.IsEnabled)
            .ToListAsync();

        _logger.LogInformation($"Found {enabledRules.Count} enabled alert rules");

        foreach (var rule in enabledRules)
        {
            try
            {
                await EvaluateSingleRuleAsync(rule);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error evaluating alert rule {rule.Id}: {rule.Name}");
            }
        }

        _logger.LogInformation("Alert rule evaluation completed");
    }

    private async Task EvaluateSingleRuleAsync(CostAlertRule rule)
    {
        // Check if we should evaluate based on frequency
        if (!ShouldEvaluateRule(rule))
        {
            return;
        }

        _logger.LogInformation($"Evaluating rule: {rule.Name} (ID: {rule.Id})");

        // Get actual cost based on alert type
        decimal actualCost = 0;
        string details = "";

        try
        {
            switch (rule.AlertType)
            {
                case "DailyCost":
                    actualCost = await GetDailyCostAsync(rule);
                    details = $"Daily cost for {DateTime.UtcNow:yyyy-MM-dd}";
                    break;
                case "MonthlyCost":
                    actualCost = await GetMonthlyCostAsync(rule);
                    details = $"Monthly cost for {DateTime.UtcNow:yyyy-MM}";
                    break;
                case "ResourceCost":
                    actualCost = await GetResourceCostAsync(rule);
                    details = $"Resource cost for {rule.ResourceType ?? "all resources"}";
                    break;
                case "ServiceCost":
                    actualCost = await GetServiceCostAsync(rule);
                    details = $"Service cost for {rule.ServiceName ?? "all services"}";
                    break;
                default:
                    _logger.LogWarning($"Unknown alert type: {rule.AlertType}");
                    return;
            }

            // Evaluate threshold
            bool thresholdExceeded = EvaluateThreshold(actualCost, rule.ThresholdAmount, rule.ThresholdOperator);

            // Update rule check time
            rule.LastCheckedAt = DateTime.UtcNow;

            if (thresholdExceeded)
            {
                _logger.LogWarning($"Alert triggered: {rule.Name} - Actual: {actualCost:C}, Threshold: {rule.ThresholdAmount:C}");

                // Create alert history entry
                var alertHistory = new CostAlertHistory
                {
                    AlertRuleId = rule.Id,
                    AlertRuleName = rule.Name,
                    ActualAmount = actualCost,
                    ThresholdAmount = rule.ThresholdAmount,
                    Currency = rule.Currency,
                    SubscriptionId = rule.SubscriptionId ?? "all",
                    ResourceType = rule.ResourceType,
                    ResourceGroup = rule.ResourceGroup,
                    ServiceName = rule.ServiceName,
                    Status = "Triggered",
                    TriggeredAt = DateTime.UtcNow,
                    Details = details
                };

                _context.CostAlertHistory.Add(alertHistory);
                
                rule.LastTriggeredAt = DateTime.UtcNow;
                rule.TriggerCount++;

                // TODO: Send notifications (email, Jira ticket)
                // if (rule.NotificationEmail != null)
                // {
                //     await SendEmailNotificationAsync(rule, alertHistory);
                // }
                // if (rule.SendJiraTicket)
                // {
                //     await CreateJiraTicketAsync(rule, alertHistory);
                // }
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error evaluating rule {rule.Id}: {rule.Name}");
        }
    }

    private bool ShouldEvaluateRule(CostAlertRule rule)
    {
        if (rule.LastCheckedAt == null) return true;

        var timeSinceLastCheck = DateTime.UtcNow - rule.LastCheckedAt.Value;

        return rule.CheckFrequency switch
        {
            "Hourly" => timeSinceLastCheck.TotalHours >= 1,
            "Daily" => timeSinceLastCheck.TotalDays >= 1,
            "Weekly" => timeSinceLastCheck.TotalDays >= 7,
            _ => false
        };
    }

    private bool EvaluateThreshold(decimal actualValue, decimal thresholdValue, string operatorType)
    {
        return operatorType switch
        {
            "GreaterThan" => actualValue > thresholdValue,
            "LessThan" => actualValue < thresholdValue,
            "Equal" => actualValue == thresholdValue,
            "GreaterThanOrEqual" => actualValue >= thresholdValue,
            "LessThanOrEqual" => actualValue <= thresholdValue,
            _ => false
        };
    }

    private async Task<decimal> GetDailyCostAsync(CostAlertRule rule)
    {
        // Get costs from cache for today
        var today = DateTime.UtcNow.Date;
        
        var query = _context.CachedCosts.AsQueryable();

        if (!string.IsNullOrEmpty(rule.SubscriptionId))
        {
            query = query.Where(c => c.SubscriptionId == rule.SubscriptionId);
        }

        var costs = await query
            .Where(c => c.CachedAt >= today)
            .ToListAsync();

        return costs.Sum(c => c.TotalCost);
    }

    private async Task<decimal> GetMonthlyCostAsync(CostAlertRule rule)
    {
        // Get costs from cache for current month
        var firstDayOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        
        var query = _context.CachedCosts.AsQueryable();

        if (!string.IsNullOrEmpty(rule.SubscriptionId))
        {
            query = query.Where(c => c.SubscriptionId == rule.SubscriptionId);
        }

        var costs = await query
            .Where(c => c.CachedAt >= firstDayOfMonth)
            .ToListAsync();

        return costs.Sum(c => c.TotalCost);
    }

    private async Task<decimal> GetResourceCostAsync(CostAlertRule rule)
    {
        var query = _context.CachedResourceCosts.AsQueryable();

        if (!string.IsNullOrEmpty(rule.SubscriptionId))
        {
            query = query.Where(c => c.ResourceId.Contains(rule.SubscriptionId));
        }

        if (!string.IsNullOrEmpty(rule.ResourceType))
        {
            query = query.Where(c => c.ResourceType == rule.ResourceType);
        }

        if (!string.IsNullOrEmpty(rule.ResourceGroup))
        {
            query = query.Where(c => c.ResourceGroup == rule.ResourceGroup);
        }

        var costs = await query.ToListAsync();
        return costs.Sum(c => c.TotalCost);
    }

    private async Task<decimal> GetServiceCostAsync(CostAlertRule rule)
    {
        // This would need to query cost by service name from the cost data
        // For now, return a simplified version
        var query = _context.CachedCosts.AsQueryable();

        if (!string.IsNullOrEmpty(rule.SubscriptionId))
        {
            query = query.Where(c => c.SubscriptionId == rule.SubscriptionId);
        }

        var costs = await query.ToListAsync();
        
        // Filter by service name from the cost breakdown (this is a simplified approach)
        // In a real scenario, you'd need to parse the service costs from the cached data
        return costs.Sum(c => c.TotalCost);
    }
}

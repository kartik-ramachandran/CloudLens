using CloudLens.API.Data;
using CloudLens.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CloudLens.API.Services;

public class RemediationService : IRemediationService
{
    private readonly AppDbContext _db;
    private readonly IJiraService _jira;
    private readonly ILogger<RemediationService> _logger;

    public RemediationService(AppDbContext db, IJiraService jira, ILogger<RemediationService> logger)
    {
        _db = db;
        _jira = jira;
        _logger = logger;
    }

    public async Task<List<RemediationItem>> GetAllAsync(string? subscriptionId = null)
    {
        var q = _db.RemediationItems.AsQueryable();
        if (!string.IsNullOrEmpty(subscriptionId))
            q = q.Where(r => r.SubscriptionId == subscriptionId);
        return await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    public async Task<RemediationItem> CreateAsync(RemediationItemDto dto)
    {
        var item = new RemediationItem
        {
            ControlId = dto.ControlId,
            GapDescription = dto.GapDescription,
            Severity = dto.Severity,
            Owner = dto.Owner,
            TargetDate = dto.TargetDate,
            Status = dto.Status,
            SubscriptionId = dto.SubscriptionId,
            ResourceId = dto.ResourceId,
            RemediationSteps = dto.RemediationSteps,
            Notes = dto.Notes
        };
        _db.RemediationItems.Add(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task<RemediationItem?> UpdateAsync(int id, RemediationItemDto dto)
    {
        var item = await _db.RemediationItems.FindAsync(id);
        if (item == null) return null;
        item.Owner = dto.Owner;
        item.TargetDate = dto.TargetDate;
        item.Status = dto.Status;
        item.Notes = dto.Notes;
        item.RemediationSteps = dto.RemediationSteps;
        item.UpdatedAt = DateTime.UtcNow.ToString("O");
        if (dto.Status == "Resolved" && item.ResolvedAt == null)
            item.ResolvedAt = DateTime.UtcNow.ToString("O");
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var item = await _db.RemediationItems.FindAsync(id);
        if (item == null) return false;
        _db.RemediationItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<RemediationItem?> CreateJiraTicketAsync(int id)
    {
        var item = await _db.RemediationItems.FindAsync(id);
        if (item == null) return null;
        try
        {
            var ticket = await _jira.CreateTicketAsync(new CreateJiraTicketRequest
            {
                Summary = $"[SOC2] {item.ControlId}: {item.GapDescription}",
                Description = $"**Control:** {item.ControlId}\n\n**Gap:** {item.GapDescription}\n\n**Severity:** {item.Severity}\n\n**Steps:**\n{item.RemediationSteps}",
                Priority = item.Severity switch { "Critical" => "Highest", "High" => "High", _ => "Medium" },
                IssueType = "Task"
            });
            if (ticket.Success)
            {
                item.JiraTicketKey = ticket.TicketKey;
                item.JiraTicketUrl = ticket.TicketUrl;
                item.UpdatedAt = DateTime.UtcNow.ToString("O");
                await _db.SaveChangesAsync();
            }
        }
        catch (Exception ex) { _logger.LogError(ex, "Jira ticket error for remediation {Id}", id); }
        return item;
    }
}

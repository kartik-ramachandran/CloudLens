using Microsoft.EntityFrameworkCore;
using AzureLens.API.Data;
using AzureLens.API.Models;

namespace AzureLens.API.Services;

public class SocIncidentService : ISocIncidentService
{
    private readonly AppDbContext _context;
    private readonly IAutoRemediationService _autoRemediationService;
    private readonly INotificationService _notificationService;
    private readonly IJiraService _jiraService;
    private readonly ILogger<SocIncidentService> _logger;

    public SocIncidentService(
        AppDbContext context,
        IAutoRemediationService autoRemediationService,
        INotificationService notificationService,
        IJiraService jiraService,
        ILogger<SocIncidentService> logger)
    {
        _context = context;
        _autoRemediationService = autoRemediationService;
        _notificationService = notificationService;
        _jiraService = jiraService;
        _logger = logger;
    }

    public async Task<List<SocIncidentDto>> GetIncidentsAsync(string? tier = null, string? status = null, string? subscriptionId = null)
    {
        var query = _context.SocIncidents.AsQueryable();

        if (!string.IsNullOrEmpty(tier) && Enum.TryParse<SocTier>(tier, true, out var tierEnum))
        {
            query = query.Where(i => i.CurrentTier == tierEnum);
        }

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<IncidentStatus>(status, true, out var statusEnum))
        {
            query = query.Where(i => i.Status == statusEnum);
        }

        if (!string.IsNullOrEmpty(subscriptionId))
        {
            query = query.Where(i => i.SubscriptionId == subscriptionId);
        }

        var incidents = await query
            .OrderByDescending(i => i.DetectedAt)
            .Take(100)
            .ToListAsync();

        var result = new List<SocIncidentDto>();

        foreach (var incident in incidents)
        {
            var attempts = await _context.RemediationAttempts
                .Where(a => a.IncidentId == incident.Id)
                .OrderByDescending(a => a.AttemptedAt)
                .ToListAsync();

            result.Add(MapToDto(incident, attempts));
        }

        return result;
    }

    public async Task<SocIncidentDto?> GetIncidentByIdAsync(int id)
    {
        var incident = await _context.SocIncidents.FindAsync(id);
        if (incident == null) return null;

        var attempts = await _context.RemediationAttempts
            .Where(a => a.IncidentId == id)
            .OrderByDescending(a => a.AttemptedAt)
            .ToListAsync();

        return MapToDto(incident, attempts);
    }

    public async Task<SocIncidentDto> CreateIncidentAsync(CreateIncidentRequest request)
    {
        var incident = new SocIncident
        {
            Title = request.Title,
            Description = request.Description,
            Severity = Enum.Parse<IncidentSeverity>(request.Severity, true),
            Status = IncidentStatus.New,
            CurrentTier = SocTier.SOC1,
            SubscriptionId = request.SubscriptionId,
            ResourceId = request.ResourceId,
            ResourceType = request.ResourceType,
            SourceAlert = request.SourceAlert ?? string.Empty
        };

        _context.SocIncidents.Add(incident);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created SOC incident {IncidentId}: {Title}", incident.IncidentId, incident.Title);

        return MapToDto(incident, new List<RemediationAttempt>());
    }

    public async Task<RemediationAttemptDto> ProcessSoc1RemediationAsync(int incidentId, AzureCredentials credentials)
    {
        var incident = await _context.SocIncidents.FindAsync(incidentId);
        if (incident == null)
            throw new ArgumentException($"Incident {incidentId} not found");

        if (incident.CurrentTier != SocTier.SOC1)
            throw new InvalidOperationException($"Incident is at {incident.CurrentTier}, not SOC1");

        // Check if auto-remediation is supported
        if (!_autoRemediationService.SupportsAutoRemediation(incident.ResourceType))
        {
            _logger.LogWarning("Resource type {ResourceType} does not support auto-remediation", incident.ResourceType);
            
            // Immediately escalate to SOC2
            await EscalateIncidentAsync(incidentId, "Auto-remediation not supported for this resource type");
            
            throw new NotSupportedException($"Auto-remediation not supported for {incident.ResourceType}");
        }

        incident.Status = IncidentStatus.InProgress;
        await _context.SaveChangesAsync();

        // Attempt auto-remediation
        var attempt = await _autoRemediationService.AttemptRemediationAsync(incident, credentials);
        attempt.IncidentId = incidentId;
        
        _context.RemediationAttempts.Add(attempt);
        await _context.SaveChangesAsync();

        if (attempt.Status == RemediationStatus.Success)
        {
            // Remediation succeeded - mark incident as remediated
            incident.Status = IncidentStatus.Remediated;
            incident.ResolvedAt = DateTime.UtcNow;
            
            _logger.LogInformation("SOC1 auto-remediation succeeded for incident {IncidentId}", incident.IncidentId);

            // Send success notification
            await SendNotificationAsync(incident, "SOC1 Auto-Remediation Successful", 
                $"Incident automatically remediated: {incident.Title}");
        }
        else
        {
            // Remediation failed - escalate to SOC2
            _logger.LogWarning("SOC1 auto-remediation failed for incident {IncidentId}, escalating to SOC2", incident.IncidentId);
            
            await EscalateToSoc2Async(incident, $"SOC1 auto-remediation failed: {attempt.ErrorMessage}");
        }

        await _context.SaveChangesAsync();

        return MapAttemptToDto(attempt);
    }

    public async Task<SocIncidentDto> EscalateIncidentAsync(int incidentId, string reason, string? assignedTo = null)
    {
        var incident = await _context.SocIncidents.FindAsync(incidentId);
        if (incident == null)
            throw new ArgumentException($"Incident {incidentId} not found");

        var nextTier = incident.CurrentTier switch
        {
            SocTier.SOC1 => SocTier.SOC2,
            SocTier.SOC2 => SocTier.SOC3,
            SocTier.SOC3 => SocTier.SOC3, // Already at highest tier
            _ => SocTier.SOC1
        };

        if (nextTier == incident.CurrentTier && incident.CurrentTier == SocTier.SOC3)
        {
            _logger.LogWarning("Incident {IncidentId} is already at SOC3, cannot escalate further", incident.IncidentId);
        }
        else
        {
            incident.CurrentTier = nextTier;
            incident.EscalationCount++;
            incident.LastEscalatedAt = DateTime.UtcNow;
            incident.Status = IncidentStatus.Escalated;
            incident.AssignedTo = assignedTo;
            incident.Notes += $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Escalated to {nextTier}: {reason}";

            _logger.LogInformation("Escalated incident {IncidentId} to {NextTier}", incident.IncidentId, nextTier);

            // Send escalation notification
            await SendNotificationAsync(incident, $"Incident Escalated to {nextTier}", 
                $"Reason: {reason}\nIncident: {incident.Title}");

            // Create Jira ticket for SOC2+ incidents if not already created
            if (nextTier >= SocTier.SOC2 && string.IsNullOrEmpty(incident.JiraTicketKey))
            {
                await CreateJiraTicketForIncidentAsync(incident);
            }

            await _context.SaveChangesAsync();
        }

        var attempts = await _context.RemediationAttempts
            .Where(a => a.IncidentId == incidentId)
            .OrderByDescending(a => a.AttemptedAt)
            .ToListAsync();

        return MapToDto(incident, attempts);
    }

    public async Task<SocIncidentDto> CloseIncidentAsync(int incidentId, string resolution)
    {
        var incident = await _context.SocIncidents.FindAsync(incidentId);
        if (incident == null)
            throw new ArgumentException($"Incident {incidentId} not found");

        incident.Status = IncidentStatus.Closed;
        incident.ResolvedAt = DateTime.UtcNow;
        incident.Notes += $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Closed: {resolution}";

        await _context.SaveChangesAsync();

        _logger.LogInformation("Closed incident {IncidentId}", incident.IncidentId);

        var attempts = await _context.RemediationAttempts
            .Where(a => a.IncidentId == incidentId)
            .OrderByDescending(a => a.AttemptedAt)
            .ToListAsync();

        return MapToDto(incident, attempts);
    }

    public async Task<RemediationAttemptDto> RecordManualRemediationAsync(int incidentId, string remediationType, string actionsTaken, bool success)
    {
        var incident = await _context.SocIncidents.FindAsync(incidentId);
        if (incident == null)
            throw new ArgumentException($"Incident {incidentId} not found");

        var attempt = new RemediationAttempt
        {
            IncidentId = incidentId,
            Tier = incident.CurrentTier,
            RemediationType = remediationType,
            Status = success ? RemediationStatus.Success : RemediationStatus.Failed,
            IsAutomated = false,
            PerformedBy = incident.AssignedTo ?? "Manual",
            ActionsTaken = actionsTaken,
            CompletedAt = DateTime.UtcNow
        };

        _context.RemediationAttempts.Add(attempt);

        if (success)
        {
            incident.Status = IncidentStatus.Remediated;
            incident.ResolvedAt = DateTime.UtcNow;
            
            _logger.LogInformation("{Tier} manual remediation succeeded for incident {IncidentId}", 
                incident.CurrentTier, incident.IncidentId);
        }
        else if (incident.CurrentTier < SocTier.SOC3)
        {
            // Failed at SOC2 - escalate to SOC3
            await EscalateToSoc3Async(incident, $"{incident.CurrentTier} remediation failed");
        }

        await _context.SaveChangesAsync();

        return MapAttemptToDto(attempt);
    }

    public async Task<SocDashboardStats> GetDashboardStatsAsync(string? subscriptionId = null)
    {
        var query = _context.SocIncidents.AsQueryable();
        
        if (!string.IsNullOrEmpty(subscriptionId))
        {
            query = query.Where(i => i.SubscriptionId == subscriptionId);
        }

        var totalIncidents = await query.CountAsync();
        var activeIncidents = await query.Where(i => i.Status != IncidentStatus.Closed && i.Status != IncidentStatus.Remediated).CountAsync();
        
        var soc1Count = await query.Where(i => i.CurrentTier == SocTier.SOC1).CountAsync();
        var soc2Count = await query.Where(i => i.CurrentTier == SocTier.SOC2).CountAsync();
        var soc3Count = await query.Where(i => i.CurrentTier == SocTier.SOC3).CountAsync();

        var today = DateTime.UtcNow.Date;
        var autoRemediatedToday = await _context.RemediationAttempts
            .Where(a => a.IsAutomated && a.Status == RemediationStatus.Success && a.AttemptedAt >= today)
            .CountAsync();

        var escalatedToday = await query
            .Where(i => i.LastEscalatedAt != null && i.LastEscalatedAt >= today)
            .CountAsync();

        var resolvedIncidents = await query
            .Where(i => i.ResolvedAt != null)
            .ToListAsync();

        var avgResolutionTime = resolvedIncidents.Any()
            ? resolvedIncidents.Average(i => (i.ResolvedAt!.Value - i.DetectedAt).TotalHours)
            : 0;

        var allAttempts = await _context.RemediationAttempts
            .Where(a => a.IsAutomated)
            .ToListAsync();

        var successRate = allAttempts.Any()
            ? (double)allAttempts.Count(a => a.Status == RemediationStatus.Success) / allAttempts.Count * 100
            : 0;

        var recentIncidents = await GetIncidentsAsync(subscriptionId: subscriptionId);

        var topTypes = await _context.RemediationAttempts
            .GroupBy(a => a.RemediationType)
            .Select(g => new TopRemediationType
            {
                Type = g.Key,
                Count = g.Count(),
                SuccessCount = g.Count(a => a.Status == RemediationStatus.Success)
            })
            .OrderByDescending(t => t.Count)
            .Take(5)
            .ToListAsync();

        return new SocDashboardStats
        {
            TotalIncidents = totalIncidents,
            ActiveIncidents = activeIncidents,
            Soc1Incidents = soc1Count,
            Soc2Incidents = soc2Count,
            Soc3Incidents = soc3Count,
            AutoRemediatedToday = autoRemediatedToday,
            EscalatedToday = escalatedToday,
            AvgResolutionTimeHours = Math.Round(avgResolutionTime, 2),
            AutoRemediationSuccessRate = Math.Round(successRate, 2),
            RecentIncidents = recentIncidents.Take(10).ToList(),
            TopRemediationTypes = topTypes
        };
    }

    private async Task EscalateToSoc2Async(SocIncident incident, string reason)
    {
        incident.CurrentTier = SocTier.SOC2;
        incident.EscalationCount++;
        incident.LastEscalatedAt = DateTime.UtcNow;
        incident.Status = IncidentStatus.Escalated;
        incident.Notes += $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Auto-escalated to SOC2: {reason}";

        _logger.LogInformation("Auto-escalated incident {IncidentId} to SOC2", incident.IncidentId);

        await SendNotificationAsync(incident, "Incident Escalated to SOC2", 
            $"SOC1 auto-remediation failed. Reason: {reason}\nIncident: {incident.Title}");

        await CreateJiraTicketForIncidentAsync(incident);
    }

    private async Task EscalateToSoc3Async(SocIncident incident, string reason)
    {
        incident.CurrentTier = SocTier.SOC3;
        incident.EscalationCount++;
        incident.LastEscalatedAt = DateTime.UtcNow;
        incident.Status = IncidentStatus.Escalated;
        incident.Notes += $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Auto-escalated to SOC3: {reason}";

        _logger.LogInformation("Auto-escalated incident {IncidentId} to SOC3 (CRITICAL)", incident.IncidentId);

        await SendNotificationAsync(incident, "CRITICAL: Incident Escalated to SOC3", 
            $"SOC2 remediation failed. Immediate attention required.\nReason: {reason}\nIncident: {incident.Title}");
    }

    private async Task CreateJiraTicketForIncidentAsync(SocIncident incident)
    {
        try
        {
            var jiraRequest = new CreateJiraTicketRequest
            {
                Summary = $"[{incident.CurrentTier}] {incident.Title}",
                Description = $"{incident.Description}\n\nSubscription: {incident.SubscriptionId}\nResource: {incident.ResourceId}\nDetected: {incident.DetectedAt:yyyy-MM-dd HH:mm} UTC",
                IssueType = "Incident",
                Priority = incident.Severity switch
                {
                    IncidentSeverity.Critical => "Highest",
                    IncidentSeverity.High => "High",
                    IncidentSeverity.Medium => "Medium",
                    _ => "Low"
                },
                AlertId = incident.SourceAlert,
                SubscriptionId = incident.SubscriptionId,
                ResourceId = incident.ResourceId
            };

            var ticket = await _jiraService.CreateTicketAsync(jiraRequest);
            incident.JiraTicketKey = ticket.TicketKey;
            
            _logger.LogInformation("Created Jira ticket {TicketKey} for incident {IncidentId}", ticket.TicketKey, incident.IncidentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Jira ticket for incident {IncidentId}", incident.IncidentId);
        }
    }

    private async Task SendNotificationAsync(SocIncident incident, string subject, string message)
    {
        try
        {
            var severity = incident.Severity.ToString().ToLower();
            await _notificationService.SendNotificationAsync(subject, message, severity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification for incident {IncidentId}", incident.IncidentId);
        }
    }

    private SocIncidentDto MapToDto(SocIncident incident, List<RemediationAttempt> attempts)
    {
        return new SocIncidentDto
        {
            Id = incident.Id,
            IncidentId = incident.IncidentId,
            Title = incident.Title,
            Description = incident.Description,
            Severity = incident.Severity.ToString(),
            Status = incident.Status.ToString(),
            CurrentTier = incident.CurrentTier.ToString(),
            DetectedAt = incident.DetectedAt,
            ResolvedAt = incident.ResolvedAt,
            SubscriptionId = incident.SubscriptionId,
            ResourceId = incident.ResourceId,
            ResourceType = incident.ResourceType,
            AssignedTo = incident.AssignedTo,
            JiraTicketKey = incident.JiraTicketKey,
            EscalationCount = incident.EscalationCount,
            LastEscalatedAt = incident.LastEscalatedAt,
            Attempts = attempts.Select(MapAttemptToDto).ToList()
        };
    }

    private RemediationAttemptDto MapAttemptToDto(RemediationAttempt attempt)
    {
        return new RemediationAttemptDto
        {
            Id = attempt.Id,
            Tier = attempt.Tier.ToString(),
            RemediationType = attempt.RemediationType,
            Status = attempt.Status.ToString(),
            AttemptedAt = attempt.AttemptedAt,
            CompletedAt = attempt.CompletedAt,
            ErrorMessage = attempt.ErrorMessage,
            IsAutomated = attempt.IsAutomated,
            PerformedBy = attempt.PerformedBy
        };
    }
}

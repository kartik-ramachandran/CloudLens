using Microsoft.EntityFrameworkCore;
using AzureLens.API.Data.Entities;
using AzureLens.API.Models;

namespace AzureLens.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Entities.CachedResource> CachedResources { get; set; }
    public DbSet<Entities.CachedCost> CachedCosts { get; set; }
    public DbSet<Entities.CachedMonthlyCost> CachedMonthlyCosts { get; set; }
    public DbSet<Entities.CachedResourceCost> CachedResourceCosts { get; set; }
    public DbSet<CachedAIRecommendation> CachedAIRecommendations { get; set; }
    public DbSet<AISettings> AISettings { get; set; }
    public DbSet<JiraSettings> JiraSettings { get; set; }

    // FinOps, Compliance, and Vanta tables
    public DbSet<VantaSettings> VantaSettings { get; set; }
    public DbSet<VantaSyncLog> VantaSyncLogs { get; set; }
    public DbSet<AuditLogEntry> AuditLogs { get; set; }

    // SOC2 Extended
    public DbSet<RemediationItem> RemediationItems { get; set; }
    public DbSet<ComplianceSnapshot> ComplianceSnapshots { get; set; }

    // SOC Incident Management
    public DbSet<SocIncident> SocIncidents { get; set; }
    public DbSet<RemediationAttempt> RemediationAttempts { get; set; }

    // Cost Alerts
    public DbSet<CostAlertRule> CostAlertRules { get; set; }
    public DbSet<CostAlertHistory> CostAlertHistory { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Entities.CachedResource>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ResourceId);
            entity.HasIndex(e => e.SubscriptionId);
            entity.HasIndex(e => e.CachedAt);
        });

        modelBuilder.Entity<Entities.CachedCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SubscriptionId);
            entity.HasIndex(e => e.CachedAt);
        });

        modelBuilder.Entity<Entities.CachedMonthlyCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ContextHash);
            entity.HasIndex(e => e.CachedAt);
        });

        modelBuilder.Entity<Entities.CachedResourceCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ContextHash);
            entity.HasIndex(e => e.ResourceId);
            entity.HasIndex(e => e.CachedAt);
        });

        modelBuilder.Entity<CachedAIRecommendation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CachedAt);
        });

        modelBuilder.Entity<AISettings>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UpdatedAt);
        });

        modelBuilder.Entity<JiraSettings>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.LastModified);
        });

        modelBuilder.Entity<VantaSettings>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.LastModified);
        });

        modelBuilder.Entity<VantaSyncLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.StartedAt);
            entity.HasIndex(e => e.SyncType);
        });

        modelBuilder.Entity<AuditLogEntry>(entity =>
        {
            entity.HasKey(e => e.LogId);
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => e.Actor);
        });

        modelBuilder.Entity<RemediationItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SubscriptionId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ControlId);
        });

        modelBuilder.Entity<ComplianceSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SubscriptionId);
            entity.HasIndex(e => e.SnapshotDate);
            entity.HasIndex(e => e.ControlId);
        });

        modelBuilder.Entity<SocIncident>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.IncidentId).IsUnique();
            entity.HasIndex(e => e.SubscriptionId);
            entity.HasIndex(e => e.CurrentTier);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.DetectedAt);
        });

        modelBuilder.Entity<RemediationAttempt>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.IncidentId);
            entity.HasIndex(e => e.Tier);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.AttemptedAt);
        });

        modelBuilder.Entity<CostAlertRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionId);
            entity.HasIndex(e => e.IsEnabled);
            entity.HasIndex(e => e.AlertType);
            entity.HasIndex(e => e.SubscriptionId);
            entity.HasIndex(e => e.LastCheckedAt);
            entity.Property(e => e.ThresholdAmount).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<CostAlertHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.AlertRuleId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TriggeredAt);
            entity.Property(e => e.ActualAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ThresholdAmount).HasColumnType("decimal(18,2)");
            
            entity.HasOne(e => e.AlertRule)
                .WithMany()
                .HasForeignKey(e => e.AlertRuleId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

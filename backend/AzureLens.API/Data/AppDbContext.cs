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
    }
}

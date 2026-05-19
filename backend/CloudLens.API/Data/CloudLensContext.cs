using System;
using System.Collections.Generic;
using CloudLens.API.Models;
using CloudLens.API.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace CloudLens.API.Data;

public partial class CloudLensContext : DbContext
{
    public CloudLensContext()
    {
    }

    public CloudLensContext(DbContextOptions<CloudLensContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Aisetting> Aisettings { get; set; }

    public virtual DbSet<CachedAirecommendation> CachedAirecommendations { get; set; }

    public virtual DbSet<Models.CachedCost> CachedCosts { get; set; }

    public virtual DbSet<Models.CachedMonthlyCost> CachedMonthlyCosts { get; set; }

    public virtual DbSet<Models.CachedResource> CachedResources { get; set; }

    public virtual DbSet<Models.CachedResourceCost> CachedResourceCosts { get; set; }

    public virtual DbSet<Entities.GlobalAzureCredentials> GlobalAzureCredentials { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlite("Data Source=cloudlens.db");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Aisetting>(entity =>
        {
            entity.ToTable("AISettings");

            entity.HasIndex(e => e.UpdatedAt, "IX_AISettings_UpdatedAt");
        });

        modelBuilder.Entity<CachedAirecommendation>(entity =>
        {
            entity.ToTable("CachedAIRecommendations");

            entity.HasIndex(e => e.CachedAt, "IX_CachedAIRecommendations_CachedAt");
        });

        modelBuilder.Entity<Models.CachedCost>(entity =>
        {
            entity.HasIndex(e => e.CachedAt, "IX_CachedCosts_CachedAt");

            entity.HasIndex(e => e.SubscriptionId, "IX_CachedCosts_SubscriptionId");
        });

        modelBuilder.Entity<Models.CachedMonthlyCost>(entity =>
        {
            entity.HasIndex(e => e.CachedAt, "IX_CachedMonthlyCosts_CachedAt");

            entity.HasIndex(e => e.ContextHash, "IX_CachedMonthlyCosts_ContextHash");
        });

        modelBuilder.Entity<Models.CachedResource>(entity =>
        {
            entity.HasIndex(e => e.CachedAt, "IX_CachedResources_CachedAt");

            entity.HasIndex(e => e.ResourceId, "IX_CachedResources_ResourceId");

            entity.HasIndex(e => e.SubscriptionId, "IX_CachedResources_SubscriptionId");
        });

        modelBuilder.Entity<Models.CachedResourceCost>(entity =>
        {
            entity.HasIndex(e => e.CachedAt, "IX_CachedResourceCosts_CachedAt");

            entity.HasIndex(e => e.ContextHash, "IX_CachedResourceCosts_ContextHash");

            entity.HasIndex(e => e.ResourceId, "IX_CachedResourceCosts_ResourceId");
        });

        modelBuilder.Entity<Entities.GlobalAzureCredentials>(entity =>
        {
            entity.HasIndex(e => e.IsActive, "IX_GlobalAzureCredentials_IsActive");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

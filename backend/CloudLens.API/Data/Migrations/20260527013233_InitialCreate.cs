using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CloudLens.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AISettings",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Provider = table.Column<string>(nullable: false),
                    ApiKey = table.Column<string>(nullable: false),
                    Model = table.Column<string>(nullable: false),
                    Endpoint = table.Column<string>(nullable: true),
                    MaxTokens = table.Column<int>(nullable: false),
                    Temperature = table.Column<double>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AISettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    LogId = table.Column<string>(nullable: false),
                    EventType = table.Column<string>(nullable: false),
                    Actor = table.Column<string>(nullable: false),
                    SubscriptionId = table.Column<string>(nullable: false),
                    ResourceId = table.Column<string>(nullable: false),
                    Description = table.Column<string>(nullable: false),
                    IpAddress = table.Column<string>(nullable: false),
                    Timestamp = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.LogId);
                });

            migrationBuilder.CreateTable(
                name: "CachedAIRecommendations",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Category = table.Column<string>(nullable: false),
                    Title = table.Column<string>(nullable: false),
                    Description = table.Column<string>(nullable: false),
                    Priority = table.Column<string>(nullable: false),
                    PotentialSavings = table.Column<string>(nullable: true),
                    Effort = table.Column<string>(nullable: false),
                    ContextHash = table.Column<string>(nullable: false),
                    CachedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachedAIRecommendations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CachedCloudCosts",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Provider = table.Column<string>(nullable: false),
                    AccountId = table.Column<string>(nullable: false),
                    AccountName = table.Column<string>(nullable: false),
                    TotalCost = table.Column<decimal>(nullable: false),
                    Currency = table.Column<string>(nullable: false),
                    StartDate = table.Column<DateTime>(nullable: false),
                    EndDate = table.Column<DateTime>(nullable: false),
                    CostsByServiceJson = table.Column<string>(nullable: false),
                    MonthlyCostsJson = table.Column<string>(nullable: false),
                    CachedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachedCloudCosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CachedCosts",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SubscriptionId = table.Column<string>(nullable: false),
                    SubscriptionName = table.Column<string>(nullable: false),
                    TotalCost = table.Column<decimal>(nullable: false),
                    Currency = table.Column<string>(nullable: false),
                    StartDate = table.Column<DateTime>(nullable: false),
                    EndDate = table.Column<DateTime>(nullable: false),
                    CostsByServiceJson = table.Column<string>(nullable: false),
                    CachedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachedCosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CachedMonthlyCosts",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ContextHash = table.Column<string>(nullable: false),
                    Month = table.Column<string>(nullable: false),
                    Cost = table.Column<decimal>(nullable: false),
                    Currency = table.Column<string>(nullable: false),
                    CachedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachedMonthlyCosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CachedResourceCosts",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ContextHash = table.Column<string>(nullable: false),
                    ResourceId = table.Column<string>(nullable: false),
                    ResourceName = table.Column<string>(nullable: false),
                    ResourceType = table.Column<string>(nullable: false),
                    ResourceGroup = table.Column<string>(nullable: false),
                    TotalCost = table.Column<decimal>(nullable: false),
                    MonthlyCostsJson = table.Column<string>(nullable: false),
                    CachedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachedResourceCosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CachedResources",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResourceId = table.Column<string>(nullable: false),
                    Name = table.Column<string>(nullable: false),
                    Type = table.Column<string>(nullable: false),
                    Location = table.Column<string>(nullable: false),
                    SubscriptionId = table.Column<string>(nullable: false),
                    ResourceGroup = table.Column<string>(nullable: false),
                    TagsJson = table.Column<string>(nullable: false),
                    CachedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachedResources", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ComplianceSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SubscriptionId = table.Column<string>(nullable: false),
                    ControlId = table.Column<string>(nullable: false),
                    Status = table.Column<string>(nullable: false),
                    CompliancePercent = table.Column<double>(nullable: false),
                    PassedChecks = table.Column<int>(nullable: false),
                    FailedChecks = table.Column<int>(nullable: false),
                    SnapshotDate = table.Column<string>(nullable: false),
                    EvidenceSummaryJson = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComplianceSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CostAlertRules",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(nullable: false),
                    Description = table.Column<string>(nullable: false),
                    AlertType = table.Column<string>(nullable: false),
                    ThresholdAmount = table.Column<decimal>(nullable: false),
                    Currency = table.Column<string>(nullable: false),
                    ThresholdOperator = table.Column<string>(nullable: false),
                    SubscriptionId = table.Column<string>(nullable: true),
                    ResourceType = table.Column<string>(nullable: true),
                    ResourceGroup = table.Column<string>(nullable: true),
                    ServiceName = table.Column<string>(nullable: true),
                    CheckFrequency = table.Column<string>(nullable: false),
                    IsEnabled = table.Column<bool>(nullable: false),
                    NotificationEmail = table.Column<string>(nullable: false),
                    SendJiraTicket = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false),
                    LastCheckedAt = table.Column<DateTime>(nullable: true),
                    LastTriggeredAt = table.Column<DateTime>(nullable: true),
                    TriggerCount = table.Column<int>(nullable: false),
                    CreatedBy = table.Column<string>(nullable: false),
                    SessionId = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostAlertRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CredentialSessions",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SessionId = table.Column<string>(nullable: false),
                    TenantId = table.Column<string>(nullable: false),
                    ClientId = table.Column<string>(nullable: false),
                    ClientSecret = table.Column<string>(nullable: false),
                    SubscriptionIdsJson = table.Column<string>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    LastAccessedAt = table.Column<DateTime>(nullable: false),
                    SubscriptionCount = table.Column<int>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CredentialSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GlobalAwsCredentials",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AccessKeyId = table.Column<string>(nullable: false),
                    SecretAccessKey = table.Column<string>(nullable: false),
                    Region = table.Column<string>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlobalAwsCredentials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GlobalAzureCredentials",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<string>(nullable: false),
                    ClientId = table.Column<string>(nullable: false),
                    ClientSecret = table.Column<string>(nullable: false),
                    SubscriptionIdsJson = table.Column<string>(nullable: false),
                    SubscriptionNamesJson = table.Column<string>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false),
                    SubscriptionCount = table.Column<int>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlobalAzureCredentials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GlobalGcpCredentials",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServiceAccountJson = table.Column<string>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlobalGcpCredentials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JiraSettings",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    JiraUrl = table.Column<string>(nullable: false),
                    Username = table.Column<string>(nullable: false),
                    ApiToken = table.Column<string>(nullable: false),
                    ProjectKey = table.Column<string>(nullable: false),
                    DefaultIssueType = table.Column<string>(nullable: false),
                    IsEnabled = table.Column<bool>(nullable: false),
                    LastModified = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RemediationAttempts",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IncidentId = table.Column<int>(nullable: false),
                    Tier = table.Column<int>(nullable: false),
                    RemediationType = table.Column<string>(nullable: false),
                    Status = table.Column<int>(nullable: false),
                    AttemptedAt = table.Column<DateTime>(nullable: false),
                    CompletedAt = table.Column<DateTime>(nullable: true),
                    ErrorMessage = table.Column<string>(nullable: true),
                    ActionsTaken = table.Column<string>(nullable: false),
                    IsAutomated = table.Column<bool>(nullable: false),
                    PerformedBy = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RemediationAttempts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RemediationItems",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ControlId = table.Column<string>(nullable: false),
                    GapDescription = table.Column<string>(nullable: false),
                    Severity = table.Column<string>(nullable: false),
                    Owner = table.Column<string>(nullable: false),
                    TargetDate = table.Column<string>(nullable: false),
                    Status = table.Column<string>(nullable: false),
                    SubscriptionId = table.Column<string>(nullable: false),
                    ResourceId = table.Column<string>(nullable: false),
                    RemediationSteps = table.Column<string>(nullable: false),
                    JiraTicketKey = table.Column<string>(nullable: true),
                    JiraTicketUrl = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<string>(nullable: false),
                    UpdatedAt = table.Column<string>(nullable: true),
                    ResolvedAt = table.Column<string>(nullable: true),
                    Notes = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RemediationItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SocIncidents",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IncidentId = table.Column<string>(nullable: false),
                    Title = table.Column<string>(nullable: false),
                    Description = table.Column<string>(nullable: false),
                    Severity = table.Column<int>(nullable: false),
                    Status = table.Column<int>(nullable: false),
                    CurrentTier = table.Column<int>(nullable: false),
                    DetectedAt = table.Column<DateTime>(nullable: false),
                    ResolvedAt = table.Column<DateTime>(nullable: true),
                    SubscriptionId = table.Column<string>(nullable: false),
                    ResourceId = table.Column<string>(nullable: false),
                    ResourceType = table.Column<string>(nullable: false),
                    SourceAlert = table.Column<string>(nullable: false),
                    AssignedTo = table.Column<string>(nullable: true),
                    JiraTicketKey = table.Column<string>(nullable: true),
                    EscalationCount = table.Column<int>(nullable: false),
                    LastEscalatedAt = table.Column<DateTime>(nullable: true),
                    Notes = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocIncidents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SsoProviderConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Provider = table.Column<string>(maxLength: 50, nullable: false),
                    ClientId = table.Column<string>(maxLength: 255, nullable: false),
                    ClientSecret = table.Column<string>(maxLength: 500, nullable: false),
                    Authority = table.Column<string>(maxLength: 500, nullable: true),
                    TenantId = table.Column<string>(maxLength: 255, nullable: true),
                    RedirectUri = table.Column<string>(maxLength: 500, nullable: true),
                    Scopes = table.Column<string>(maxLength: 1000, nullable: true),
                    IsEnabled = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false),
                    OrganizationName = table.Column<string>(maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SsoProviderConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Email = table.Column<string>(maxLength: 255, nullable: false),
                    Name = table.Column<string>(maxLength: 255, nullable: false),
                    ProfilePictureUrl = table.Column<string>(maxLength: 500, nullable: true),
                    Provider = table.Column<string>(maxLength: 50, nullable: false),
                    ProviderId = table.Column<string>(maxLength: 255, nullable: false),
                    TenantId = table.Column<string>(maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    LastLoginAt = table.Column<DateTime>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false),
                    Role = table.Column<int>(nullable: false),
                    OrganizationName = table.Column<string>(maxLength: 255, nullable: true),
                    PasswordHash = table.Column<string>(maxLength: 512, nullable: true),
                    PasswordResetToken = table.Column<string>(maxLength: 128, nullable: true),
                    PasswordResetTokenExpiry = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VantaSettings",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ApiToken = table.Column<string>(nullable: false),
                    OrganizationId = table.Column<string>(nullable: false),
                    IsEnabled = table.Column<bool>(nullable: false),
                    AutoSyncEnabled = table.Column<bool>(nullable: false),
                    SyncIntervalMinutes = table.Column<int>(nullable: false),
                    SyncResources = table.Column<bool>(nullable: false),
                    SyncCompliance = table.Column<bool>(nullable: false),
                    SyncFinOps = table.Column<bool>(nullable: false),
                    LastModified = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VantaSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VantaSyncLogs",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SyncType = table.Column<string>(nullable: false),
                    Status = table.Column<string>(nullable: false),
                    ResourcesSynced = table.Column<int>(nullable: false),
                    EvidenceItemsSynced = table.Column<int>(nullable: false),
                    TestResultsSynced = table.Column<int>(nullable: false),
                    ErrorMessage = table.Column<string>(nullable: true),
                    StartedAt = table.Column<DateTime>(nullable: false),
                    CompletedAt = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VantaSyncLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CostAlertHistory",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlertRuleId = table.Column<int>(nullable: false),
                    AlertRuleName = table.Column<string>(nullable: false),
                    ActualAmount = table.Column<decimal>(nullable: false),
                    ThresholdAmount = table.Column<decimal>(nullable: false),
                    Currency = table.Column<string>(nullable: false),
                    SubscriptionId = table.Column<string>(nullable: false),
                    ResourceType = table.Column<string>(nullable: true),
                    ResourceGroup = table.Column<string>(nullable: true),
                    ServiceName = table.Column<string>(nullable: true),
                    Status = table.Column<string>(nullable: false),
                    TriggeredAt = table.Column<DateTime>(nullable: false),
                    ResolvedAt = table.Column<DateTime>(nullable: true),
                    AcknowledgedAt = table.Column<DateTime>(nullable: true),
                    AcknowledgedBy = table.Column<string>(nullable: true),
                    EmailSent = table.Column<bool>(nullable: false),
                    JiraTicketCreated = table.Column<bool>(nullable: false),
                    JiraTicketKey = table.Column<string>(nullable: true),
                    Details = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostAlertHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CostAlertHistory_CostAlertRules_AlertRuleId",
                        column: x => x.AlertRuleId,
                        principalTable: "CostAlertRules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AISettings_UpdatedAt",
                table: "AISettings",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Actor",
                table: "AuditLogs",
                column: "Actor");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EventType",
                table: "AuditLogs",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Timestamp",
                table: "AuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_CachedAIRecommendations_CachedAt",
                table: "CachedAIRecommendations",
                column: "CachedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CachedCloudCosts_AccountId",
                table: "CachedCloudCosts",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CachedCloudCosts_CachedAt",
                table: "CachedCloudCosts",
                column: "CachedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CachedCloudCosts_Provider",
                table: "CachedCloudCosts",
                column: "Provider");

            migrationBuilder.CreateIndex(
                name: "IX_CachedCosts_CachedAt",
                table: "CachedCosts",
                column: "CachedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CachedCosts_SubscriptionId",
                table: "CachedCosts",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CachedMonthlyCosts_CachedAt",
                table: "CachedMonthlyCosts",
                column: "CachedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CachedMonthlyCosts_ContextHash",
                table: "CachedMonthlyCosts",
                column: "ContextHash");

            migrationBuilder.CreateIndex(
                name: "IX_CachedResourceCosts_CachedAt",
                table: "CachedResourceCosts",
                column: "CachedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CachedResourceCosts_ContextHash",
                table: "CachedResourceCosts",
                column: "ContextHash");

            migrationBuilder.CreateIndex(
                name: "IX_CachedResourceCosts_ResourceId",
                table: "CachedResourceCosts",
                column: "ResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_CachedResources_CachedAt",
                table: "CachedResources",
                column: "CachedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CachedResources_ResourceId",
                table: "CachedResources",
                column: "ResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_CachedResources_SubscriptionId",
                table: "CachedResources",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_ComplianceSnapshots_ControlId",
                table: "ComplianceSnapshots",
                column: "ControlId");

            migrationBuilder.CreateIndex(
                name: "IX_ComplianceSnapshots_SnapshotDate",
                table: "ComplianceSnapshots",
                column: "SnapshotDate");

            migrationBuilder.CreateIndex(
                name: "IX_ComplianceSnapshots_SubscriptionId",
                table: "ComplianceSnapshots",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertHistory_AlertRuleId",
                table: "CostAlertHistory",
                column: "AlertRuleId");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertHistory_Status",
                table: "CostAlertHistory",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertHistory_TriggeredAt",
                table: "CostAlertHistory",
                column: "TriggeredAt");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertRules_AlertType",
                table: "CostAlertRules",
                column: "AlertType");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertRules_IsEnabled",
                table: "CostAlertRules",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertRules_LastCheckedAt",
                table: "CostAlertRules",
                column: "LastCheckedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertRules_SessionId",
                table: "CostAlertRules",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_CostAlertRules_SubscriptionId",
                table: "CostAlertRules",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_GlobalAwsCredentials_IsActive",
                table: "GlobalAwsCredentials",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_GlobalGcpCredentials_IsActive",
                table: "GlobalGcpCredentials",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_JiraSettings_LastModified",
                table: "JiraSettings",
                column: "LastModified");

            migrationBuilder.CreateIndex(
                name: "IX_RemediationAttempts_AttemptedAt",
                table: "RemediationAttempts",
                column: "AttemptedAt");

            migrationBuilder.CreateIndex(
                name: "IX_RemediationAttempts_IncidentId",
                table: "RemediationAttempts",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_RemediationAttempts_Status",
                table: "RemediationAttempts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_RemediationAttempts_Tier",
                table: "RemediationAttempts",
                column: "Tier");

            migrationBuilder.CreateIndex(
                name: "IX_RemediationItems_ControlId",
                table: "RemediationItems",
                column: "ControlId");

            migrationBuilder.CreateIndex(
                name: "IX_RemediationItems_Status",
                table: "RemediationItems",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_RemediationItems_SubscriptionId",
                table: "RemediationItems",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_SocIncidents_CurrentTier",
                table: "SocIncidents",
                column: "CurrentTier");

            migrationBuilder.CreateIndex(
                name: "IX_SocIncidents_DetectedAt",
                table: "SocIncidents",
                column: "DetectedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SocIncidents_IncidentId",
                table: "SocIncidents",
                column: "IncidentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocIncidents_Status",
                table: "SocIncidents",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SocIncidents_SubscriptionId",
                table: "SocIncidents",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_VantaSettings_LastModified",
                table: "VantaSettings",
                column: "LastModified");

            migrationBuilder.CreateIndex(
                name: "IX_VantaSyncLogs_StartedAt",
                table: "VantaSyncLogs",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_VantaSyncLogs_SyncType",
                table: "VantaSyncLogs",
                column: "SyncType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AISettings");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "CachedAIRecommendations");

            migrationBuilder.DropTable(
                name: "CachedCloudCosts");

            migrationBuilder.DropTable(
                name: "CachedCosts");

            migrationBuilder.DropTable(
                name: "CachedMonthlyCosts");

            migrationBuilder.DropTable(
                name: "CachedResourceCosts");

            migrationBuilder.DropTable(
                name: "CachedResources");

            migrationBuilder.DropTable(
                name: "ComplianceSnapshots");

            migrationBuilder.DropTable(
                name: "CostAlertHistory");

            migrationBuilder.DropTable(
                name: "CredentialSessions");

            migrationBuilder.DropTable(
                name: "GlobalAwsCredentials");

            migrationBuilder.DropTable(
                name: "GlobalAzureCredentials");

            migrationBuilder.DropTable(
                name: "GlobalGcpCredentials");

            migrationBuilder.DropTable(
                name: "JiraSettings");

            migrationBuilder.DropTable(
                name: "RemediationAttempts");

            migrationBuilder.DropTable(
                name: "RemediationItems");

            migrationBuilder.DropTable(
                name: "SocIncidents");

            migrationBuilder.DropTable(
                name: "SsoProviderConfigs");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "VantaSettings");

            migrationBuilder.DropTable(
                name: "VantaSyncLogs");

            migrationBuilder.DropTable(
                name: "CostAlertRules");
        }
    }
}

using Microsoft.EntityFrameworkCore;
using AzureLens.API.Services;
using AzureLens.API.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to use port 8080 for HTTP
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(8080); // Listen on port 8080 for HTTP
});

// Add Database - Support both SQLite (local) and PostgreSQL (prod)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=azurelens.db";

if (connectionString.StartsWith("Host=") || connectionString.StartsWith("Server="))
{
    // PostgreSQL for production
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
    Console.WriteLine("✅ Using PostgreSQL database");
}
else
{
    // SQLite for local development
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(connectionString));
    Console.WriteLine("✅ Using SQLite database");
}

// Add JWT Authentication
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "AzureLens-Super-Secret-Key-Change-In-Production-Min-32-Chars";
        var key = System.Text.Encoding.UTF8.GetBytes(jwtSecret);
        
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "AzureLens",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "AzureLens",
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key)
        };
    });

builder.Services.AddAuthorization();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Services
builder.Services.AddScoped<IAzureService, AzureService>();
builder.Services.AddScoped<IAIService, OpenAIService>();
builder.Services.AddScoped<ICacheService, CacheService>();
builder.Services.AddScoped<IAISettingsService, AISettingsService>();
builder.Services.AddScoped<IJiraService, JiraService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddSingleton<ICredentialCacheService, CredentialCacheService>();

// FinOps, Compliance, and Vanta services
builder.Services.AddScoped<IFinOpsService, FinOpsService>();
builder.Services.AddScoped<IComplianceService, ComplianceService>();
builder.Services.AddScoped<IVantaService, VantaService>();
builder.Services.AddHostedService<VantaSyncBackgroundService>();

// SOC2 Extended services
builder.Services.AddScoped<IAccessReviewService, AccessReviewService>();
builder.Services.AddScoped<IChangeManagementService, ChangeManagementService>();
builder.Services.AddScoped<IRemediationService, RemediationService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddScoped<IVulnerabilityService, VulnerabilityService>();
builder.Services.AddScoped<INetworkSecurityService, NetworkSecurityService>();

// SOC Incident Management services
builder.Services.AddScoped<ISocIncidentService, SocIncidentService>();
builder.Services.AddScoped<IAutoRemediationService, AutoRemediationService>();

// Cost Alerts service
builder.Services.AddScoped<ICostAlertService, CostAlertService>();

// Auth service
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddHttpClient();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:3000",
                    "https://costfinderui.victoriousriver-b508dbd7.australiaeast.azurecontainerapps.io",
                    "https://aca-azurelens-fe.victorioustree-30449962.australiaeast.azurecontainerapps.io",
                    "https://*.azurecontainerapps.io")
                  .SetIsOriginAllowedToAllowWildcardSubdomains()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Only use HTTPS redirection in development (Container Apps handles TLS)
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        // EnsureCreated creates the full schema on a brand-new database.
        // On an existing database it is a no-op, so we also run explicit
        // CREATE TABLE IF NOT EXISTS for tables added after the initial release.
        db.Database.EnsureCreated();

        bool isPostgres = db.Database.IsNpgsql();

        if (isPostgres)
        {
            // ── PostgreSQL ────────────────────────────────────────────────────
            // Remove orphan rows with NULL Id (left by any previous bad INSERT).
            db.Database.ExecuteSqlRaw(@"DELETE FROM ""GlobalAzureCredentials"" WHERE ""Id"" IS NULL;");

            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id""                SERIAL PRIMARY KEY,
                    ""Email""             TEXT NOT NULL DEFAULT '',
                    ""Name""              TEXT NOT NULL DEFAULT '',
                    ""ProfilePictureUrl"" TEXT,
                    ""Provider""          TEXT NOT NULL DEFAULT '',
                    ""ProviderId""        TEXT NOT NULL DEFAULT '',
                    ""TenantId""          TEXT,
                    ""CreatedAt""         TIMESTAMP NOT NULL DEFAULT NOW(),
                    ""LastLoginAt""       TIMESTAMP NOT NULL DEFAULT NOW(),
                    ""IsActive""          BOOLEAN NOT NULL DEFAULT TRUE,
                    ""Role""              INTEGER NOT NULL DEFAULT 1,
                    ""OrganizationName""  TEXT
                );");

            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""SsoProviderConfigs"" (
                    ""Id""               SERIAL PRIMARY KEY,
                    ""Provider""         TEXT NOT NULL DEFAULT '',
                    ""ClientId""         TEXT NOT NULL DEFAULT '',
                    ""ClientSecret""     TEXT NOT NULL DEFAULT '',
                    ""Authority""        TEXT,
                    ""TenantId""         TEXT,
                    ""RedirectUri""      TEXT,
                    ""Scopes""           TEXT,
                    ""IsEnabled""        BOOLEAN NOT NULL DEFAULT TRUE,
                    ""CreatedAt""        TIMESTAMP NOT NULL DEFAULT NOW(),
                    ""UpdatedAt""        TIMESTAMP NOT NULL DEFAULT NOW(),
                    ""OrganizationName"" TEXT
                );");
        }
        else
        {
            // ── SQLite ────────────────────────────────────────────────────────
            // Remove orphan rows with NULL Id (left by the EF Core 8 RETURNING bug).
            db.Database.ExecuteSqlRaw(@"DELETE FROM ""GlobalAzureCredentials"" WHERE ""Id"" IS NULL;");
            db.Database.ExecuteSqlRaw(@"DELETE FROM ""Users"" WHERE ""Id"" IS NULL;");

            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id""                INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""Email""             TEXT NOT NULL DEFAULT '',
                    ""Name""              TEXT NOT NULL DEFAULT '',
                    ""ProfilePictureUrl"" TEXT,
                    ""Provider""          TEXT NOT NULL DEFAULT '',
                    ""ProviderId""        TEXT NOT NULL DEFAULT '',
                    ""TenantId""          TEXT,
                    ""CreatedAt""         TEXT NOT NULL DEFAULT '',
                    ""LastLoginAt""       TEXT NOT NULL DEFAULT '',
                    ""IsActive""          INTEGER NOT NULL DEFAULT 1,
                    ""Role""              INTEGER NOT NULL DEFAULT 1,
                    ""OrganizationName""  TEXT
                );");

            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""SsoProviderConfigs"" (
                    ""Id""               INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""Provider""         TEXT NOT NULL DEFAULT '',
                    ""ClientId""         TEXT NOT NULL DEFAULT '',
                    ""ClientSecret""     TEXT NOT NULL DEFAULT '',
                    ""Authority""        TEXT,
                    ""TenantId""         TEXT,
                    ""RedirectUri""      TEXT,
                    ""Scopes""           TEXT,
                    ""IsEnabled""        INTEGER NOT NULL DEFAULT 1,
                    ""CreatedAt""        TEXT NOT NULL DEFAULT '',
                    ""UpdatedAt""        TEXT NOT NULL DEFAULT '',
                    ""OrganizationName"" TEXT
                );");
        }

        logger.LogInformation("✅ Database initialization completed");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error during database initialization");
    }
}

app.Run();

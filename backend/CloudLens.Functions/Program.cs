using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using CloudLens.API.Services;
using CloudLens.API.Data;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

// Add configuration
var configuration = builder.Configuration;

// Add Database - Support both SQLite (local) and PostgreSQL (prod)
var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=cloudlens.db";
if (connectionString.StartsWith("Host=") || connectionString.StartsWith("Server="))
{
    // PostgreSQL for production
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
    Console.WriteLine("✅ Functions using PostgreSQL database");
}
else
{
    // SQLite for local development
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(connectionString));
    Console.WriteLine("✅ Functions using SQLite database");
}

// Register all services from CloudLens.API
builder.Services.AddScoped<IAzureService, AzureService>();
builder.Services.AddScoped<IAIService, OpenAIService>();
builder.Services.AddScoped<ICacheService, CacheService>();
builder.Services.AddScoped<IAISettingsService, AISettingsService>();
builder.Services.AddScoped<IJiraService, JiraService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddSingleton<ICredentialCacheService, CredentialCacheService>();

// FinOps, Compliance, and related services
builder.Services.AddScoped<IFinOpsService, FinOpsService>();
builder.Services.AddScoped<IComplianceService, ComplianceService>();
builder.Services.AddScoped<IVantaService, VantaService>();

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

// Multi-cloud services
builder.Services.AddScoped<IAwsService, AwsService>();
builder.Services.AddScoped<IGcpService, GcpService>();

// Add HttpClient for services that need it
builder.Services.AddHttpClient();

// Add Application Insights
builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

var app = builder.Build();

// Initialize database (ensure schema exists)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
    Console.WriteLine("✅ Database initialized from Functions app");
}

app.Run();

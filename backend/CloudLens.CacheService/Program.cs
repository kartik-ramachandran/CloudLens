using CloudLens.CacheService;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ──────────────────────────────────────────────────────────
var configuration = builder.Configuration;
var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=cloudlens.db";

// ── Database ────────────────────────────────────────────────────────────────
if (connectionString.StartsWith("Host=") || connectionString.StartsWith("Server="))
{
    builder.Services.AddDbContext<CloudLens.API.Data.AppDbContext>(o =>
        o.UseNpgsql(connectionString));
    Console.WriteLine("CacheService using PostgreSQL");
}
else
{
    builder.Services.AddDbContext<CloudLens.API.Data.AppDbContext>(o =>
        o.UseSqlite(connectionString));
    Console.WriteLine("CacheService using SQLite");
}

// ── Services from CloudLens.API ─────────────────────────────────────────────
builder.Services.AddHttpClient();
builder.Services.AddScoped<CloudLens.API.Services.IAzureService,     CloudLens.API.Services.AzureService>();
builder.Services.AddScoped<CloudLens.API.Services.IAwsService,       CloudLens.API.Services.AwsService>();
builder.Services.AddScoped<CloudLens.API.Services.IGcpService,       CloudLens.API.Services.GcpService>();
builder.Services.AddScoped<CloudLens.API.Services.IFinOpsService,    CloudLens.API.Services.FinOpsService>();
builder.Services.AddScoped<CloudLens.API.Services.IComplianceService,CloudLens.API.Services.ComplianceService>();
builder.Services.AddScoped<CloudLens.API.Services.ICacheService,     CloudLens.API.Services.CacheService>();
builder.Services.AddScoped<CloudLens.API.Services.IAIService,        CloudLens.API.Services.OpenAIService>();
builder.Services.AddScoped<CloudLens.API.Services.IAISettingsService,CloudLens.API.Services.AISettingsService>();
builder.Services.AddScoped<CloudLens.API.Services.IJiraService,      CloudLens.API.Services.JiraService>();
builder.Services.AddScoped<CloudLens.API.Services.INotificationService, CloudLens.API.Services.NotificationService>();
builder.Services.AddScoped<CloudLens.API.Services.IExportService,    CloudLens.API.Services.ExportService>();
builder.Services.AddScoped<CloudLens.API.Services.IVantaService,     CloudLens.API.Services.VantaService>();
builder.Services.AddScoped<CloudLens.API.Services.IAccessReviewService,    CloudLens.API.Services.AccessReviewService>();
builder.Services.AddScoped<CloudLens.API.Services.IChangeManagementService,CloudLens.API.Services.ChangeManagementService>();
builder.Services.AddScoped<CloudLens.API.Services.IRemediationService,     CloudLens.API.Services.RemediationService>();
builder.Services.AddScoped<CloudLens.API.Services.IAvailabilityService,    CloudLens.API.Services.AvailabilityService>();
builder.Services.AddScoped<CloudLens.API.Services.IVulnerabilityService,   CloudLens.API.Services.VulnerabilityService>();
builder.Services.AddScoped<CloudLens.API.Services.INetworkSecurityService, CloudLens.API.Services.NetworkSecurityService>();
builder.Services.AddScoped<CloudLens.API.Services.ISocIncidentService,     CloudLens.API.Services.SocIncidentService>();
builder.Services.AddScoped<CloudLens.API.Services.IAutoRemediationService, CloudLens.API.Services.AutoRemediationService>();
builder.Services.AddScoped<CloudLens.API.Services.ICostAlertService,       CloudLens.API.Services.CostAlertService>();
builder.Services.AddSingleton<CloudLens.API.Services.ICredentialCacheService, CloudLens.API.Services.CredentialCacheService>();

// ── SSE broadcaster + background worker ─────────────────────────────────────
builder.Services.AddSingleton<SseBroadcaster>();
builder.Services.AddHostedService<CacheRefreshWorker>();

// ── CORS (allow the frontend origin) ────────────────────────────────────────
var frontendOrigin = configuration["AllowedOrigins"] ?? "http://localhost:3000";
builder.Services.AddCors(o => o.AddPolicy("frontend", p =>
    p.WithOrigins(frontendOrigin.Split(','))
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));

var app = builder.Build();
app.UseCors("frontend");

// ── Ensure DB schema exists ──────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CloudLens.API.Data.AppDbContext>();
    db.Database.EnsureCreated();
}

// ── Endpoints ────────────────────────────────────────────────────────────────

// GET /health
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "CloudLens.CacheService", utc = DateTime.UtcNow }));

// GET /sessions — credential status for all providers
app.MapGet("/sessions", async (CloudLens.API.Data.AppDbContext db) =>
{
    var azure = await db.GlobalAzureCredentials.FirstOrDefaultAsync(c => c.IsActive);
    var aws   = await db.GlobalAwsCredentials.FirstOrDefaultAsync(c => c.IsActive);
    var gcp   = await db.GlobalGcpCredentials.FirstOrDefaultAsync(c => c.IsActive);

    return Results.Ok(new
    {
        azure = azure == null ? null : new { configured = true, subscriptionCount = azure.SubscriptionCount, tenantId = azure.TenantId, updatedAt = azure.UpdatedAt },
        aws   = aws   == null ? null : new { configured = true, region = aws.Region, updatedAt = aws.UpdatedAt },
        gcp   = gcp   == null ? null : new { configured = true, updatedAt = gcp.UpdatedAt },
    });
});

// POST /refresh — manual trigger
app.MapPost("/refresh", async (CacheRefreshWorker worker, HttpContext ctx) =>
{
    _ = Task.Run(() => worker.TriggerRefreshAsync(ctx.RequestAborted));
    return Results.Accepted(null, new { message = "Cache refresh started", utc = DateTime.UtcNow });
});

// GET /events — SSE stream
app.MapGet("/events", async (SseBroadcaster broadcaster, HttpContext ctx) =>
{
    ctx.Response.Headers.Append("Content-Type", "text/event-stream");
    ctx.Response.Headers.Append("Cache-Control", "no-cache");
    ctx.Response.Headers.Append("X-Accel-Buffering", "no");
    await ctx.Response.Body.FlushAsync(ctx.RequestAborted);

    using var subscription = broadcaster.Subscribe(ctx.Response);

    // Send heartbeats every 25s to keep the connection alive through proxies
    using var timer = new PeriodicTimer(TimeSpan.FromSeconds(25));
    try
    {
        while (await timer.WaitForNextTickAsync(ctx.RequestAborted))
        {
            await broadcaster.BroadcastAsync(CacheEvent.Heartbeat(), ctx.RequestAborted);
        }
    }
    catch (OperationCanceledException) { /* client disconnected */ }
});

app.Run();

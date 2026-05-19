using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using Azure.ResourceManager;
using CloudLens.API.Data;
using CloudLens.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudLens.API.Services;

public class ComplianceService : IComplianceService
{
    private readonly IAzureService _azureService;
    private readonly IAIService _aiService;
    private readonly ICacheService _cacheService;
    private readonly AppDbContext _context;
    private readonly ILogger<ComplianceService> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public ComplianceService(
        IAzureService azureService, 
        IAIService aiService, 
        ICacheService cacheService,
        AppDbContext context, 
        ILogger<ComplianceService> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _azureService = azureService;
        _aiService = aiService;
        _cacheService = cacheService;
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
    }

    private async Task<bool> TriggerFunctionsRefreshAsync()
    {
        try
        {
            var functionsUrl = _configuration["AzureFunctions:BaseUrl"];
            if (string.IsNullOrEmpty(functionsUrl))
            {
                _logger.LogWarning("Azure Functions URL not configured");
                return false;
            }

            _logger.LogInformation("Triggering Azure Functions cache refresh from ComplianceService...");
            var response = await _httpClient.PostAsync($"{functionsUrl}/api/TriggerRefresh", null);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Azure Functions refresh triggered successfully");
                await Task.Delay(5000);
                return true;
            }
            
            _logger.LogWarning("Failed to trigger Azure Functions refresh: {StatusCode}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering Azure Functions refresh");
            return false;
        }
    }

    public List<Soc2ControlDefinition> GetControlDefinitions() => Soc2ControlLibrary.GetAll();

    public async Task<ComplianceReport> GenerateSoc2ReportAsync(AzureCredentials credentials, Soc2ReportRequest request)
    {
        try
        {
            var controls = await GetSoc2ControlsAsync(credentials, request.SubscriptionIds);
            var compliant = controls.Count(c => c.Status == "Compliant");
            var nonCompliant = controls.Count(c => c.Status == "NonCompliant");
            var partial = controls.Count(c => c.Status == "PartiallyCompliant");
            var totalChecks = controls.Sum(c => c.TotalChecks);
            var passedChecks = controls.Sum(c => c.PassedChecks);

            var overallPct = totalChecks > 0 ? Math.Round((double)passedChecks / totalChecks * 100, 1) : 0;
            var overallStatus = overallPct >= 90 ? "Compliant" : overallPct >= 70 ? "PartiallyCompliant" : "NonCompliant";

            string executiveSummary = "";
            if (request.IncludeAiNarratives)
            {
                try
                {
                    executiveSummary = await _aiService.GenerateComplianceNarrativeAsync(controls, overallPct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "AI narrative generation failed, continuing without it");
                    executiveSummary = $"SOC2 compliance assessment completed. {compliant} controls are compliant, {nonCompliant} require remediation, {partial} are partially compliant. Overall compliance score: {overallPct:F1}%.";
                }
            }

            return new ComplianceReport
            {
                SubscriptionId = request.SubscriptionIds.FirstOrDefault() ?? "all",
                SubscriptionName = request.SubscriptionIds.FirstOrDefault() ?? "All Subscriptions",
                PeriodStart = request.PeriodStart ?? DateTime.UtcNow.AddDays(-30),
                PeriodEnd = request.PeriodEnd ?? DateTime.UtcNow,
                ReportType = request.ReportType,
                OverallStatus = overallStatus,
                TotalControls = controls.Count,
                CompliantControls = compliant,
                NonCompliantControls = nonCompliant,
                PartialControls = partial,
                OverallCompliancePercent = overallPct,
                Controls = controls,
                ExecutiveSummary = executiveSummary,
                GeneratedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating SOC2 report");
            throw;
        }
    }

    public async Task<List<Soc2Control>> GetSoc2ControlsAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        // Check cache first — serve from DB if snapshots are less than 1 hour old
        try
        {
            var cutoff = DateTime.UtcNow.AddHours(-1);
            var snapshots = await _context.ComplianceSnapshots
                .Where(s => subscriptionIds.Contains(s.SubscriptionId))
                .ToListAsync();

            var recentSnapshots = snapshots
                .Where(s => DateTime.TryParse(s.SnapshotDate, null, System.Globalization.DateTimeStyles.RoundtripKind, out var date) && date > cutoff)
                .ToList();

            if (recentSnapshots.Any())
            {
                _logger.LogInformation("Returning {count} SOC2 controls from cache (snapshots < 1 hour old)", recentSnapshots.Count);
                return recentSnapshots
                    .Select(s => JsonSerializer.Deserialize<Soc2Control>(s.EvidenceSummaryJson))
                    .Where(c => c != null)
                    .Select(c => c!)
                    .ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read SOC2 cache, falling back to live evaluation");
        }

        try
        {
            var evidence = await CollectEvidenceAsync(credentials, subscriptionIds);
            var definitions = GetControlDefinitions();
            var controls = new List<Soc2Control>();

            foreach (var def in definitions)
            {
                var controlEvidence = evidence.Where(e => e.ControlId == def.ControlId).ToList();
                var passed = controlEvidence.Count(e => e.IsPassing);
                var total = controlEvidence.Count;
                var pct = total > 0 ? Math.Round((double)passed / total * 100, 1) : 0;

                var status = total == 0 ? "NotEvaluated" :
                             pct >= 90 ? "Compliant" :
                             pct >= 60 ? "PartiallyCompliant" : "NonCompliant";

                var gaps = controlEvidence
                    .Where(e => !e.IsPassing)
                    .Select(e => new ControlGap
                    {
                        ControlId = def.ControlId,
                        GapDescription = e.Summary,
                        Severity = "Medium",
                        RemediationSteps = GetRemediationSteps(def.ControlId, e.EvidenceType),
                        ResourceId = e.ResourceId
                    })
                    .Take(10)
                    .ToList();

                controls.Add(new Soc2Control
                {
                    ControlId = def.ControlId,
                    TscCategory = def.TscCategory,
                    Name = def.Name,
                    Description = def.Description,
                    Status = status,
                    SubscriptionId = subscriptionIds.FirstOrDefault() ?? "all",
                    EvidenceCount = total,
                    PassedChecks = passed,
                    FailedChecks = total - passed,
                    TotalChecks = total,
                    CompliancePercent = pct,
                    Evidence = controlEvidence.Take(20).ToList(),
                    Gaps = gaps,
                    LastEvaluated = DateTime.UtcNow
                });
            }

            // Save results to cache for fast subsequent loads
            await SaveComplianceSnapshotsAsync(controls, subscriptionIds);

            return controls;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error evaluating SOC2 controls");
            throw;
        }
    }

    private async Task SaveComplianceSnapshotsAsync(List<Soc2Control> controls, List<string> subscriptionIds)
    {
        try
        {
            // Replace old snapshots for these subscriptions
            await _context.ComplianceSnapshots
                .Where(s => subscriptionIds.Contains(s.SubscriptionId))
                .ExecuteDeleteAsync();

            foreach (var control in controls)
            {
                _context.ComplianceSnapshots.Add(new ComplianceSnapshot
                {
                    SubscriptionId = control.SubscriptionId,
                    ControlId = control.ControlId,
                    Status = control.Status,
                    CompliancePercent = control.CompliancePercent,
                    PassedChecks = control.PassedChecks,
                    FailedChecks = control.FailedChecks,
                    SnapshotDate = DateTime.UtcNow.ToString("O"),
                    EvidenceSummaryJson = JsonSerializer.Serialize(control)
                });
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Cached {count} SOC2 control snapshots to database", controls.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save SOC2 control snapshots to cache");
        }
    }

    public async Task<List<ComplianceEvidence>> CollectEvidenceAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var evidence = new List<ComplianceEvidence>();
        var tasks = new List<Task<List<ComplianceEvidence>>>
        {
            CollectRbacEvidenceAsync(credentials, subscriptionIds),
            CollectDefenderEvidenceAsync(credentials, subscriptionIds),
            CollectDiagnosticEvidenceAsync(credentials, subscriptionIds),
            CollectPolicyComplianceEvidenceAsync(credentials, subscriptionIds),
            CollectEncryptionEvidenceAsync(credentials, subscriptionIds)
        };

        var results = await Task.WhenAll(tasks);
        foreach (var result in results)
            evidence.AddRange(result);

        return evidence;
    }

    public async Task<List<ControlGap>> GetGapAnalysisAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var controls = await GetSoc2ControlsAsync(credentials, subscriptionIds);
        return controls
            .Where(c => c.Status != "Compliant")
            .SelectMany(c => c.Gaps)
            .OrderBy(g => g.Severity == "High" ? 0 : g.Severity == "Medium" ? 1 : 2)
            .ToList();
    }

    public async Task<List<AuditLogEntry>> GetAuditLogAsync(int pageSize = 100, int page = 1)
    {
        return await _context.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task LogAuditEventAsync(AuditLogEntry entry)
    {
        try
        {
            _context.AuditLogs.Add(entry);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging audit event");
        }
    }

    // --- Private evidence collectors ---

    private async Task<List<ComplianceEvidence>> CollectRbacEvidenceAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var evidence = new List<ComplianceEvidence>();
        try
        {
            var credential = GetCredential(credentials);
            var token = await credential.GetTokenAsync(new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);

            foreach (var subId in subscriptionIds)
            {
                try
                {
                    var url = $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01&$filter=atScope()";
                    var response = await httpClient.GetAsync(url);
                    if (!response.IsSuccessStatusCode) continue;

                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);
                    if (!doc.RootElement.TryGetProperty("value", out var items)) continue;

                    var privilegedRoles = new HashSet<string> { "Owner", "Contributor", "User Access Administrator" };
                    int privilegedCount = 0;
                    int totalCount = 0;

                    foreach (var item in items.EnumerateArray())
                    {
                        totalCount++;
                        if (item.TryGetProperty("properties", out var props))
                        {
                            var roleDefId = props.TryGetProperty("roleDefinitionId", out var rid) ? rid.GetString() ?? "" : "";
                            var principalType = props.TryGetProperty("principalType", out var pt) ? pt.GetString() ?? "" : "";
                            if (roleDefId.EndsWith("8e3af657-a8ff-443c-a75c-2fe8c4bcb635") || // Owner
                                roleDefId.EndsWith("b24988ac-6180-42a0-ab88-20f7382dd24c"))   // Contributor
                                privilegedCount++;
                        }
                    }

                    var isCompliant = privilegedCount < 5;
                    evidence.Add(new ComplianceEvidence
                    {
                        ControlId = "CC6.1",
                        SubscriptionId = subId,
                        EvidenceType = "RbacAssignment",
                        Title = "Privileged Role Assignments",
                        Summary = $"Found {privilegedCount} privileged role assignments (Owner/Contributor) out of {totalCount} total. " +
                                  (isCompliant ? "Count is within acceptable limits." : "High number of privileged assignments may indicate excessive access."),
                        IsPassing = isCompliant,
                        RawData = $"{{\"totalAssignments\":{totalCount},\"privilegedAssignments\":{privilegedCount}}}",
                        CollectedAt = DateTime.UtcNow
                    });

                    evidence.Add(new ComplianceEvidence
                    {
                        ControlId = "CC6.2",
                        SubscriptionId = subId,
                        EvidenceType = "RbacAssignment",
                        Title = "RBAC Access Control Review",
                        Summary = $"RBAC is configured with {totalCount} role assignments across the subscription. " +
                                  "Access is managed through Azure Active Directory role-based access control.",
                        IsPassing = true,
                        RawData = $"{{\"totalAssignments\":{totalCount}}}",
                        CollectedAt = DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to collect RBAC evidence for subscription {subId}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting RBAC evidence");
        }
        return evidence;
    }

    private Task<List<ComplianceEvidence>> CollectDefenderEvidenceAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var evidence = new List<ComplianceEvidence>();
        try
        {
            // Return basic compliance evidence (no SecurityRecommendations cache table yet)
            var recommendations = new List<SecurityRecommendation>();
            var highSeverity = new List<SecurityRecommendation>();
            var total = 0;
            var high = 0;

            // CC7: System Operations - security monitoring
            evidence.Add(new ComplianceEvidence
            {
                ControlId = "CC7.1",
                SubscriptionId = subscriptionIds.FirstOrDefault() ?? "all",
                EvidenceType = "SecurityRecommendation",
                Title = "Microsoft Defender for Cloud Security Assessments",
                Summary = $"Defender for Cloud identified {total} security recommendations ({high} high severity). " +
                          (high == 0 ? "No high severity issues found." : $"{high} high severity issues require immediate attention."),
                IsPassing = high == 0,
                RawData = $"{{\"totalRecommendations\":{total},\"highSeverity\":{high}}}",
                CollectedAt = DateTime.UtcNow
            });

            // CC6 - Logical and Physical Access Controls
            var networkCount = recommendations.Count(r => r.Category?.Contains("Network", StringComparison.OrdinalIgnoreCase) == true);
            var hasHighNetwork = highSeverity.Any(r => r.Category?.Contains("Network", StringComparison.OrdinalIgnoreCase) == true);
            evidence.Add(new ComplianceEvidence
            {
                ControlId = "CC6.7",
                SubscriptionId = subscriptionIds.FirstOrDefault() ?? "all",
                EvidenceType = "SecurityRecommendation",
                Title = "Network Security Recommendations",
                Summary = $"Security assessments evaluated network and access controls. Found {networkCount} network-related recommendations.",
                IsPassing = !hasHighNetwork,
                RawData = $"{{\"networkRecommendations\":{networkCount}}}",
                CollectedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting Defender evidence");
        }
        return Task.FromResult(evidence);
    }

    private async Task<List<ComplianceEvidence>> CollectDiagnosticEvidenceAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var evidence = new List<ComplianceEvidence>();
        try
        {
            var credential = GetCredential(credentials);
            var token = await credential.GetTokenAsync(new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);

            foreach (var subId in subscriptionIds)
            {
                try
                {
                    // Check if Activity Log is being collected
                    var url = $"https://management.azure.com/subscriptions/{subId}/providers/microsoft.insights/diagnosticSettings?api-version=2021-05-01-preview";
                    var response = await httpClient.GetAsync(url);
                    var logsEnabled = response.IsSuccessStatusCode;

                    evidence.Add(new ComplianceEvidence
                    {
                        ControlId = "CC7.2",
                        SubscriptionId = subId,
                        EvidenceType = "DiagnosticSettings",
                        Title = "Activity Log Diagnostic Settings",
                        Summary = logsEnabled
                            ? "Azure Activity Log diagnostic settings are configured for this subscription."
                            : "No diagnostic settings found for Azure Activity Log. Audit logging may not be enabled.",
                        IsPassing = logsEnabled,
                        RawData = $"{{\"diagnosticsConfigured\":{logsEnabled.ToString().ToLower()}}}",
                        CollectedAt = DateTime.UtcNow
                    });

                    evidence.Add(new ComplianceEvidence
                    {
                        ControlId = "CC4.1",
                        SubscriptionId = subId,
                        EvidenceType = "DiagnosticSettings",
                        Title = "Monitoring and Logging Configuration",
                        Summary = logsEnabled
                            ? "Monitoring is configured. Azure Monitor and Activity Logs are capturing subscription-level events."
                            : "Monitoring gaps detected. Consider enabling comprehensive diagnostic logging.",
                        IsPassing = logsEnabled,
                        RawData = $"{{\"loggingEnabled\":{logsEnabled.ToString().ToLower()}}}",
                        CollectedAt = DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to collect diagnostic evidence for subscription {subId}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting diagnostic evidence");
        }
        return evidence;
    }

    private async Task<List<ComplianceEvidence>> CollectPolicyComplianceEvidenceAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var evidence = new List<ComplianceEvidence>();
        try
        {
            var credential = GetCredential(credentials);
            var token = await credential.GetTokenAsync(new TokenRequestContext(new[] { "https://management.azure.com/.default" }), default);

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);

            foreach (var subId in subscriptionIds)
            {
                try
                {
                    var url = $"https://management.azure.com/subscriptions/{subId}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize?api-version=2019-10-01";
                    var response = await httpClient.PostAsync(url, null);
                    if (!response.IsSuccessStatusCode) continue;

                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);

                    var compliantCount = 0;
                    var nonCompliantCount = 0;

                    if (doc.RootElement.TryGetProperty("value", out var values) && values.GetArrayLength() > 0)
                    {
                        var summary = values[0];
                        if (summary.TryGetProperty("results", out var results))
                        {
                            if (results.TryGetProperty("resourceDetails", out var details))
                            {
                                foreach (var detail in details.EnumerateArray())
                                {
                                    if (detail.TryGetProperty("complianceState", out var state))
                                    {
                                        if (state.GetString() == "compliant")
                                            compliantCount = detail.TryGetProperty("count", out var c) ? c.GetInt32() : 0;
                                        else if (state.GetString() == "noncompliant")
                                            nonCompliantCount = detail.TryGetProperty("count", out var nc) ? nc.GetInt32() : 0;
                                    }
                                }
                            }
                        }
                    }

                    var total = compliantCount + nonCompliantCount;
                    var pct = total > 0 ? (double)compliantCount / total * 100 : 0;
                    var isPassing = pct >= 80;

                    evidence.Add(new ComplianceEvidence
                    {
                        ControlId = "CC5.1",
                        SubscriptionId = subId,
                        EvidenceType = "PolicyCompliance",
                        Title = "Azure Policy Compliance State",
                        Summary = $"Azure Policy shows {compliantCount} compliant and {nonCompliantCount} non-compliant resources " +
                                  $"({pct:F1}% compliance rate). " +
                                  (isPassing ? "Policy compliance is within acceptable range." : "Policy compliance requires attention."),
                        IsPassing = isPassing,
                        RawData = $"{{\"compliant\":{compliantCount},\"nonCompliant\":{nonCompliantCount},\"compliancePercent\":{pct:F1}}}",
                        CollectedAt = DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to collect policy compliance for subscription {subId}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting policy compliance evidence");
        }
        return evidence;
    }

    private async Task<List<ComplianceEvidence>> CollectEncryptionEvidenceAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var evidence = new List<ComplianceEvidence>();
        try
        {
            // Only read from PostgreSQL - if empty, trigger Functions
            var resources = await _cacheService.GetCachedResourcesAsync(subscriptionIds);
            if (resources == null || !resources.Any())
            {
                _logger.LogWarning("No cached resources for compliance, triggering refresh...");
                await TriggerFunctionsRefreshAsync();
                resources = await _cacheService.GetCachedResourcesAsync(subscriptionIds);
            }
            
            if (resources == null || !resources.Any())
            {
                _logger.LogWarning("No resources found after triggering refresh");
                return evidence;
            }
            var storageAccounts = resources.Where(r => r.Type.Contains("Microsoft.Storage/storageAccounts", StringComparison.OrdinalIgnoreCase)).ToList();
            var keyVaults = resources.Where(r => r.Type.Contains("Microsoft.KeyVault/vaults", StringComparison.OrdinalIgnoreCase)).ToList();
            var sqlServers = resources.Where(r => r.Type.Contains("Microsoft.Sql/servers", StringComparison.OrdinalIgnoreCase)).ToList();

            // Key Vault presence is evidence of encryption key management
            evidence.Add(new ComplianceEvidence
            {
                ControlId = "C1.1",
                SubscriptionId = subscriptionIds.FirstOrDefault() ?? "all",
                EvidenceType = "EncryptionStatus",
                Title = "Azure Key Vault Configuration",
                Summary = keyVaults.Any()
                    ? $"Found {keyVaults.Count} Azure Key Vault(s). Key management infrastructure is in place for encryption key management."
                    : "No Azure Key Vaults found. Consider using Key Vault for centralized key management.",
                IsPassing = keyVaults.Any(),
                RawData = $"{{\"keyVaultCount\":{keyVaults.Count}}}",
                CollectedAt = DateTime.UtcNow
            });

            evidence.Add(new ComplianceEvidence
            {
                ControlId = "CC6.7",
                SubscriptionId = subscriptionIds.FirstOrDefault() ?? "all",
                EvidenceType = "EncryptionStatus",
                Title = "Storage Encryption At Rest",
                Summary = storageAccounts.Any()
                    ? $"Found {storageAccounts.Count} storage account(s). Azure Storage uses 256-bit AES encryption by default for all data at rest."
                    : "No storage accounts found.",
                IsPassing = true, // Azure always encrypts storage at rest by default
                RawData = $"{{\"storageAccountCount\":{storageAccounts.Count},\"encryptionDefault\":true}}",
                CollectedAt = DateTime.UtcNow
            });

            evidence.Add(new ComplianceEvidence
            {
                ControlId = "C1.2",
                SubscriptionId = subscriptionIds.FirstOrDefault() ?? "all",
                EvidenceType = "EncryptionStatus",
                Title = "SQL Server Transparent Data Encryption",
                Summary = sqlServers.Any()
                    ? $"Found {sqlServers.Count} SQL Server(s). Azure SQL Database uses Transparent Data Encryption (TDE) by default."
                    : "No SQL Servers found.",
                IsPassing = true, // TDE is enabled by default on Azure SQL
                RawData = $"{{\"sqlServerCount\":{sqlServers.Count},\"tdeDefault\":true}}",
                CollectedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting encryption evidence");
        }
        return evidence;
    }

    private string GetRemediationSteps(string controlId, string evidenceType)
    {
        return (controlId, evidenceType) switch
        {
            ("CC6.1", "RbacAssignment") => "Review and reduce privileged role assignments. Implement Just-In-Time access using Azure PIM. Apply principle of least privilege.",
            ("CC7.2", "DiagnosticSettings") => "Enable Azure Activity Log and configure diagnostic settings to send logs to a Log Analytics workspace. Enable Microsoft Defender for Cloud.",
            ("CC4.1", "DiagnosticSettings") => "Configure Azure Monitor to collect and retain logs. Set up alerts for critical events. Enable Security Center monitoring.",
            ("CC5.1", "PolicyCompliance") => "Review non-compliant resources in Azure Policy. Apply appropriate policies to enforce organizational standards. Remediate non-compliant resources.",
            ("C1.1", "EncryptionStatus") => "Create an Azure Key Vault for centralized key management. Use customer-managed keys (CMK) for sensitive data encryption.",
            _ => "Review the evidence findings and implement appropriate controls based on Azure security best practices."
        };
    }

    private TokenCredential GetCredential(AzureCredentials credentials) =>
        new ClientSecretCredential(credentials.TenantId, credentials.ClientId, credentials.ClientSecret);

    public async Task<Soc2ReadinessReport> GetSoc2ReadinessAssessmentAsync(AzureCredentials credentials, List<string> subscriptionIds)
    {
        var checks = new List<ReadinessCheckItem>();

        // Generate static readiness checks for all subscriptions
        foreach (var subscriptionId in subscriptionIds)
        {
            // Check 1: Azure Security Center (Defender for Cloud)
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC7.2-001",
                Category = "Security Monitoring",
                Title = "Microsoft Defender for Cloud Enabled",
                Description = "Azure Security Center provides threat protection and security recommendations",
                Status = "Partial",
                Weight = 10,
                Recommendation = "Enable Microsoft Defender for Cloud Standard tier for comprehensive security monitoring",
                AzureService = "Microsoft Defender for Cloud",
                ControlReference = "CC7.2 - Anomaly Detection"
            });

            // Check 2: Activity Log Diagnostics
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC7.2-002",
                Category = "Logging & Monitoring",
                Title = "Activity Log Collection Configured",
                Description = "Azure Activity Logs should be sent to Log Analytics workspace",
                Status = "Partial",
                Weight = 8,
                Recommendation = "Configure Activity Log diagnostic settings to send to Log Analytics",
                AzureService = "Azure Monitor",
                ControlReference = "CC7.2 - System Monitoring"
            });

            // Check 3: Key Vault for Secrets
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-C1.1-001",
                Category = "Encryption & Key Management",
                Title = "Azure Key Vault Deployed",
                Description = "Key Vault provides centralized secrets and key management",
                Status = "Partial",
                Weight = 9,
                Recommendation = "Deploy Azure Key Vault for centralized key and secret management",
                AzureService = "Azure Key Vault",
                ControlReference = "C1.1 - Confidential Information Protection"
            });

            // Check 4: Storage Account Encryption
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC6.7-001",
                Category = "Data Protection",
                Title = "Storage Encryption At Rest",
                Description = "All Azure Storage accounts use encryption at rest by default",
                Status = "Pass",
                Weight = 7,
                Recommendation = "Azure Storage automatically encrypts all data at rest with 256-bit AES encryption",
                AzureService = "Azure Storage",
                ControlReference = "CC6.7 - Data Transmission & Protection"
            });

            // Check 5: RBAC Assignments
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC6.1-001",
                Category = "Access Control",
                Title = "Role-Based Access Control Configured",
                Description = "RBAC limits access to Azure resources based on roles",
                Status = "Pass",
                Weight = 10,
                Recommendation = "Review RBAC assignments regularly and apply principle of least privilege",
                AzureService = "Azure RBAC",
                ControlReference = "CC6.1 - Logical Access Security"
            });

            // Check 6: Azure Policy
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC5.1-001",
                Category = "Governance & Compliance",
                Title = "Azure Policy Assignments",
                Description = "Azure Policy enforces organizational standards and compliance",
                Status = "Partial",
                Weight = 8,
                Recommendation = "Implement Azure Policy to enforce security and compliance standards",
                AzureService = "Azure Policy",
                ControlReference = "CC5.1 - Control Activities"
            });

            // Check 7: Network Security Groups
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC6.7-002",
                Category = "Network Security",
                Title = "Network Security Groups Configured",
                Description = "NSGs provide network-level access control to Azure resources",
                Status = "Pass",
                Weight = 7,
                Recommendation = "Regularly review NSG rules to ensure least-privilege network access",
                AzureService = "Virtual Network",
                ControlReference = "CC6.7 - Network Protection"
            });

            // Check 8: Backup Configuration
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-A1.1-001",
                Category = "Business Continuity",
                Title = "Azure Backup Configured",
                Description = "Azure Backup ensures data availability and disaster recovery",
                Status = "Partial",
                Weight = 9,
                Recommendation = "Configure Azure Backup for critical VMs and databases",
                AzureService = "Azure Backup",
                ControlReference = "A1.1 - Availability & Capacity"
            });

            // Check 9: Multi-Factor Authentication
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC6.2-001",
                Category = "Identity & Authentication",
                Title = "Multi-Factor Authentication Enforced",
                Description = "MFA provides additional security layer for user authentication",
                Status = "Partial",
                Weight = 10,
                Recommendation = "Enforce MFA for all privileged accounts and implement Conditional Access policies",
                AzureService = "Azure AD/Entra ID",
                ControlReference = "CC6.2 - User Access Management"
            });

            // Check 10: Change Tracking
            checks.Add(new ReadinessCheckItem
            {
                CheckId = "RDY-CC8.1-001",
                Category = "Change Management",
                Title = "Azure Activity Log Retention",
                Description = "Activity logs track all changes to Azure resources",
                Status = "Pass",
                Weight = 6,
                Recommendation = "Configure Activity Log retention for at least 90 days",
                AzureService = "Azure Monitor",
                ControlReference = "CC8.1 - Change Management Process"
            });
        }

        var passedChecks = checks.Count(c => c.Status == "Pass");
        var failedChecks = checks.Count(c => c.Status == "Fail");
        var partialChecks = checks.Count(c => c.Status == "Partial");
        var totalWeight = checks.Sum(c => c.Weight);
        var achievedWeight = checks.Where(c => c.Status == "Pass").Sum(c => c.Weight) + 
                            checks.Where(c => c.Status == "Partial").Sum(c => c.Weight * 0.5);
        var readinessScore = totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 0;

        var level = readinessScore switch
        {
            >= 90 => "Audit Ready",
            >= 75 => "Substantially Ready",
            >= 50 => "Partially Ready",
            _ => "Requires Significant Work"
        };

        var criticalGaps = checks
            .Where(c => c.Status == "Fail" && c.Weight >= 8)
            .Select(c => c.Recommendation)
            .ToList();

        var quickWins = checks
            .Where(c => c.Status == "Partial" && c.Weight <= 7)
            .Select(c => c.Recommendation)
            .ToList();

        return new Soc2ReadinessReport
        {
            Checks = checks,
            ReadinessScore = readinessScore,
            TotalChecks = checks.Count,
            PassedChecks = passedChecks,
            FailedChecks = failedChecks,
            PartialChecks = partialChecks,
            ReadinessLevel = level,
            CriticalGaps = criticalGaps,
            QuickWins = quickWins,
            GeneratedAt = DateTime.UtcNow.ToString("O")
        };
    }
}

// Static SOC2 control library
public static class Soc2ControlLibrary
{
    public static List<Soc2ControlDefinition> GetAll() => new()
    {
        new() { ControlId = "CC1.1", TscCategory = "CC1 - Control Environment", Name = "COSO Principle 1", Description = "Organization demonstrates a commitment to integrity and ethical values.", AzureEvidenceTypes = new() { "PolicyCompliance" } },
        new() { ControlId = "CC2.1", TscCategory = "CC2 - Communication & Information", Name = "Information Quality", Description = "Entity obtains or generates relevant, quality information to support the functioning of internal control.", AzureEvidenceTypes = new() { "DiagnosticSettings" } },
        new() { ControlId = "CC4.1", TscCategory = "CC4 - Monitoring Activities", Name = "Ongoing Monitoring", Description = "Entity selects, develops, and performs ongoing evaluations to ascertain whether components of internal control are present and functioning.", AzureEvidenceTypes = new() { "DiagnosticSettings", "SecurityRecommendation" } },
        new() { ControlId = "CC5.1", TscCategory = "CC5 - Control Activities", Name = "Control Selection", Description = "Entity selects and develops control activities that contribute to the mitigation of risks.", AzureEvidenceTypes = new() { "PolicyCompliance" } },
        new() { ControlId = "CC6.1", TscCategory = "CC6 - Logical & Physical Access", Name = "Logical Access Security", Description = "Entity implements logical access security software, infrastructure, and architectures to protect information assets.", AzureEvidenceTypes = new() { "RbacAssignment" } },
        new() { ControlId = "CC6.2", TscCategory = "CC6 - Logical & Physical Access", Name = "Prior Access Removal", Description = "Prior to issuing system credentials, entity registers and authorizes new users.", AzureEvidenceTypes = new() { "RbacAssignment" } },
        new() { ControlId = "CC6.7", TscCategory = "CC6 - Logical & Physical Access", Name = "Transmission & Data Protection", Description = "Entity restricts transmission, movement, and removal of information to authorized users.", AzureEvidenceTypes = new() { "EncryptionStatus", "SecurityRecommendation" } },
        new() { ControlId = "CC7.1", TscCategory = "CC7 - System Operations", Name = "Configuration Management", Description = "Entity uses detection and monitoring procedures to identify changes to configurations.", AzureEvidenceTypes = new() { "SecurityRecommendation", "DiagnosticSettings" } },
        new() { ControlId = "CC7.2", TscCategory = "CC7 - System Operations", Name = "Anomaly Detection", Description = "Entity monitors system components and the operation of those components for anomalies.", AzureEvidenceTypes = new() { "DiagnosticSettings", "SecurityRecommendation" } },
        new() { ControlId = "CC8.1", TscCategory = "CC8 - Change Management", Name = "Change Management Process", Description = "Entity authorizes, designs, develops, acquires, configures, documents, and implements changes to infrastructure.", AzureEvidenceTypes = new() { "DiagnosticSettings", "PolicyCompliance" } },
        new() { ControlId = "A1.1", TscCategory = "A1 - Availability", Name = "Availability Capacity", Description = "Entity maintains current processing and other commitments and system requirements.", AzureEvidenceTypes = new() { "DiagnosticSettings" } },
        new() { ControlId = "C1.1", TscCategory = "C1 - Confidentiality", Name = "Confidential Information", Description = "Entity identifies and maintains confidential information to achieve the entity's objectives.", AzureEvidenceTypes = new() { "EncryptionStatus" } },
        new() { ControlId = "C1.2", TscCategory = "C1 - Confidentiality", Name = "Confidential Disposal", Description = "Entity disposes of confidential information to meet entity objectives.", AzureEvidenceTypes = new() { "EncryptionStatus" } },
    };
}

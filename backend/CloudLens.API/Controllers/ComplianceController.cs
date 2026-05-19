using Microsoft.AspNetCore.Mvc;
using CloudLens.API.Models;
using CloudLens.API.Services;
using CloudLens.API.Data;
using ClosedXML.Excel;
using System.Text;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ComplianceController : ControllerBase
{
    private readonly IComplianceService _complianceService;
    private readonly ICredentialCacheService _credentialCache;
    private readonly ILogger<ComplianceController> _logger;

    public ComplianceController(
        IComplianceService complianceService,
        ICredentialCacheService credentialCache,
        ILogger<ComplianceController> logger)
    {
        _complianceService = complianceService;
        _credentialCache = credentialCache;
        _logger = logger;
    }

    [HttpGet("soc2/control-definitions")]
    public IActionResult GetControlDefinitions()
    {
        return Ok(_complianceService.GetControlDefinitions());
    }

    [HttpPost("soc2/controls")]
    public async Task<IActionResult> GetSoc2Controls([FromBody] ComplianceCollectionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request.SessionId, request.SubscriptionIds);
            if (credentials == null) return Unauthorized("Invalid session");

            await _complianceService.LogAuditEventAsync(new AuditLogEntry
            {
                EventType = "Soc2ControlsViewed",
                Actor = request.SessionId,
                Description = $"SOC2 controls evaluated for {request.SubscriptionIds.Count} subscription(s)"
            });

            var controls = await _complianceService.GetSoc2ControlsAsync(credentials, request.SubscriptionIds);
            return Ok(controls);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching SOC2 controls");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("soc2/evidence/collect")]
    public async Task<IActionResult> CollectEvidence([FromBody] ComplianceCollectionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request.SessionId, request.SubscriptionIds);
            if (credentials == null) return Unauthorized("Invalid session");

            var evidence = await _complianceService.CollectEvidenceAsync(credentials, request.SubscriptionIds);

            await _complianceService.LogAuditEventAsync(new AuditLogEntry
            {
                EventType = "EvidenceCollected",
                Actor = request.SessionId,
                Description = $"Collected {evidence.Count} evidence items across {request.SubscriptionIds.Count} subscription(s)"
            });

            return Ok(new { count = evidence.Count, evidence });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting compliance evidence");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("soc2/gaps")]
    public async Task<IActionResult> GetGapAnalysis([FromBody] ComplianceCollectionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request.SessionId, request.SubscriptionIds);
            if (credentials == null) return Unauthorized("Invalid session");
            var gaps = await _complianceService.GetGapAnalysisAsync(credentials, request.SubscriptionIds);
            return Ok(gaps);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating gap analysis");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("soc2/report")]
    public async Task<IActionResult> GenerateSoc2Report([FromBody] Soc2ReportRequest request)
    {
        try
        {
            var credentials = GetCredentials(request.SessionId, request.SubscriptionIds);
            if (credentials == null) return Unauthorized("Invalid session");

            var report = await _complianceService.GenerateSoc2ReportAsync(credentials, request);

            await _complianceService.LogAuditEventAsync(new AuditLogEntry
            {
                EventType = "ReportGenerated",
                Actor = request.SessionId,
                Description = $"SOC2 {request.ReportType} report generated. Overall compliance: {report.OverallCompliancePercent:F1}%"
            });

            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating SOC2 report");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("soc2/report/export")]
    public async Task<IActionResult> ExportSoc2Report([FromBody] Soc2ReportRequest request, [FromQuery] string format = "excel")
    {
        try
        {
            var credentials = GetCredentials(request.SessionId, request.SubscriptionIds);
            if (credentials == null) return Unauthorized("Invalid session");

            var report = await _complianceService.GenerateSoc2ReportAsync(credentials, request);

            await _complianceService.LogAuditEventAsync(new AuditLogEntry
            {
                EventType = "ExportCreated",
                Actor = request.SessionId,
                Description = $"SOC2 report exported as {format}"
            });

            if (format.ToLower() == "excel")
            {
                var bytes = GenerateSoc2Excel(report);
                return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"SOC2_Report_{DateTime.UtcNow:yyyyMMdd}.xlsx");
            }
            else
            {
                var html = GenerateSoc2Html(report);
                return File(Encoding.UTF8.GetBytes(html), "text/html", $"SOC2_Report_{DateTime.UtcNow:yyyyMMdd}.html");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting SOC2 report");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("audit-log")]
    public async Task<IActionResult> GetAuditLog([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        try
        {
            var logs = await _complianceService.GetAuditLogAsync(pageSize, page);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching audit log");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("soc2/readiness")]
    public async Task<IActionResult> GetReadinessAssessment([FromBody] ComplianceCollectionRequest request)
    {
        try
        {
            var credentials = GetCredentials(request.SessionId, request.SubscriptionIds);
            if (credentials == null) return Unauthorized("Invalid session");

            var assessment = await _complianceService.GetSoc2ReadinessAssessmentAsync(credentials, request.SubscriptionIds);

            await _complianceService.LogAuditEventAsync(new AuditLogEntry
            {
                EventType = "ReadinessAssessment",
                Actor = request.SessionId,
                Description = $"SOC2 readiness assessment completed. Score: {assessment.ReadinessScore:F1}% ({assessment.ReadinessLevel})"
            });

            return Ok(assessment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating readiness assessment");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private AzureCredentials? GetCredentials(string sessionId, List<string> subscriptionIds)
    {
        var credentials = _credentialCache.GetCredentials(sessionId);
        if (credentials == null) return null;
        credentials.SubscriptionIds = subscriptionIds;
        return credentials;
    }

    private byte[] GenerateSoc2Excel(ComplianceReport report)
    {
        using var workbook = new XLWorkbook();

        // Executive Summary sheet
        var summarySheet = workbook.Worksheets.Add("Executive Summary");
        summarySheet.Cell(1, 1).Value = $"SOC2 {report.ReportType} Compliance Report";
        summarySheet.Cell(1, 1).Style.Font.Bold = true;
        summarySheet.Cell(1, 1).Style.Font.FontSize = 16;
        summarySheet.Range(1, 1, 1, 6).Merge();

        summarySheet.Cell(3, 1).Value = "Report Period:";
        summarySheet.Cell(3, 2).Value = $"{report.PeriodStart:yyyy-MM-dd} to {report.PeriodEnd:yyyy-MM-dd}";
        summarySheet.Cell(4, 1).Value = "Generated:";
        summarySheet.Cell(4, 2).Value = report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss UTC");
        summarySheet.Cell(5, 1).Value = "Overall Status:";
        summarySheet.Cell(5, 2).Value = report.OverallStatus;
        summarySheet.Cell(6, 1).Value = "Compliance Score:";
        summarySheet.Cell(6, 2).Value = $"{report.OverallCompliancePercent:F1}%";
        summarySheet.Cell(7, 1).Value = "Total Controls:";
        summarySheet.Cell(7, 2).Value = report.TotalControls;
        summarySheet.Cell(8, 1).Value = "Compliant:";
        summarySheet.Cell(8, 2).Value = report.CompliantControls;
        summarySheet.Cell(9, 1).Value = "Non-Compliant:";
        summarySheet.Cell(9, 2).Value = report.NonCompliantControls;
        summarySheet.Cell(10, 1).Value = "Partially Compliant:";
        summarySheet.Cell(10, 2).Value = report.PartialControls;

        if (!string.IsNullOrEmpty(report.ExecutiveSummary))
        {
            summarySheet.Cell(12, 1).Value = "Executive Summary:";
            summarySheet.Cell(12, 1).Style.Font.Bold = true;
            summarySheet.Cell(13, 1).Value = report.ExecutiveSummary;
            summarySheet.Range(13, 1, 13, 6).Merge();
            summarySheet.Cell(13, 1).Style.Alignment.WrapText = true;
        }

        summarySheet.Columns().AdjustToContents();
        summarySheet.Column(2).Width = 60;

        // Controls Detail sheet
        var controlSheet = workbook.Worksheets.Add("Controls Detail");
        string[] headers = { "Control ID", "TSC Category", "Control Name", "Status", "Compliance %", "Passed", "Failed", "Total Checks" };
        for (int i = 0; i < headers.Length; i++)
        {
            controlSheet.Cell(1, i + 1).Value = headers[i];
            controlSheet.Cell(1, i + 1).Style.Font.Bold = true;
            controlSheet.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.DarkBlue;
            controlSheet.Cell(1, i + 1).Style.Font.FontColor = XLColor.White;
        }

        int row = 2;
        foreach (var control in report.Controls.OrderBy(c => c.ControlId))
        {
            controlSheet.Cell(row, 1).Value = control.ControlId;
            controlSheet.Cell(row, 2).Value = control.TscCategory;
            controlSheet.Cell(row, 3).Value = control.Name;
            controlSheet.Cell(row, 4).Value = control.Status;
            controlSheet.Cell(row, 4).Style.Fill.BackgroundColor = control.Status switch
            {
                "Compliant" => XLColor.LightGreen,
                "NonCompliant" => XLColor.LightSalmon,
                "PartiallyCompliant" => XLColor.LightYellow,
                _ => XLColor.LightGray
            };
            controlSheet.Cell(row, 5).Value = $"{control.CompliancePercent:F1}%";
            controlSheet.Cell(row, 6).Value = control.PassedChecks;
            controlSheet.Cell(row, 7).Value = control.FailedChecks;
            controlSheet.Cell(row, 8).Value = control.TotalChecks;
            row++;
        }
        controlSheet.Columns().AdjustToContents();

        // Gaps sheet
        var gapSheet = workbook.Worksheets.Add("Gap Analysis");
        string[] gapHeaders = { "Control ID", "Gap Description", "Severity", "Remediation Steps", "Status" };
        for (int i = 0; i < gapHeaders.Length; i++)
        {
            gapSheet.Cell(1, i + 1).Value = gapHeaders[i];
            gapSheet.Cell(1, i + 1).Style.Font.Bold = true;
            gapSheet.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.DarkRed;
            gapSheet.Cell(1, i + 1).Style.Font.FontColor = XLColor.White;
        }

        row = 2;
        foreach (var control in report.Controls)
        {
            foreach (var gap in control.Gaps)
            {
                gapSheet.Cell(row, 1).Value = gap.ControlId;
                gapSheet.Cell(row, 2).Value = gap.GapDescription;
                gapSheet.Cell(row, 3).Value = gap.Severity;
                gapSheet.Cell(row, 4).Value = gap.RemediationSteps;
                gapSheet.Cell(row, 5).Value = gap.Status;
                row++;
            }
        }
        gapSheet.Columns().AdjustToContents();
        gapSheet.Column(4).Width = 60;

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private string GenerateSoc2Html(ComplianceReport report)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><style>");
        sb.AppendLine("body { font-family: Arial, sans-serif; margin: 40px; color: #333; }");
        sb.AppendLine("h1 { color: #0078d4; } h2 { color: #005a9e; border-bottom: 2px solid #0078d4; padding-bottom: 8px; }");
        sb.AppendLine(".summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 20px 0; }");
        sb.AppendLine(".metric { background: #f4f4f4; padding: 16px; border-radius: 8px; text-align: center; }");
        sb.AppendLine(".metric h3 { margin: 0 0 8px 0; font-size: 2em; }");
        sb.AppendLine("table { border-collapse: collapse; width: 100%; margin: 20px 0; }");
        sb.AppendLine("th { background: #0078d4; color: white; padding: 12px; text-align: left; }");
        sb.AppendLine("td { border: 1px solid #ddd; padding: 10px; }");
        sb.AppendLine(".compliant { background: #dff6dd; } .noncompliant { background: #fde7e9; } .partial { background: #fff4ce; }");
        sb.AppendLine(".narrative { background: #f0f8ff; padding: 20px; border-left: 4px solid #0078d4; margin: 20px 0; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine($"<h1>SOC2 {report.ReportType} Compliance Report</h1>");
        sb.AppendLine($"<p>Period: {report.PeriodStart:yyyy-MM-dd} to {report.PeriodEnd:yyyy-MM-dd} | Generated: {report.GeneratedAt:yyyy-MM-dd HH:mm} UTC</p>");

        sb.AppendLine("<div class='summary-grid'>");
        sb.AppendLine($"<div class='metric'><h3>{report.OverallCompliancePercent:F0}%</h3><p>Overall Compliance</p></div>");
        sb.AppendLine($"<div class='metric'><h3 style='color:green'>{report.CompliantControls}</h3><p>Compliant Controls</p></div>");
        sb.AppendLine($"<div class='metric'><h3 style='color:red'>{report.NonCompliantControls}</h3><p>Non-Compliant Controls</p></div>");
        sb.AppendLine("</div>");

        if (!string.IsNullOrEmpty(report.ExecutiveSummary))
        {
            sb.AppendLine($"<h2>Executive Summary</h2><div class='narrative'>{report.ExecutiveSummary}</div>");
        }

        sb.AppendLine("<h2>Control Assessment</h2>");
        sb.AppendLine("<table><tr><th>Control ID</th><th>Category</th><th>Name</th><th>Status</th><th>Compliance %</th><th>Checks</th></tr>");
        foreach (var control in report.Controls.OrderBy(c => c.ControlId))
        {
            var cls = control.Status == "Compliant" ? "compliant" : control.Status == "NonCompliant" ? "noncompliant" : "partial";
            sb.AppendLine($"<tr class='{cls}'><td>{control.ControlId}</td><td>{control.TscCategory}</td><td>{control.Name}</td>" +
                          $"<td>{control.Status}</td><td>{control.CompliancePercent:F1}%</td>" +
                          $"<td>{control.PassedChecks}/{control.TotalChecks}</td></tr>");
        }
        sb.AppendLine("</table></body></html>");
        return sb.ToString();
    }
}

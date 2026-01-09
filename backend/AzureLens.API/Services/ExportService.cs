using System.Text;
using AzureLens.API.Models;
using ClosedXML.Excel;

namespace AzureLens.API.Services;

public class ExportService : IExportService
{
    private readonly ILogger<ExportService> _logger;

    public ExportService(ILogger<ExportService> logger)
    {
        _logger = logger;
    }

    public async Task<byte[]> ExportResourcesToPdfAsync(List<AzureResource> resources, string subscriptionName)
    {
        // Simple HTML to PDF approach - can be replaced with a proper PDF library like QuestPDF
        var html = GenerateResourcesHtml(resources, subscriptionName);
        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> ExportResourcesToExcelAsync(List<AzureResource> resources, string subscriptionName)
    {
        try
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add($"{subscriptionName} Resources");

            // Headers
            worksheet.Cell(1, 1).Value = "Resource Name";
            worksheet.Cell(1, 2).Value = "Type";
            worksheet.Cell(1, 3).Value = "Location";
            worksheet.Cell(1, 4).Value = "Resource Group";
            worksheet.Cell(1, 5).Value = "Tags";

            // Format headers
            var headerRange = worksheet.Range(1, 1, 1, 6);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightBlue;

            // Data
            int row = 2;
            foreach (var resource in resources)
            {
                worksheet.Cell(row, 1).Value = resource.Name;
                worksheet.Cell(row, 2).Value = resource.Type;
                worksheet.Cell(row, 3).Value = resource.Location;
                worksheet.Cell(row, 4).Value = resource.ResourceGroup;
                worksheet.Cell(row, 5).Value = resource.Tags != null && resource.Tags.Any() 
                    ? string.Join(", ", resource.Tags.Select(t => $"{t.Key}:{t.Value}"))
                    : "No tags";
                row++;
            }

            // Auto-fit columns
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting resources to Excel");
            throw;
        }
    }

    public async Task<byte[]> ExportCostsToPdfAsync(List<CostData> costs, DateTime startDate, DateTime endDate)
    {
        var html = GenerateCostsHtml(costs, startDate, endDate);
        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> ExportCostsToExcelAsync(List<CostData> costs, DateTime startDate, DateTime endDate)
    {
        try
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Cost Analysis");

            // Title
            worksheet.Cell(1, 1).Value = $"Cost Analysis: {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}";
            worksheet.Range(1, 1, 1, 4).Merge();
            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Font.FontSize = 14;

            // Headers
            worksheet.Cell(3, 1).Value = "Start Date";
            worksheet.Cell(3, 2).Value = "Subscription";
            worksheet.Cell(3, 3).Value = "Currency";
            worksheet.Cell(3, 4).Value = "Total Cost";

            var headerRange = worksheet.Range(3, 1, 3, 4);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGreen;

            // Data
            int row = 4;
            decimal totalCost = 0;
            foreach (var cost in costs.OrderBy(c => c.StartDate))
            {
                worksheet.Cell(row, 1).Value = cost.StartDate.ToString("yyyy-MM-dd");
                worksheet.Cell(row, 2).Value = cost.SubscriptionName ?? "N/A";
                worksheet.Cell(row, 3).Value = cost.Currency;
                worksheet.Cell(row, 4).Value = cost.TotalCost;
                worksheet.Cell(row, 4).Style.NumberFormat.Format = "$#,##0.00";
                totalCost += cost.TotalCost;
                row++;
            }

            // Total
            worksheet.Cell(row + 1, 3).Value = "Total:";
            worksheet.Cell(row + 1, 3).Style.Font.Bold = true;
            worksheet.Cell(row + 1, 4).Value = totalCost;
            worksheet.Cell(row + 1, 4).Style.NumberFormat.Format = "$#,##0.00";
            worksheet.Cell(row + 1, 4).Style.Font.Bold = true;

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting costs to Excel");
            throw;
        }
    }

    public async Task<byte[]> ExportRecommendationsToPdfAsync(List<SecurityRecommendation> recommendations)
    {
        var html = GenerateRecommendationsHtml(recommendations);
        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> ExportRecommendationsToExcelAsync(List<SecurityRecommendation> recommendations)
    {
        try
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Recommendations");

            // Headers
            worksheet.Cell(1, 1).Value = "Title";
            worksheet.Cell(1, 2).Value = "Severity";
            worksheet.Cell(1, 3).Value = "Category";
            worksheet.Cell(1, 4).Value = "Resource";
            worksheet.Cell(1, 5).Value = "Description";

            var headerRange = worksheet.Range(1, 1, 1, 5);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.Orange;

            // Data
            int row = 2;
            foreach (var rec in recommendations.OrderBy(r => r.Severity))
            {
                worksheet.Cell(row, 1).Value = rec.DisplayName;
                worksheet.Cell(row, 2).Value = rec.Severity;
                
                // Color code severity
                var severityCell = worksheet.Cell(row, 2);
                severityCell.Style.Fill.BackgroundColor = rec.Severity?.ToLower() switch
                {
                    "high" => XLColor.Red,
                    "medium" => XLColor.Orange,
                    "low" => XLColor.Yellow,
                    _ => XLColor.White
                };

                worksheet.Cell(row, 3).Value = rec.Category ?? "N/A";
                worksheet.Cell(row, 4).Value = rec.ResourceId ?? "N/A";
                worksheet.Cell(row, 5).Value = rec.Description ?? "N/A";
                row++;
            }

            worksheet.Columns().AdjustToContents();
            worksheet.Column(5).Width = 50; // Description column

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting recommendations to Excel");
            throw;
        }
    }

    private string GenerateResourcesHtml(List<AzureResource> resources, string subscriptionName)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><style>");
        sb.AppendLine("body { font-family: Arial, sans-serif; margin: 20px; }");
        sb.AppendLine("h1 { color: #0078d4; }");
        sb.AppendLine("table { border-collapse: collapse; width: 100%; margin-top: 20px; }");
        sb.AppendLine("th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }");
        sb.AppendLine("th { background-color: #0078d4; color: white; }");
        sb.AppendLine("tr:nth-child(even) { background-color: #f2f2f2; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine($"<h1>Azure Resources - {subscriptionName}</h1>");
        sb.AppendLine($"<p>Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");
        sb.AppendLine($"<p>Total Resources: {resources.Count}</p>");
        sb.AppendLine("<table><tr><th>Name</th><th>Type</th><th>Location</th><th>Resource Group</th></tr>");
        
        foreach (var resource in resources)
        {
            sb.AppendLine($"<tr><td>{resource.Name}</td><td>{resource.Type}</td><td>{resource.Location}</td><td>{resource.ResourceGroup}</td></tr>");
        }
        
        sb.AppendLine("</table></body></html>");
        return sb.ToString();
    }

    private string GenerateCostsHtml(List<CostData> costs, DateTime startDate, DateTime endDate)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><style>");
        sb.AppendLine("body { font-family: Arial, sans-serif; margin: 20px; }");
        sb.AppendLine("h1 { color: #0078d4; }");
        sb.AppendLine("table { border-collapse: collapse; width: 100%; margin-top: 20px; }");
        sb.AppendLine("th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }");
        sb.AppendLine("th { background-color: #107c10; color: white; }");
        sb.AppendLine(".total { font-weight: bold; background-color: #f0f0f0; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine($"<h1>Cost Analysis Report</h1>");
        sb.AppendLine($"<p>Period: {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}</p>");
        sb.AppendLine($"<p>Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");
        sb.AppendLine("<table><tr><th>Date</th><th>Subscription</th><th>Currency</th><th>Total Cost</th></tr>");
        
        decimal total = 0;
        foreach (var cost in costs.OrderBy(c => c.StartDate))
        {
            sb.AppendLine($"<tr><td>{cost.StartDate:yyyy-MM-dd}</td><td>{cost.SubscriptionName ?? "N/A"}</td><td>{cost.Currency}</td><td>${cost.TotalCost:N2}</td></tr>");
            total += cost.TotalCost;
        }
        
        sb.AppendLine($"<tr class='total'><td colspan='3'>Total Cost</td><td>${total:N2}</td></tr>");
        sb.AppendLine("</table></body></html>");
        return sb.ToString();
    }

    private string GenerateRecommendationsHtml(List<SecurityRecommendation> recommendations)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><style>");
        sb.AppendLine("body { font-family: Arial, sans-serif; margin: 20px; }");
        sb.AppendLine("h1 { color: #0078d4; }");
        sb.AppendLine(".recommendation { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }");
        sb.AppendLine(".high { border-left: 5px solid #d13438; }");
        sb.AppendLine(".medium { border-left: 5px solid #ff8c00; }");
        sb.AppendLine(".low { border-left: 5px solid #ffb900; }");
        sb.AppendLine(".severity { font-weight: bold; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine($"<h1>Security & Cost Recommendations</h1>");
        sb.AppendLine($"<p>Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");
        sb.AppendLine($"<p>Total Recommendations: {recommendations.Count}</p>");
        
        foreach (var rec in recommendations)
        {
            var severityClass = rec.Severity?.ToLower() ?? "low";
            sb.AppendLine($"<div class='recommendation {severityClass}'>");
            sb.AppendLine($"<h3>{rec.DisplayName}</h3>");
            sb.AppendLine($"<p><span class='severity'>Severity:</span> {rec.Severity}</p>");
            sb.AppendLine($"<p><span class='severity'>Category:</span> {rec.Category ?? "N/A"}</p>");
            sb.AppendLine($"<p><strong>Description:</strong> {rec.Description ?? "No description available"}</p>");
            if (!string.IsNullOrEmpty(rec.ResourceId))
            {
                sb.AppendLine($"<p><strong>Resource:</strong> {rec.ResourceId}</p>");
            }
            sb.AppendLine("</div>");
        }
        
        sb.AppendLine("</body></html>");
        return sb.ToString();
    }
}

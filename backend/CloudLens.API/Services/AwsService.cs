using Amazon;
using Amazon.CostExplorer;
using Amazon.CostExplorer.Model;
using Amazon.Runtime;
using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IAwsService
{
    Task<List<CloudCostSummary>> GetCostsAsync(AwsCredentials credentials);
}

public class AwsService : IAwsService
{
    private readonly ILogger<AwsService> _logger;

    public AwsService(ILogger<AwsService> logger)
    {
        _logger = logger;
    }

    public async Task<List<CloudCostSummary>> GetCostsAsync(AwsCredentials credentials)
    {
        var awsCreds = new BasicAWSCredentials(credentials.AccessKeyId, credentials.SecretAccessKey);
        var region = RegionEndpoint.GetBySystemName(credentials.Region);
        using var client = new AmazonCostExplorerClient(awsCreds, region);

        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddMonths(-12);

        // Fetch monthly costs grouped by SERVICE and LINKED_ACCOUNT
        var request = new GetCostAndUsageRequest
        {
            TimePeriod = new DateInterval
            {
                Start = startDate.ToString("yyyy-MM-dd"),
                End   = endDate.ToString("yyyy-MM-dd")
            },
            Granularity = Granularity.MONTHLY,
            GroupBy = new List<GroupDefinition>
            {
                new GroupDefinition { Type = GroupDefinitionType.DIMENSION, Key = "LINKED_ACCOUNT" },
                new GroupDefinition { Type = GroupDefinitionType.DIMENSION, Key = "SERVICE" },
            },
            Metrics = new List<string> { "UnblendedCost" }
        };

        _logger.LogInformation("Fetching AWS costs from {start} to {end}", startDate, endDate);

        var response = await client.GetCostAndUsageAsync(request);

        // Aggregate by account
        var accountMap = new Dictionary<string, CloudCostSummary>();

        foreach (var result in response.ResultsByTime)
        {
            var month = result.TimePeriod.Start.Substring(0, 7); // "YYYY-MM"

            foreach (var group in result.Groups)
            {
                var accountId   = group.Keys[0];
                var serviceName = group.Keys[1];
                var amount = group.Metrics.TryGetValue("UnblendedCost", out var metric)
                    ? decimal.TryParse(metric.Amount, out var d) ? d : 0m
                    : 0m;
                var currency = group.Metrics.TryGetValue("UnblendedCost", out var m2) ? m2.Unit : "USD";

                if (!accountMap.TryGetValue(accountId, out var summary))
                {
                    summary = new CloudCostSummary
                    {
                        AccountId   = accountId,
                        AccountName = accountId,
                        Currency    = currency,
                        StartDate   = startDate,
                        EndDate     = endDate,
                    };
                    accountMap[accountId] = summary;
                }

                summary.TotalCost += amount;

                // By service
                var svc = summary.CostsByService.FirstOrDefault(s => s.ServiceName == serviceName);
                if (svc == null) { svc = new CloudCostByService { ServiceName = serviceName }; summary.CostsByService.Add(svc); }
                svc.Cost += amount;

                // Monthly
                var mc = summary.MonthlyCosts.FirstOrDefault(m => m.Month == month);
                if (mc == null) { mc = new CloudMonthlyCost { Month = month, Currency = currency }; summary.MonthlyCosts.Add(mc); }
                mc.Cost += amount;
            }
        }

        foreach (var s in accountMap.Values)
        {
            s.CostsByService = s.CostsByService.OrderByDescending(x => x.Cost).ToList();
            s.MonthlyCosts   = s.MonthlyCosts.OrderBy(x => x.Month).ToList();
        }

        // Try to get friendly account names
        try
        {
            await EnrichAccountNamesAsync(client, accountMap);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not enrich AWS account names (requires organizations:ListAccounts)");
        }

        _logger.LogInformation("Retrieved costs for {count} AWS accounts", accountMap.Count);
        return accountMap.Values.ToList();
    }

    private async Task EnrichAccountNamesAsync(AmazonCostExplorerClient client, Dictionary<string, CloudCostSummary> accountMap)
    {
        // Cost Explorer DimensionValues can return account names
        var dimRequest = new GetDimensionValuesRequest
        {
            TimePeriod = new DateInterval
            {
                Start = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd"),
                End   = DateTime.UtcNow.ToString("yyyy-MM-dd")
            },
            Dimension = Dimension.LINKED_ACCOUNT
        };
        var dimResponse = await client.GetDimensionValuesAsync(dimRequest);
        foreach (var val in dimResponse.DimensionValues)
        {
            if (accountMap.TryGetValue(val.Value, out var summary) && !string.IsNullOrEmpty(val.Attributes.GetValueOrDefault("description")))
                summary.AccountName = val.Attributes["description"];
        }
    }
}

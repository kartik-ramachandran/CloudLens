using Microsoft.Extensions.Configuration;
using AzureLensMcp.Server.Services;
using System.Text.Json;
using System.Text.Json.Nodes;

// Get Azure credentials from environment variables (set by MCP client)
var apiBaseUrl = Environment.GetEnvironmentVariable("API_BASE_URL") ?? "http://localhost:5000";
var tenantId = Environment.GetEnvironmentVariable("AZURE_TENANT_ID");
var clientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID");
var clientSecret = Environment.GetEnvironmentVariable("AZURE_CLIENT_SECRET");

if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
{
    await Console.Error.WriteLineAsync("ERROR: Azure credentials not configured. Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET environment variables in your MCP client configuration.");
    return;
}

// Initialize Azure service
var azureService = new AzureLensService(apiBaseUrl, tenantId, clientId, clientSecret);

// Start MCP server message loop
await RunMcpServerAsync(azureService);

static async Task RunMcpServerAsync(AzureLensService azureService)
{
    using var stdin = Console.OpenStandardInput();
    using var reader = new StreamReader(stdin);

    while (true)
    {
        try
        {
            var line = await reader.ReadLineAsync();
            if (line == null) break;
            if (string.IsNullOrWhiteSpace(line)) continue;

            var request = JsonSerializer.Deserialize<JsonNode>(line);
            if (request == null) continue;

            await ProcessMcpRequestAsync(request, azureService);
        }
        catch (Exception ex)
        {
            await SendErrorResponseAsync(null, $"Error processing request: {ex.Message}");
        }
    }
}

static async Task ProcessMcpRequestAsync(JsonNode request, AzureLensService azureService)
{
    var method = request["method"]?.GetValue<string>();
    var id = request["id"];

    try
    {
        switch (method)
        {
            case "initialize":
                await SendInitializeResponseAsync(id);
                break;

            case "tools/list":
                await SendToolsListAsync(id);
                break;

            case "tools/call":
                await HandleToolCallAsync(request, id, azureService);
                break;

            default:
                await SendErrorResponseAsync(id, $"Unknown method: {method}");
                break;
        }
    }
    catch (Exception ex)
    {
        await SendErrorResponseAsync(id, ex.Message);
    }
}

static async Task SendInitializeResponseAsync(JsonNode? id)
{
    var response = new
    {
        jsonrpc = "2.0",
        id = id?.ToString() ?? "1",
        result = new
        {
            protocolVersion = "2024-11-05",
            capabilities = new
            {
                tools = new { }
            },
            serverInfo = new
            {
                name = "azure-monitor-mcp",
                version = "1.0.0"
            }
        }
    };

    await WriteResponseAsync(response);
}

static async Task SendToolsListAsync(JsonNode? id)
{
    var tools = JsonSerializer.SerializeToNode(new List<object>
    {
        new
        {
            name = "get_subscriptions",
            description = "Get list of all Azure subscriptions",
            inputSchema = new
            {
                type = "object",
                properties = new { },
                required = Array.Empty<string>()
            }
        },
        new
        {
            name = "get_resources",
            description = "Get all resources in a subscription or resource group",
            inputSchema = new
            {
                type = "object",
                properties = new Dictionary<string, object>
                {
                    ["subscriptionId"] = new { type = "string", description = "Azure subscription ID" },
                    ["resourceGroupName"] = new { type = "string", description = "(Optional) Resource group name" }
                },
                required = new[] { "subscriptionId" }
            }
        },
        new
        {
            name = "get_costs",
            description = "Get cost data for a subscription",
            inputSchema = new
            {
                type = "object",
                properties = new Dictionary<string, object>
                {
                    ["subscriptionId"] = new { type = "string", description = "Azure subscription ID" },
                    ["startDate"] = new { type = "string", description = "Start date (YYYY-MM-DD)" },
                    ["endDate"] = new { type = "string", description = "End date (YYYY-MM-DD)" }
                },
                required = new[] { "subscriptionId", "startDate", "endDate" }
            }
        },
        new
        {
            name = "get_resource_skus",
            description = "Get available SKUs for resources in a subscription",
            inputSchema = new
            {
                type = "object",
                properties = new Dictionary<string, object>
                {
                    ["subscriptionId"] = new { type = "string", description = "Azure subscription ID" },
                    ["location"] = new { type = "string", description = "(Optional) Azure region" }
                },
                required = new[] { "subscriptionId" }
            }
        },
        new
        {
            name = "get_resource_groups",
            description = "Get all resource groups in a subscription",
            inputSchema = new
            {
                type = "object",
                properties = new Dictionary<string, object>
                {
                    ["subscriptionId"] = new { type = "string", description = "Azure subscription ID" }
                },
                required = new[] { "subscriptionId" }
            }
        },
        new
        {
            name = "get_recommendations",
            description = "Get Azure security and cost recommendations",
            inputSchema = new
            {
                type = "object",
                properties = new Dictionary<string, object>
                {
                    ["subscriptionId"] = new { type = "string", description = "Azure subscription ID" }
                },
                required = new[] { "subscriptionId" }
            }
        }
    });

    var response = new
    {
        jsonrpc = "2.0",
        id = id?.ToString(),
        result = new
        {
            tools = tools
        }
    };

    await WriteResponseAsync(response);
}

static async Task HandleToolCallAsync(JsonNode request, JsonNode? id, AzureLensService azureService)
{
    var parameters = request["params"];
    var name = parameters?["name"]?.GetValue<string>();
    var arguments = parameters?["arguments"]?.AsObject();

    try
    {
        object? result = name switch
        {
            "get_subscriptions" => await azureService.GetSubscriptionsAsync(),
            "get_resources" => await azureService.GetResourcesAsync(
                arguments?["subscriptionId"]?.GetValue<string>() ?? "",
                arguments?["resourceGroupName"]?.GetValue<string>()),
            "get_costs" => await azureService.GetCostsAsync(
                arguments?["subscriptionId"]?.GetValue<string>() ?? "",
                arguments?["startDate"]?.GetValue<string>() ?? "",
                arguments?["endDate"]?.GetValue<string>() ?? ""),
            "get_resource_skus" => await azureService.GetResourceSkusAsync(
                arguments?["subscriptionId"]?.GetValue<string>() ?? "",
                arguments?["location"]?.GetValue<string>()),
            "get_resource_groups" => await azureService.GetResourceGroupsAsync(
                arguments?["subscriptionId"]?.GetValue<string>() ?? ""),
            "get_recommendations" => await azureService.GetRecommendationsAsync(
                arguments?["subscriptionId"]?.GetValue<string>() ?? ""),
            _ => throw new Exception($"Unknown tool: {name}")
        };

        var response = new
        {
            jsonrpc = "2.0",
            id = id?.ToString(),
            result = new
            {
                content = new[]
                {
                    new
                    {
                        type = "text",
                        text = JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true })
                    }
                }
            }
        };

        await WriteResponseAsync(response);
    }
    catch (Exception ex)
    {
        await SendErrorResponseAsync(id, $"Tool execution failed: {ex.Message}");
    }
}

static async Task SendErrorResponseAsync(JsonNode? id, string message)
{
    var response = new
    {
        jsonrpc = "2.0",
        id = id?.ToString(),
        error = new
        {
            code = -32603,
            message = message
        }
    };

    await WriteResponseAsync(response);
}

static async Task WriteResponseAsync(object response)
{
    var json = JsonSerializer.Serialize(response);
    await Console.Out.WriteLineAsync(json);
    await Console.Out.FlushAsync();
}

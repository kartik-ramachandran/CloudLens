# AzureLens - Azure Resource Monitor

A full-stack application to monitor Azure resources, costs, and security recommendations with AI-powered insights. Includes a web UI, REST API, and Model Context Protocol (MCP) server for AI assistant integration.

## Features

### Core Features
- **Multi-Subscription Support**: Monitor resources across multiple Azure subscriptions
- **Resource Discovery**: View all Azure resources with detailed information
- **Cost Analysis**: Track and analyze Azure spending
- **Security Recommendations**: Get Azure Defender/Microsoft Defender for Cloud recommendations
- **AI Insights**: Generate intelligent recommendations using OpenAI
- **Data Caching**: SQLite-based caching for improved performance

### MCP Server Integration
- **AI Assistant Integration**: Use with Claude Desktop, GitHub Copilot, or any MCP-compatible client
- **Conversational Queries**: Ask natural language questions about your Azure environment
- **Real-time Data**: Leverages AzureLens API with caching

## Architecture

```
┌─────────────────┐
│  React Web UI  │
└────────┬────────┘
         │
┌────────▼────────────┐      ┌──────────────┐
│  .NET 8 Web API    │◄─────┤  MCP Server  │◄── AI Assistants
│   (AzureLens)     │      └──────────────┘    (Claude, etc.)
└────────┬────────────┘
         │
    ┌────▼────┐
    │ SQLite  │
    │  Cache  │
    └────┬────┘
         │
    ┌────▼────────┐
    │  Azure SDK  │
    └─────────────┘
```

## Tech Stack

- **Frontend**: React with TypeScript, Material-UI, Recharts
- **Backend**: .NET 8 Web API, Entity Framework Core
- **Database**: SQLite (for caching)
- **MCP Server**: .NET 9, Model Context Protocol
- **Cloud**: Azure SDK, Azure Resource Manager
- **AI**: OpenAI GPT-4o
- **Integration**: Jira REST API

## Prerequisites

- .NET 8 SDK (for main API)
- .NET 9 SDK (for MCP server)
- Node.js (v18+)
- Azure Service Principal with appropriate permissions:
  - Reader access to subscriptions
  - Cost Management Reader
  - Security Reader
- (Optional) OpenAI API key for AI insights

## Quick Start

### Option 1: Docker (Recommended)

```powershell
# Clone the repository
git clone <repository-url>
cd azurelens

# Set environment variables (optional)
$env:OPENAI_API_KEY="your-key-here"

# Start services
docker-compose up -d
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Option 2: Local Development

**Backend:**
```powershell
cd AzureLens.API
dotnet restore
dotnet run
```
API runs on `http://localhost:8080`

**Frontend:**
```powershell
cd azurelens-ui
npm install
npm start
```
UI runs on `http://localhost:3000`

## Azure Service Principal Setup

Create a service principal with necessary permissions:

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac --name "AzureLensApp" --role Reader

# Assign additional roles
az role assignment create --assignee <service-principal-id> --role "Cost Management Reader"
az role assignment create --assignee <service-principal-id> --role "Security Reader"
```

Save the output:
- `appId` → Client ID
- `password` → Client Secret
- `tenant` → Tenant ID

## MCP Server Setup (Optional)

The MCP server allows AI assistants to query your Azure environment conversationally.

### Prerequisites
- AzureLens API must be running
- Azure Service Principal credentials

### Configuration for Claude Desktop

1. **Build the MCP server:**
```powershell
cd AzureMonitorMcp/AzureMonitorMcp.Server
dotnet build
```

2. **Configure Claude Desktop:**

Edit your Claude Desktop configuration file:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "azurelens": {
      "command": "dotnet",
      "args": [
        "run",
        "--project",
        "<FULL_PATH_TO_PROJECT>\\AzureMonitorMcp\\AzureMonitorMcp.Server"
      ],
      "env": {
        "API_BASE_URL": "http://localhost:5000",
        "AZURE_TENANT_ID": "your-tenant-id",
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

### Using the MCP Server

Once configured, you can ask Claude:
- "What Azure subscriptions do I have?"
- "Show me all resources in subscription xyz"
- "What are my resource groups?"
- "Get cost data for the last 30 days"
- "Show me security recommendations"

### Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_subscriptions` | List all Azure subscriptions | None |
| `get_resources` | Get resources in subscription/resource group | subscriptionId, resourceGroupName (optional) |
| `get_costs` | Get cost data for date range | subscriptionId, startDate, endDate |
| `get_resource_groups` | List resource groups | subscriptionId |
| `get_resource_skus` | Get available SKUs | subscriptionId, location (optional) |
| `get_recommendations` | Get security/cost recommendations | subscriptionId |

## Usage

### Web Application

1. Navigate to http://localhost:3000
2. Enter Azure credentials (Tenant ID, Client ID, Client Secret)
3. Click "Connect to Azure"
4. Explore tabs:
   - **Monitoring**: View all resources
   - **Costs**: Analyze spending
   - **Recommendations**: See security/cost recommendations
   - **AI Insights**: Get AI-generated insights
   - **Cloud Accounts**: Manage credentials

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/azure/connect` | POST | Authenticate with Azure |
| `/api/azure/subscriptions` | GET | Get all subscriptions |
| `/api/azure/resources` | GET | Get resources |
| `/api/azure/costs` | GET | Get cost analysis |
| `/api/azure/recommendations` | GET | Get Defender recommendations |
| `/api/azure/resource-groups` | GET | Get resource groups |
| `/api/ai/insights` | POST | Get AI-powered insights |
| `/api/export/resources` | POST | Export resources to PDF/Excel |
| `/api/export/costs` | POST | Export costs to PDF/Excel |
| `/api/export/recommendations` | POST | Export recommendations to PDF/Excel |
| `/api/notifications/settings` | GET/PUT | Manage notification settings |
| `/api/notifications/send` | POST | Send notification to configured channel |
| `/api/notifications/test` | POST | Test notification configuration |

## Configuration

### Backend Configuration (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=azurelens.db"
  },
  "CacheSettings": {
    "ResourceCacheMinutes": 30,
    "CostCacheMinutes": 60,
    "AIRecommendationCacheMinutes": 120
  },
  "OpenAI": {
    "ApiKey": "YOUR_OPENAI_API_KEY",
    "Model": "gpt-4o",
    "MaxTokens": 2000,
    "Temperature": 0.7
  }
}
```

### Environment Variables (Docker)

```bash
OPENAI_API_KEY=your-openai-key
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Data Source=/app/data/azurelens.db
```

## Development

### Project Structure

```
├── AzureLens.API/           # .NET Web API
│   ├── Controllers/            # API endpoints
│   ├── Services/               # Business logic
│   ├── Models/                 # Data models
│   └── Data/                   # EF Core context
├── azurelens-ui/           # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── services/           # API client
│   │   └── types/              # TypeScript types
│   └── public/
├── AzureMonitorMcp/            # MCP Server
│   └── AzureMonitorMcp.Server/ # .NET MCP implementation
└── docker-compose.yml          # Docker configuration
```

### Building for Production

**Backend:**
```powershell
cd AzureLens.API
dotnet publish -c Release -o ./publish
```

**Frontend:**
```powershell
cd azurelens-ui
npm run build
```

**Docker:**
```powershell
docker-compose build
```

## Security Best Practices

- **Never commit credentials** to version control
- **Use Azure Key Vault** for production secrets
- **Rotate Service Principal secrets** regularly
- **Use Managed Identity** when running in Azure
- **Limit Service Principal permissions** (least privilege)
- **Enable MFA** on Azure accounts
- **Review audit logs** regularly

## Troubleshooting

### API Issues
- Ensure Service Principal has correct permissions
- Check subscription IDs are valid
- Verify network connectivity to Azure

### MCP Server Issues
- Ensure AzureLens API is running before starting MCP server
- Check API_BASE_URL points to correct endpoint
- Verify credentials in MCP client configuration
- Check MCP server logs in Claude Desktop: Help → View Logs

### Frontend Issues
- Verify API is running on expected port
- Check browser console for errors
- Clear browser cache and cookies

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is dual-licensed under:

### 1. GNU Affero General Public License v3.0 (AGPL-3.0)

For **open source use**, this project is licensed under the **AGPL-3.0** license - see the [LICENSE](LICENSE) file for details.

**What this means for open source users:**
- ✅ **Free to use** - For personal, non-commercial, and open source projects
- ✅ **Free to modify** - You can change the code
- ✅ **Must share modifications** - If you modify and deploy as a service, you must make your source code available
- ✅ **Must use AGPL-3.0** - Any derivative work must also be AGPL-3.0
- ⚠️ **Network copyleft** - If you run this as a web service, users must have access to the source code

**IMPORTANT for SaaS/Service Providers:**
If you run a modified version of AzureLens as a network service (SaaS, internal company service, etc.), you are **required to provide the complete source code** to your users under AGPL-3.0.

### 2. Commercial License

For **commercial use** without AGPL-3.0 obligations, you must obtain a commercial license.

**Who needs a commercial license?**
- 🏢 Companies using AzureLens internally without sharing source code
- 💼 SaaS providers offering AzureLens as a service
- 🔒 Organizations that need proprietary modifications
- 🚀 Businesses that cannot comply with AGPL-3.0 requirements

**Commercial license benefits:**
- ✅ Use in closed-source/proprietary products
- ✅ No requirement to share source code
- ✅ Host as SaaS without AGPL obligations
- ✅ Priority support and custom features
- ✅ Legal protection and indemnification

**Contact for commercial licensing:**
- Email: kartik_ramachandran@outlook.com

### Which License Do I Need?

| Use Case | License Required |
|----------|-----------------|
| Personal project | AGPL-3.0 (Free) |
| Open source project | AGPL-3.0 (Free) |
| Learning/Education | AGPL-3.0 (Free) |
| Internal company use (no modifications) | AGPL-3.0 (Free) |
| Internal company use (with modifications) | **Commercial License** |
| SaaS/Cloud service | **Commercial License** |
| Embedded in proprietary product | **Commercial License** |
| Cannot share source code | **Commercial License** |

### Contributing
By contributing to this project, you agree that your contributions will be licensed under the AGPL-3.0 license.

## Optional Integrations

The following integrations are available in the codebase but not required for core functionality:

### Jira Integration
Create tickets directly from Azure recommendations. To enable:

1. **Configure Jira settings** via the UI (Cloud Accounts tab)
2. **Required fields:**
   - Jira URL
   - Username/Email
   - API Token
   - Project Key

3. **API Endpoints:**
   - `GET/PUT /api/jira/settings` - Manage Jira configuration
   - `POST /api/jira/create-ticket` - Create ticket from recommendation

4. **Usage:**
   - View recommendations in the UI
   - Click "Create Jira Ticket" button
   - Automatically populated with recommendation details

This integration is useful for teams that want to track Azure recommendations in their existing workflow management system.

### Slack/Teams Notifications
Send Azure alerts and recommendations to Slack or Microsoft Teams channels. To enable:

1. **Create a webhook:**
   - **Slack**: Create an Incoming Webhook in your Slack workspace
   - **Teams**: Create an Incoming Webhook connector in your Teams channel

2. **Configure via API:**
```bash
curl -X PUT http://localhost:8080/api/notifications/settings \
  -H "Content-Type: application/json" \
  -d '{
    "channelType": 0,
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "channelName": "#azure-alerts",
    "isEnabled": true
  }'
```

3. **Send notifications:**
```bash
curl -X POST http://localhost:8080/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "High Severity Security Alert",
    "message": "Critical security recommendation requires attention",
    "color": "#d13438",
    "fields": [
      {"name": "Severity", "value": "High", "isShort": true},
      {"name": "Category", "value": "Security", "isShort": true}
    ]
  }'
```

**Use cases:**
- Alert on high-severity security recommendations
- Daily/weekly cost summaries
- Resource provisioning notifications
- Compliance violation alerts

### Report Exports (PDF/Excel)
Export Azure data to downloadable reports for sharing and archiving.

**Available exports:**
- **Resources**: List all resources with details
- **Costs**: Cost analysis with date ranges
- **Recommendations**: Security and cost optimization recommendations

**Export via API:**
```bash
# Export resources to Excel
curl -X POST http://localhost:8080/api/export/resources \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "subscriptionIds": ["sub-id"],
    "format": 1
  }' \
  --output resources.xlsx

# Export costs to Excel
curl -X POST http://localhost:8080/api/export/costs \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "format": 1,
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  }' \
  --output costs.xlsx
```

**Format options:**
- `0` = PDF (HTML format)
- `1` = Excel (.xlsx)

**Use cases:**
- Monthly executive reports
- Audit documentation
- Budget planning
- Stakeholder communications

## Roadmap

### Planned Enhancements
- [ ] Multi-cloud support (AWS, GCP)
- [ ] Advanced cost optimization recommendations
- [ ] Custom dashboards and reports
- [ ] Role-based access control (RBAC)
- [ ] Webhook notifications for alerts
- [ ] Azure DevOps integration
- [ ] ServiceNow integration
- [x] **Slack/Teams notifications** - ✅ Implemented
- [x] **PDF/Excel report exports** - ✅ Implemented
- [ ] Historical trend analysis
- [ ] Resource tagging recommendations
- [ ] Compliance reporting (SOC2, ISO27001, etc.)
- [ ] Budget alerts and forecasting
- [ ] Resource lifecycle management
- [ ] Auto-remediation workflows
- [ ] Custom policy engine

### Potential Integrations
- [ ] PagerDuty for incident management
- [ ] GitHub Actions for automated workflows
- [ ] Terraform/Bicep for IaC recommendations
- [ ] Azure Cost Management API enhancements
- [ ] Azure Policy integration
- [ ] Azure Blueprints support

---

**Note**: Replace `<repository-url>` and `<FULL_PATH_TO_PROJECT>` with actual values when setting up.

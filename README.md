# CloudLens — Azure Resource Monitor & Compliance Platform

CloudLens is a unified Azure management platform built for engineering and compliance teams. It brings cost intelligence, security compliance, infrastructure visibility, and AI-powered insights into a single, purpose-built control center — eliminating the need to context-switch between the Azure Portal, spreadsheets, and siloed monitoring tools.

## Features

### Infrastructure
- **Resource Discovery** — Browse all Azure resources across subscriptions with filtering and search
- **Cost Analysis** — Track spending trends and budget utilisation over time
- **FinOps** — Detect waste, rightsizing opportunities, and cost anomalies automatically
- **Monitoring** — AKS services, pods, alerts, and Defender secure scores

### Compliance & Security (SOC 2)
- **SOC2 Controls** — Evaluate controls against Trust Service Criteria in real time
- **Access Reviews** — RBAC assignments, privileged users, and guest access (CC6)
- **Change Management** — Azure Activity Log — who changed what and when (CC8)
- **Remediation Tracker** — Track compliance gaps with owners, dates, and Jira tickets
- **Readiness Assessment** — Pre-audit SOC2 readiness score with action items
- **Availability** — Service health incidents and backup coverage (A1)
- **Vulnerabilities** — Defender CVE findings, CVSS scores, and patch status (CC7.2)
- **Network Security** — NSG risky rules, public IP exposure, and open ports (CC6.6)
- **Secrets Monitor** — App registration secrets and Key Vault cert/secret expiry (CC6.1)

### Insights
- **Recommendations** — Defender for Cloud security recommendations
- **AI Insights** — AI-powered cost, security, and compliance analysis
- **SOC Incident Management** — Incident tracking with auto-remediation workflows

### Platform
- **Authentication** — Email/password, Google SSO, Microsoft SSO
- **Multi-tenant** — Manage multiple Azure subscriptions from one account
- **Integrations** — Jira ticket creation, Slack/Teams notifications, PDF/Excel exports
- **Dual database** — SQLite for local development, PostgreSQL for production

## Architecture

```
┌─────────────────────────┐
│     React + MUI UI      │
│     (CloudLens UI)      │
└────────────┬────────────┘
             │ REST / JWT
┌────────────▼────────────┐
│   ASP.NET Core 8 API    │
│     (CloudLens API)     │
└──────┬──────────────────┘
       │
  ┌────┴──────────┐
  │  SQLite (dev) │
  │  PostgreSQL   │
  │  (prod)       │
  └────┬──────────┘
       │
  ┌────▼──────────────┐
  │  Azure SDK /      │
  │  Microsoft Graph  │
  └───────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Material UI v5, Recharts |
| Backend | ASP.NET Core 8, Entity Framework Core |
| Database | SQLite (local) / PostgreSQL (production) |
| Auth | JWT Bearer, ASP.NET Identity, Google & Microsoft OAuth |
| Cloud | Azure SDK, Azure Resource Manager, Microsoft Graph |
| AI | OpenAI GPT-4o |
| Integrations | Jira REST API, Slack / Teams webhooks |

## Prerequisites

- .NET 8 SDK
- Node.js 18+
- Azure Service Principal with:
  - Reader access to subscriptions
  - Cost Management Reader
  - Security Reader
- (Optional) OpenAI API key for AI insights

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone <repository-url>
cd azurelens

# Optional
export OPENAI_API_KEY=your-key-here

docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Option 2: Local Development

**Backend:**
```bash
cd backend/CloudLens.API
dotnet restore
dotnet run
```

**Frontend:**
```bash
cd frontend/cloudlens-ui
npm install
npm start
```

### Demo Account

A demo account is seeded automatically on first run:

| Field | Value |
|-------|-------|
| Email | `demo@cloudlens.io` |
| Password | `Demo1234!` |

## Azure Service Principal Setup

```bash
az login

az ad sp create-for-rbac --name "CloudLensApp" --role Reader

az role assignment create --assignee <sp-id> --role "Cost Management Reader"
az role assignment create --assignee <sp-id> --role "Security Reader"
```

Save the output — `appId` → Client ID, `password` → Client Secret, `tenant` → Tenant ID.

## Configuration

### Backend (`appsettings.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=cloudlens.db"
  },
  "Jwt": {
    "Secret": "your-secret-min-32-chars",
    "Issuer": "CloudLens",
    "Audience": "CloudLens"
  },
  "OpenAI": {
    "ApiKey": "YOUR_OPENAI_API_KEY",
    "Model": "gpt-4o",
    "MaxTokens": 2000
  }
}
```

### PostgreSQL (Production)

Set `DefaultConnection` to a Postgres connection string:

```
Host=your-host;Database=cloudlens;Username=user;Password=pass
```

SQL migration scripts are in [`sql/`](sql/) — run them in order on a fresh database.

### Environment Variables

```bash
OPENAI_API_KEY=your-openai-key
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Host=...
Jwt__Secret=your-secret
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/forgot-password` | POST | Request password reset token |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/azure/subscriptions` | GET | List subscriptions |
| `/api/azure/resources` | GET | List resources |
| `/api/azure/costs` | GET | Cost analysis |
| `/api/azure/recommendations` | GET | Defender recommendations |
| `/api/finops/summary` | GET | FinOps waste and savings |
| `/api/compliance/soc2` | GET | SOC2 control evaluation |
| `/api/accessreview` | GET | RBAC and privileged access |
| `/api/changemanagement` | GET | Activity log changes |
| `/api/vulnerabilities` | GET | CVE findings |
| `/api/networksecurity` | GET | NSG and exposure analysis |
| `/api/secrets` | GET | Secrets and cert expiry |
| `/api/ai/insights` | POST | AI-powered insights |
| `/api/export/resources` | POST | Export to PDF/Excel |
| `/api/notifications/settings` | GET/PUT | Notification config |
| `/api/jira/create-ticket` | POST | Create Jira ticket |

## Project Structure

```
├── backend/
│   └── CloudLens.API/
│       ├── Controllers/        # API endpoints
│       ├── Services/           # Business logic
│       ├── Data/               # EF Core context & entities
│       └── sql/                # PostgreSQL migration scripts
├── frontend/
│   └── cloudlens-ui/
│       └── src/
│           ├── components/     # React components
│           ├── services/       # API client
│           ├── theme/          # MUI theme & design system
│           └── types/          # TypeScript types
├── sql/                        # Canonical PostgreSQL migrations
└── docker-compose.yml
```

## Security Best Practices

- Never commit credentials to version control
- Use Azure Key Vault or environment secrets for production
- Rotate Service Principal secrets regularly
- Use Managed Identity when running in Azure
- Apply least-privilege to all Service Principal roles
- Review audit logs regularly via the Change Management module

## Integrations

### Jira
Create tickets directly from compliance findings and security recommendations via the Remediation Tracker. Configure your Jira URL, email, API token, and project key in Settings.

### Slack / Teams
Send alerts and recommendations to a Slack or Teams channel via incoming webhook. Configure via `PUT /api/notifications/settings`.

### PDF / Excel Exports
Export resources, costs, and recommendations to `.xlsx` or PDF. Use format `0` for PDF, `1` for Excel via `/api/export/*`.

## License

This project is dual-licensed:

### AGPL-3.0 (Open Source)

Free for personal, educational, and open-source projects. If you run a modified version as a network service, you must provide the complete source code to your users.

### Commercial License

Required for:
- Internal company use with proprietary modifications
- SaaS / hosted services without sharing source code
- Embedded use in closed-source products

Contact: kartik_ramachandran@outlook.com

| Use Case | License |
|----------|---------|
| Personal / learning | AGPL-3.0 (Free) |
| Open source project | AGPL-3.0 (Free) |
| Internal use, no modifications | AGPL-3.0 (Free) |
| Internal use with modifications | Commercial |
| SaaS / hosted service | Commercial |
| Proprietary product | Commercial |

By contributing to this project, you agree your contributions will be licensed under AGPL-3.0.

---

> Replace `<repository-url>` with your actual repository URL.

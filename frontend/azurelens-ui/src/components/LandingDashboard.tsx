import React from 'react';
import {
  Box, Card, CardContent, CardActionArea, Typography, Grid, Chip,
  Select, MenuItem, FormControl, InputLabel, Alert
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SavingsIcon from '@mui/icons-material/Savings';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudIcon from '@mui/icons-material/Cloud';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import BuildIcon from '@mui/icons-material/Build';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BugReportIcon from '@mui/icons-material/BugReport';
import LanIcon from '@mui/icons-material/Lan';
import SettingsIcon from '@mui/icons-material/Settings';
import { AzureCredentials } from '../types';

interface LandingDashboardProps {
  credentials: AzureCredentials;
  selectedSubscriptionId: string;
  onSubscriptionChange: (id: string) => void;
  onNavigate: (page: string) => void;
}

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  group: string;
  badge?: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  // Resources & Cost
  { id: 'resources', title: 'Resources', description: 'Browse all Azure resources across your subscription', icon: <StorageIcon sx={{ fontSize: 36 }} />, color: '#0078d4', group: 'Infrastructure' },
  { id: 'costs', title: 'Costs', description: 'Monitor spending trends and budget utilisation', icon: <AttachMoneyIcon sx={{ fontSize: 36 }} />, color: '#107c10', group: 'Infrastructure' },
  { id: 'finops', title: 'FinOps', description: 'Detect waste, rightsizing opportunities and anomalies', icon: <SavingsIcon sx={{ fontSize: 36 }} />, color: '#e67e00', group: 'Infrastructure' },
  { id: 'monitoring', title: 'Monitoring', description: 'AKS services, pods, alerts and secure scores', icon: <MonitorHeartIcon sx={{ fontSize: 36 }} />, color: '#8764b8', group: 'Infrastructure' },
  // Compliance & Security
  { id: 'compliance', title: 'SOC2 Controls', description: 'Evaluate controls against Trust Service Criteria', icon: <VerifiedUserIcon sx={{ fontSize: 36 }} />, color: '#0078d4', group: 'Compliance & Security' },
  { id: 'access-reviews', title: 'Access Reviews', description: 'RBAC assignments, privileged users and guest access', icon: <ManageAccountsIcon sx={{ fontSize: 36 }} />, color: '#c30052', group: 'Compliance & Security', badge: 'CC6' },
  { id: 'change-management', title: 'Change Management', description: 'Azure Activity Log — who changed what and when', icon: <ChangeCircleIcon sx={{ fontSize: 36 }} />, color: '#4a5568', group: 'Compliance & Security', badge: 'CC8' },
  { id: 'remediation', title: 'Remediation Tracker', description: 'Track compliance gaps with owners, dates and Jira tickets', icon: <BuildIcon sx={{ fontSize: 36 }} />, color: '#d13438', group: 'Compliance & Security' },
  { id: 'readiness', title: 'Readiness Assessment', description: 'Pre-audit SOC2 readiness score with action items', icon: <ChecklistIcon sx={{ fontSize: 36 }} />, color: '#006f94', group: 'Compliance & Security' },
  { id: 'availability', title: 'Availability', description: 'Service health incidents and backup coverage', icon: <HealthAndSafetyIcon sx={{ fontSize: 36 }} />, color: '#107c10', group: 'Compliance & Security', badge: 'A1' },
  { id: 'vulnerabilities', title: 'Vulnerabilities', description: 'Defender CVE findings, CVSS scores and patch status', icon: <BugReportIcon sx={{ fontSize: 36 }} />, color: '#b22222', group: 'Compliance & Security', badge: 'CC7.2' },
  { id: 'network-security', title: 'Network Security', description: 'NSG risky rules, public IP exposure and open ports', icon: <LanIcon sx={{ fontSize: 36 }} />, color: '#5c2d91', group: 'Compliance & Security', badge: 'CC6.6' },
  // Insights
  { id: 'recommendations', title: 'Recommendations', description: 'Defender for Cloud security recommendations', icon: <SecurityIcon sx={{ fontSize: 36 }} />, color: '#e67e00', group: 'Insights' },
  { id: 'ai-insights', title: 'AI Insights', description: 'AI-powered cost, security and compliance insights', icon: <AutoAwesomeIcon sx={{ fontSize: 36 }} />, color: '#0099bc', group: 'Insights' },
  { id: 'cloud-accounts', title: 'Cloud Accounts', description: 'Manage connected Azure subscriptions', icon: <CloudIcon sx={{ fontSize: 36 }} />, color: '#0078d4', group: 'Insights' },
  { id: 'settings', title: 'Settings', description: 'Configure AI providers, notifications and integrations', icon: <SettingsIcon sx={{ fontSize: 36 }} />, color: '#5c636a', group: 'Insights' },
];

const GROUP_ORDER = ['Infrastructure', 'Compliance & Security', 'Insights'];

const LandingDashboard: React.FC<LandingDashboardProps> = ({
  credentials, selectedSubscriptionId, onSubscriptionChange, onNavigate
}) => {
  const isSubscriptionSelected = !!selectedSubscriptionId;
  const selectedSub = credentials.subscriptions?.find(s => s.subscriptionId === selectedSubscriptionId);

  const groups = GROUP_ORDER.filter(g => FEATURE_CARDS.some(c => c.group === g));

  return (
    <Box>
      {/* Subscription Selector Hero */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #0066CC 0%, #004999 100%)', color: 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Welcome to AzureLens
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, mb: 3 }}>
            Select a subscription to start exploring your Azure environment
          </Typography>
          <FormControl sx={{ minWidth: 380 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.8)', '&.Mui-focused': { color: 'white' } }}>
              Select Subscription
            </InputLabel>
            <Select
              value={selectedSubscriptionId}
              label="Select Subscription"
              onChange={(e) => onSubscriptionChange(e.target.value)}
              displayEmpty
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.8)' },
                '& .MuiSvgIcon-root': { color: 'white' },
              }}
            >
              {credentials.subscriptions?.map(sub => (
                <MenuItem key={sub.subscriptionId} value={sub.subscriptionId}>
                  {sub.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isSubscriptionSelected && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Tenant: ${credentials.tenantId?.substring(0, 8)}...`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} size="small" />
              <Chip label={selectedSub?.displayName ?? ''} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} size="small" />
              <Chip label={`ID: ${selectedSubscriptionId.substring(0, 8)}...`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} size="small" />
            </Box>
          )}
        </CardContent>
      </Card>

      {!isSubscriptionSelected && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Select a subscription above to enable all features.
        </Alert>
      )}

      {/* Feature Card Groups */}
      {groups.map(group => (
        <Box key={group} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
            {group}
          </Typography>
          <Grid container spacing={2}>
            {FEATURE_CARDS.filter(c => c.group === group).map(card => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
                <Card
                  sx={{
                    height: '100%',
                    opacity: isSubscriptionSelected ? 1 : 0.45,
                    transition: 'all 0.2s',
                    border: '1px solid #e0e0e0',
                    '&:hover': isSubscriptionSelected ? {
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)',
                      borderColor: card.color,
                    } : {},
                  }}
                >
                  <CardActionArea
                    onClick={() => isSubscriptionSelected && onNavigate(card.id)}
                    disabled={!isSubscriptionSelected}
                    sx={{ height: '100%', p: 0 }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ color: card.color }}>{card.icon}</Box>
                        {card.badge && (
                          <Chip label={card.badge} size="small" sx={{ bgcolor: `${card.color}18`, color: card.color, fontSize: '0.65rem', fontWeight: 700 }} />
                        )}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {card.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default LandingDashboard;

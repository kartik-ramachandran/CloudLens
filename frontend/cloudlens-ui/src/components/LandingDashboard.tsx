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
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { AzureCredentials } from '../types';
import { CloudProvider } from './CloudProviderSelectModal';
import { GroupLabel } from '../theme/designSystem';

const PROVIDER_META: Record<CloudProvider, { label: string; color: string; heroGradient: string }> = {
  azure: { label: 'Azure', color: '#1455d9', heroGradient: 'linear-gradient(135deg, #08111f 0%, #0f2f7a 42%, #0ea5e9 72%, #14b8a6 100%)' },
  aws:   { label: 'AWS',   color: '#f97316', heroGradient: 'linear-gradient(135deg, #111827 0%, #b45309 50%, #f97316 100%)' },
  gcp:   { label: 'GCP',   color: '#16a34a', heroGradient: 'linear-gradient(135deg, #0f172a 0%, #1455d9 45%, #16a34a 100%)' },
};

interface LandingDashboardProps {
  credentials: AzureCredentials;
  selectedSubscriptionId: string;
  onSubscriptionChange: (id: string) => void;
  onNavigate: (page: string) => void;
  selectedProviders?: CloudProvider[];
  activeProvider?: CloudProvider;
  onProviderChange?: (p: CloudProvider) => void;
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
  { id: 'resources',         title: 'Resources',           description: 'Browse all Azure resources across your subscription',              icon: <StorageIcon sx={{ fontSize: 34 }} />,         color: '#0078d4', group: 'Infrastructure' },
  { id: 'costs',             title: 'Costs',               description: 'Monitor spending trends and budget utilisation',                   icon: <AttachMoneyIcon sx={{ fontSize: 34 }} />,     color: '#107c10', group: 'Infrastructure' },
  { id: 'finops',            title: 'FinOps',              description: 'Detect waste, rightsizing opportunities and anomalies',            icon: <SavingsIcon sx={{ fontSize: 34 }} />,         color: '#e67e00', group: 'Infrastructure' },
  { id: 'monitoring',        title: 'Monitoring',          description: 'AKS services, pods, alerts and secure scores',                    icon: <MonitorHeartIcon sx={{ fontSize: 34 }} />,    color: '#8764b8', group: 'Infrastructure' },
  { id: 'compliance',        title: 'SOC2 Controls',       description: 'Evaluate controls against Trust Service Criteria',                icon: <VerifiedUserIcon sx={{ fontSize: 34 }} />,    color: '#0078d4', group: 'Compliance & Security' },
  { id: 'access-reviews',    title: 'Access Reviews',      description: 'RBAC assignments, privileged users and guest access',             icon: <ManageAccountsIcon sx={{ fontSize: 34 }} />,  color: '#c30052', group: 'Compliance & Security', badge: 'CC6' },
  { id: 'change-management', title: 'Change Management',   description: 'Azure Activity Log — who changed what and when',                  icon: <ChangeCircleIcon sx={{ fontSize: 34 }} />,    color: '#4a5568', group: 'Compliance & Security', badge: 'CC8' },
  { id: 'remediation',       title: 'Remediation Tracker', description: 'Track compliance gaps with owners, dates and Jira tickets',       icon: <BuildIcon sx={{ fontSize: 34 }} />,           color: '#d13438', group: 'Compliance & Security' },
  { id: 'readiness',         title: 'Readiness Assessment',description: 'Pre-audit SOC2 readiness score with action items',               icon: <ChecklistIcon sx={{ fontSize: 34 }} />,       color: '#006f94', group: 'Compliance & Security' },
  { id: 'availability',      title: 'Availability',        description: 'Service health incidents and backup coverage',                    icon: <HealthAndSafetyIcon sx={{ fontSize: 34 }} />, color: '#107c10', group: 'Compliance & Security', badge: 'A1' },
  { id: 'vulnerabilities',   title: 'Vulnerabilities',     description: 'Defender CVE findings, CVSS scores and patch status',            icon: <BugReportIcon sx={{ fontSize: 34 }} />,       color: '#b22222', group: 'Compliance & Security', badge: 'CC7.2' },
  { id: 'network-security',  title: 'Network Security',    description: 'NSG risky rules, public IP exposure and open ports',             icon: <LanIcon sx={{ fontSize: 34 }} />,             color: '#5c2d91', group: 'Compliance & Security', badge: 'CC6.6' },
  { id: 'secrets-monitor',   title: 'Secrets Monitor',     description: 'App registration secrets and Key Vault cert/secret expiry',       icon: <VpnKeyIcon sx={{ fontSize: 34 }} />,          color: '#8764b8', group: 'Compliance & Security', badge: 'CC6.1' },
  { id: 'recommendations',   title: 'Recommendations',     description: 'Defender for Cloud security recommendations',                    icon: <SecurityIcon sx={{ fontSize: 34 }} />,        color: '#e67e00', group: 'Insights' },
  { id: 'ai-insights',       title: 'AI Insights',         description: 'AI-powered cost, security and compliance insights',              icon: <AutoAwesomeIcon sx={{ fontSize: 34 }} />,     color: '#0099bc', group: 'Insights' },
  { id: 'cloud-accounts',    title: 'Cloud Accounts',      description: 'Manage connected Azure subscriptions',                           icon: <CloudIcon sx={{ fontSize: 34 }} />,           color: '#0078d4', group: 'Insights' },
  { id: 'settings',          title: 'Settings',            description: 'Configure AI providers, notifications and integrations',         icon: <SettingsIcon sx={{ fontSize: 34 }} />,        color: '#5c636a', group: 'Insights' },
];

const GROUP_ORDER = ['Infrastructure', 'Compliance & Security', 'Insights'];

const LandingDashboard: React.FC<LandingDashboardProps> = ({
  credentials, selectedSubscriptionId, onSubscriptionChange, onNavigate,
  selectedProviders = ['azure'], activeProvider = 'azure', onProviderChange,
}) => {
  const isSubscriptionSelected = !!selectedSubscriptionId;
  const selectedSub = credentials.subscriptions?.find(s => s.subscriptionId === selectedSubscriptionId);
  const groups = GROUP_ORDER.filter(g => FEATURE_CARDS.some(c => c.group === g));
  const activeMeta = PROVIDER_META[activeProvider];

  return (
    <Box sx={{ pb: 4 }}>

      {/* ── PROVIDER TABS (shown when multiple providers selected) ── */}
      {selectedProviders.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          {selectedProviders.map(p => {
            const meta = PROVIDER_META[p];
            const isActive = activeProvider === p;
            return (
              <Box
                key={p}
                onClick={() => onProviderChange?.(p)}
                sx={{
                  cursor: 'pointer',
                  px: 2.4, py: 1,
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  border: `1px solid ${isActive ? meta.color : 'rgba(148,163,184,0.26)'}`,
                  bgcolor: isActive ? meta.color : 'background.paper',
                  color: isActive ? 'white' : meta.color,
                  boxShadow: isActive ? `0 14px 30px ${meta.color}36` : '0 10px 26px rgba(15,23,42,0.06)',
                  transition: 'all 0.18s ease',
                  userSelect: 'none',
                  '&:hover': { bgcolor: meta.color, color: 'white', transform: 'translateY(-1px)' },
                }}
              >
                {meta.label}
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── HERO CARD ── */}
      <Card sx={{
        mb: 4, color: 'white', overflow: 'hidden', position: 'relative',
        background: activeMeta.heroGradient,
        minHeight: 210,
        transition: 'background 0.4s ease',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 34px 90px rgba(8,17,31,0.22)',
      }}>
        <Box sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
          maskImage: 'linear-gradient(90deg, black, transparent 82%)',
          pointerEvents: 'none',
        }} />

        <CardContent sx={{ p: 4, position: 'relative' }}>
          <Typography variant="overline" sx={{ opacity: 0.78, letterSpacing: 2, fontSize: '0.62rem', fontWeight: 800 }}>
            MULTI-CLOUD MANAGEMENT PLATFORM
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, lineHeight: 1.12, fontSize: { xs: '2rem', md: '2.45rem' } }}>
            Welcome to CloudLens
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.86, mb: 3, maxWidth: 650 }}>
            {activeProvider === 'azure'
              ? 'A polished command center for costs, resources, risk, compliance, and cloud operations.'
              : `Viewing ${activeMeta.label} — select a feature below`}
          </Typography>

          {activeProvider === 'azure' && (
            <FormControl sx={{ minWidth: 380 }}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.8)', '&.Mui-focused': { color: 'white' } }}>
                Select Subscription
              </InputLabel>
              <Select
                value={selectedSubscriptionId}
                label="Select Subscription"
                onChange={e => onSubscriptionChange(e.target.value)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(18px)',
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
          )}

          {activeProvider === 'azure' && isSubscriptionSelected && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip label={`Tenant: ${credentials.tenantId?.substring(0, 8)}…`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: '0.7rem' }} />
              <Chip label={selectedSub?.displayName ?? ''} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: '0.7rem' }} />
              <Chip label={`ID: ${selectedSubscriptionId.substring(0, 8)}…`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: '0.7rem' }} />
            </Box>
          )}
        </CardContent>
      </Card>

      {activeProvider === 'azure' && !isSubscriptionSelected && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Select a subscription above to enable all features.
        </Alert>
      )}

      {/* ── FEATURE CARD GROUPS ── */}
      {groups.map(group => (
        <Box key={group} sx={{ mb: 4 }}>
          <GroupLabel>{group}</GroupLabel>
          <Grid container spacing={2}>
            {FEATURE_CARDS.filter(c => c.group === group).map(card => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
                <Card sx={{
                  height: '100%',
                  opacity: (activeProvider !== 'azure' || isSubscriptionSelected) ? 1 : 0.45,
                  transition: 'all 0.22s ease',
                  border: '1px solid rgba(148,163,184,0.18)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,251,255,0.86))',
                  '&:hover': (activeProvider !== 'azure' || isSubscriptionSelected) ? {
                    boxShadow: `0 22px 52px ${card.color}22`,
                    transform: 'translateY(-4px)',
                    borderColor: card.color,
                    background: `linear-gradient(180deg, ${card.color}10, rgba(255,255,255,0.94))`,
                  } : {},
                }}>
                  <CardActionArea
                    onClick={() => (activeProvider !== 'azure' || isSubscriptionSelected) && onNavigate(card.id)}
                    disabled={activeProvider === 'azure' && !isSubscriptionSelected}
                    sx={{ height: '100%', p: 0 }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{
                          width: 48, height: 48, borderRadius: 2,
                          background: `linear-gradient(135deg, ${card.color}20, rgba(255,255,255,0.85))`,
                          border: `1px solid ${card.color}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: card.color,
                          transition: 'background 0.2s',
                        }}>
                          {card.icon}
                        </Box>
                        {card.badge && (
                          <Chip label={card.badge} size="small" sx={{
                            bgcolor: `${card.color}18`, color: card.color,
                            fontSize: '0.62rem', fontWeight: 700, height: 20,
                          }} />
                        )}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
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

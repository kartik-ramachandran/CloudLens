import React from 'react';
import {
  Box, Card, CardContent, CardActionArea, Typography, Grid, Chip,
  Select, MenuItem, FormControl, Alert
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
const COMMAND_RAIL = ['Inventory', 'Spend', 'Exposure', 'Compliance'];

const LandingDashboard: React.FC<LandingDashboardProps> = ({
  credentials, selectedSubscriptionId, onSubscriptionChange, onNavigate,
  selectedProviders = ['azure'], activeProvider = 'azure', onProviderChange,
}) => {
  const isSubscriptionSelected = !!selectedSubscriptionId;
  const selectedSub = credentials.subscriptions?.find(s => s.subscriptionId === selectedSubscriptionId);
  const groups = GROUP_ORDER.filter(g => FEATURE_CARDS.some(c => c.group === g));
  const activeMeta = PROVIDER_META[activeProvider];

  return (
    <Box sx={{ pb: 4, position: 'relative' }}>
      <Box sx={{
        position: 'absolute',
        inset: { xs: '-18px -16px auto', md: '-28px -24px auto' },
        height: 260,
        background:
          'radial-gradient(circle at 18% 12%, rgba(20,85,217,0.16), transparent 34%), radial-gradient(circle at 82% 8%, rgba(20,184,166,0.18), transparent 32%)',
        pointerEvents: 'none',
      }} />

      {/* ── PROVIDER TABS (shown when multiple providers selected) ── */}
      {selectedProviders.length > 0 && (
        <Box sx={{
          position: 'relative',
          display: 'inline-flex',
          gap: 0.6,
          mb: 3,
          p: 0.6,
          borderRadius: 999,
          bgcolor: 'rgba(255,255,255,0.78)',
          border: '1px solid rgba(148,163,184,0.22)',
          boxShadow: '0 18px 45px rgba(31,51,86,0.10)',
          backdropFilter: 'blur(18px)',
          flexWrap: 'wrap',
        }}>
          {selectedProviders.map(p => {
            const meta = PROVIDER_META[p];
            const isActive = activeProvider === p;
            return (
              <Box
                key={p}
                onClick={() => onProviderChange?.(p)}
                sx={{
                  cursor: 'pointer',
                  px: 2.25, py: 0.9,
                  borderRadius: 999,
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  border: `1px solid ${isActive ? `${meta.color}55` : 'transparent'}`,
                  bgcolor: isActive ? meta.color : 'transparent',
                  color: isActive ? 'white' : meta.color,
                  boxShadow: isActive ? `0 15px 30px ${meta.color}38` : 'none',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  '&:hover': { bgcolor: isActive ? meta.color : `${meta.color}10`, transform: 'translateY(-1px)' },
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
        minHeight: { xs: 280, md: 230 },
        transition: 'background 0.4s ease',
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: '0 42px 110px rgba(8,17,31,0.28)',
        borderRadius: 3,
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
        <Box sx={{
          position: 'absolute',
          width: 360,
          height: 360,
          right: { xs: -190, md: 56 },
          top: { xs: 150, md: -22 },
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.18)',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.28) 0 2px, transparent 3px 100%), radial-gradient(circle, rgba(255,255,255,0.18), transparent 62%)',
          backgroundSize: '34px 34px, 100% 100%',
          opacity: 0.78,
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute',
          right: { xs: 22, md: 56 },
          bottom: { xs: 24, md: 28 },
          width: { xs: 230, md: 360 },
          display: 'grid',
          gap: 1,
        }}>
          {COMMAND_RAIL.map((label, index) => (
            <Box key={label} sx={{
              width: `${92 - index * 9}%`,
              ml: 'auto',
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 16px 36px rgba(0,0,0,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Typography variant="caption" sx={{ fontWeight: 900, color: 'rgba(255,255,255,0.86)' }}>
                {label}
              </Typography>
              <Box sx={{
                width: 64 - index * 6,
                height: 5,
                borderRadius: 999,
                background: index % 2 === 0
                  ? 'linear-gradient(90deg, #7dd3fc, #5eead4)'
                  : 'linear-gradient(90deg, #fbbf24, #fb7185)',
              }} />
            </Box>
          ))}
        </Box>

        <CardContent sx={{
          p: { xs: 3, md: 4 },
          position: 'relative',
          minHeight: { xs: 280, md: 230 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          maxWidth: { xs: '100%', md: 560 },
        }}>
          <Typography variant="overline" sx={{ opacity: 0.82, letterSpacing: 2, fontSize: '0.62rem', fontWeight: 900 }}>
            MULTI-CLOUD OVERVIEW
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 950, mb: 0.8, lineHeight: 1.04, fontSize: { xs: '2rem', md: '2.45rem' }, maxWidth: 520 }}>
            Your cloud at a glance
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.86, mb: 3, maxWidth: 470, fontSize: { xs: '0.94rem', md: '1rem' } }}>
            Pick a subscription to activate resources, costs, security, compliance, and AI insights.
          </Typography>

          {activeProvider === 'azure' && (
            <FormControl sx={{ width: { xs: '100%', sm: 380 } }}>
              <Select
                value={selectedSubscriptionId}
                displayEmpty
                onChange={e => onSubscriptionChange(e.target.value)}
                renderValue={(value) => {
                  if (!value) return 'Select Subscription';
                  return credentials.subscriptions?.find(sub => sub.subscriptionId === value)?.displayName ?? value;
                }}
                inputProps={{ 'aria-label': 'Select subscription' }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(18px)',
                  color: 'white',
                  borderRadius: 2,
                  fontWeight: 700,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.8)' },
                  '& .MuiSvgIcon-root': { color: 'white' },
                }}
              >
                {(credentials.subscriptions?.length ?? 0) === 0 && (
                  <MenuItem value="" disabled>
                    No subscriptions available
                  </MenuItem>
                )}
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
        <Alert
          severity="info"
          sx={{
            mb: 3,
            borderRadius: 3,
            bgcolor: 'rgba(224,242,254,0.76)',
            border: '1px solid rgba(14,165,233,0.18)',
            boxShadow: '0 18px 48px rgba(14,165,233,0.10)',
            alignItems: 'center',
          }}
        >
          Select a subscription to enable all modules.
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
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: 1,
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
                  border: `1px solid ${card.color}1f`,
                  background:
                    `linear-gradient(180deg, ${card.color}0d 0%, rgba(255,255,255,0.92) 42%, rgba(248,251,255,0.88) 100%)`,
                  boxShadow: '0 18px 48px rgba(31,51,86,0.08)',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background:
                      `radial-gradient(circle at 18% 0%, ${card.color}22, transparent 34%), linear-gradient(90deg, ${card.color}, transparent 52%)`,
                    height: 4,
                    pointerEvents: 'none',
                  },
                  '&:after': {
                    content: '""',
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    right: -58,
                    top: -58,
                    borderRadius: '50%',
                    border: `1px solid ${card.color}1f`,
                    background: `${card.color}0a`,
                    pointerEvents: 'none',
                  },
                  '&:hover': (activeProvider !== 'azure' || isSubscriptionSelected) ? {
                    boxShadow: `0 26px 62px ${card.color}24`,
                    transform: 'translateY(-5px)',
                    borderColor: card.color,
                    background: `linear-gradient(180deg, ${card.color}14, rgba(255,255,255,0.95) 52%, rgba(248,251,255,0.92))`,
                  } : {},
                }}>
                  <CardActionArea
                    onClick={() => (activeProvider !== 'azure' || isSubscriptionSelected) && onNavigate(card.id)}
                    disabled={activeProvider === 'azure' && !isSubscriptionSelected}
                    sx={{
                      height: '100%',
                      p: 0,
                      cursor: activeProvider === 'azure' && !isSubscriptionSelected ? 'default' : 'pointer',
                      '&.Mui-disabled': { opacity: 1 },
                    }}
                  >
                    <CardContent sx={{ p: 2.6, position: 'relative', minHeight: 150 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{
                          width: 52, height: 52, borderRadius: 2.2,
                          background: `linear-gradient(135deg, ${card.color}20, rgba(255,255,255,0.92))`,
                          border: `1px solid ${card.color}24`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: card.color,
                          boxShadow: `0 16px 34px ${card.color}18`,
                          transition: 'background 0.2s, transform 0.2s',
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
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5, minHeight: 39 }}>
                        {card.description}
                      </Typography>
                      {activeProvider === 'azure' && !isSubscriptionSelected && (
                        <Chip
                          label="Preview"
                          size="small"
                          sx={{
                            mt: 1.8,
                            height: 22,
                            bgcolor: `${card.color}12`,
                            color: card.color,
                            border: `1px solid ${card.color}1f`,
                            fontSize: '0.66rem',
                            fontWeight: 900,
                          }}
                        />
                      )}
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

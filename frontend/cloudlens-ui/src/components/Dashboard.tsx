import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  Breadcrumbs,
  Link,
  Chip,
  Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SavingsIcon from '@mui/icons-material/Savings';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BugReportIcon from '@mui/icons-material/BugReport';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { CacheStatusIndicator } from './CacheStatusIndicator';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BuildIcon from '@mui/icons-material/Build';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AzureCredentials } from '../types';
import { CloudProvider, CloudCredentials } from './CloudProviderSelectModal';
import ResourcesTab from './ResourcesTab';
import CostsTab from './CostsTab';
import RecommendationsTab from './RecommendationsTab';
import SettingsTab from './SettingsTab';
import AIInsightsTab from './AIInsightsTab';
import CloudAccountsTab from './CloudAccountsTab';
import LandingDashboard from './LandingDashboard';
import MonitoringTab from './MonitoringTab';
import FinOpsDashboard from './FinOpsDashboard';
import Soc2ComplianceDashboard from './Soc2ComplianceDashboard';
import AccessReviewDashboard from './AccessReviewDashboard';
import ChangeManagementReport from './ChangeManagementReport';
import RemediationTracker from './RemediationTracker';
import ReadinessAssessment from './ReadinessAssessment';
import AvailabilityReport from './AvailabilityReport';
import VulnerabilityManagement from './VulnerabilityManagement';
import NetworkSecurityReport from './NetworkSecurityReport';
import SocIncidentDashboard from './SocIncidentDashboard';
import SecretsMonitor from './SecretsMonitor';
import CloudAssistantChat from './CloudAssistantChat';

interface DashboardProps {
  credentials: AzureCredentials;
  onDisconnect: () => void;
  currentUser?: { name?: string; email?: string; role?: string; profilePictureUrl?: string } | null;
  selectedProviders?: CloudProvider[];
  onChangeProviders?: () => void;
  cloudCredentials?: CloudCredentials;
}

const PROVIDER_COLORS: Record<CloudProvider, string> = {
  azure: '#0078D4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

const APP_CHROME_GRAD = 'linear-gradient(135deg, #08111f 0%, #0f2f7a 42%, #0ea5e9 72%, #14b8a6 100%)';
const HEADER_CONTROL_SX = {
  color: 'white',
  bgcolor: 'rgba(255,255,255,0.11)',
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
} as const;

const Dashboard: React.FC<DashboardProps> = ({ credentials, onDisconnect, currentUser, selectedProviders = ['azure'], onChangeProviders, cloudCredentials }) => {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>(
    credentials.subscriptions?.[0]?.subscriptionId ?? ''
  );
  const [activeProvider, setActiveProvider] = useState<CloudProvider>(selectedProviders[0] ?? 'azure');

  // Keep activeProvider in sync when selectedProviders changes
  React.useEffect(() => {
    if (!selectedProviders.includes(activeProvider)) {
      setActiveProvider(selectedProviders[0] ?? 'azure');
    }
  }, [selectedProviders]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page: string) => {
    setActivePage(page);
  };

  const activeCredentials = selectedSubscriptionId
    ? { ...credentials, subscriptionIds: [selectedSubscriptionId] }
    : credentials;

  const selectedSubName = credentials.subscriptions?.find(
    s => s.subscriptionId === selectedSubscriptionId
  )?.displayName ?? 'All Subscriptions';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'resources', label: 'Resources', icon: <StorageIcon /> },
    { id: 'costs', label: 'Costs', icon: <AttachMoneyIcon /> },
    { id: 'finops', label: 'FinOps', icon: <SavingsIcon /> },
    { id: 'monitoring', label: 'Monitoring', icon: <MonitorHeartIcon /> },
    { id: 'recommendations', label: 'Recommendations', icon: <SecurityIcon /> },
    { id: 'compliance', label: 'SOC2 Compliance', icon: <VerifiedUserIcon /> },
    { id: 'access-reviews', label: 'Access Reviews', icon: <AssignmentIcon /> },
    { id: 'change-management', label: 'Change Management', icon: <TrendingUpIcon /> },
    { id: 'remediation', label: 'Remediation Tracker', icon: <BuildIcon /> },
    { id: 'readiness', label: 'SOC2 Readiness', icon: <AssessmentIcon /> },
    { id: 'availability', label: 'Availability Report', icon: <HealthAndSafetyIcon /> },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: <BugReportIcon /> },
    { id: 'network-security', label: 'Network Security', icon: <NetworkCheckIcon /> },
    { id: 'secrets-monitor', label: 'Secrets Monitor', icon: <VpnKeyIcon /> },
    { id: 'soc-incidents', label: 'SOC Incidents', icon: <SecurityIcon /> },
    { id: 'assistant', label: 'Assistant', icon: <ChatBubbleOutlineIcon /> },
    { id: 'ai-insights', label: 'AI Insights', icon: <AutoAwesomeIcon /> },
    { id: 'cloud-accounts', label: 'Cloud Accounts', icon: <CloudIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Header */}
      <Box
        sx={{
          background: APP_CHROME_GRAD,
          color: 'white',
          px: { xs: 1.5, md: 3 },
          py: { xs: 1, md: 1.15 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          boxShadow: '0 18px 52px rgba(8,17,31,0.26)',
          borderBottom: '1px solid rgba(255,255,255,0.16)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backdropFilter: 'blur(18px)',
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 30px rgba(8,17,31,0.18)',
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/logo.svg"
              alt=""
              sx={{ width: 27, height: 27, filter: 'brightness(0) invert(1)' }}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
              CloudLens
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.72)',
                display: { xs: 'none', sm: 'block' },
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Multi-cloud command center
            </Typography>
          </Box>
          <Chip
            label="Live"
            size="small"
            sx={{
              ml: { xs: 0, md: 0.75 },
              bgcolor: 'rgba(20,184,166,0.18)',
              border: '1px solid rgba(94,234,212,0.34)',
              color: '#d9fffb',
              height: 24,
              fontSize: '0.68rem',
              fontWeight: 800,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', lg: 'flex-end' },
            gap: { xs: 1, md: 1.25 },
            ml: { xs: 0, lg: 'auto' },
            width: { xs: '100%', lg: 'auto' },
            minWidth: 0,
            flexWrap: 'wrap',
          }}
        >
          {(credentials.subscriptions?.length ?? 0) > 0 && (
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 230, md: 270 }, maxWidth: { xs: '100%', md: 320 } }}>
              <Select
                value={selectedSubscriptionId}
                onChange={(e) => setSelectedSubscriptionId(e.target.value)}
                displayEmpty
                sx={{
                  bgcolor: 'rgba(255,255,255,0.13)',
                  backdropFilter: 'blur(14px)',
                  borderRadius: 2,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.24)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.44)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.72)' },
                  '.MuiSvgIcon-root': { color: 'white' },
                }}
              >
                <MenuItem value=""><em>All Subscriptions</em></MenuItem>
                {credentials.subscriptions?.map(sub => (
                  <MenuItem key={sub.subscriptionId} value={sub.subscriptionId}>
                    {sub.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 0.75,
              py: 0.55,
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
              flexWrap: 'wrap',
            }}
          >
            <Tooltip title="Change cloud providers">
              <Box
                onClick={onChangeProviders}
                sx={{ display: 'flex', gap: 0.6, cursor: 'pointer', alignItems: 'center' }}
                role="button"
                aria-label="Change cloud providers"
              >
                {selectedProviders.map(p => (
                  <Chip
                    key={p}
                    label={p.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: PROVIDER_COLORS[p],
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.66rem',
                      height: 24,
                      border: '1px solid rgba(255,255,255,0.38)',
                      boxShadow: `0 8px 18px ${PROVIDER_COLORS[p]}3a`,
                    }}
                  />
                ))}
              </Box>
            </Tooltip>
          </Box>

          <CacheStatusIndicator />

          <Tooltip title="Open settings">
            <IconButton
              onClick={() => handlePageChange('settings')}
              sx={HEADER_CONTROL_SX}
              size="small"
              aria-label="Open settings"
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: { xs: 0, md: 0.25 },
              pl: { xs: 0, md: 1.25 },
              borderLeft: { xs: 'none', md: '1px solid rgba(255,255,255,0.16)' },
              minWidth: 0,
            }}
          >
            <Avatar sx={{ width: 38, height: 38, bgcolor: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', flexShrink: 0 }}>
              <PersonIcon />
            </Avatar>
            <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.name ?? 'Azure User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.74)', lineHeight: 1.2, display: 'block', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedSubscriptionId ? selectedSubName : `${credentials.subscriptionIds?.length || 0} subscription(s)`}
              </Typography>
            </Box>
            <Tooltip title="Sign out">
              <IconButton size="small" onClick={onDisconnect} sx={{ ...HEADER_CONTROL_SX, ml: { xs: 0, md: 0.25 } }} aria-label="Sign out">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>


      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 'calc(100vh - 72px)',
          background: theme => theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #f8fbff 0%, #eef3f8 52%, #e8f0f8 100%)'
            : 'linear-gradient(180deg, #07111f 0%, #0b1526 58%, #08101d 100%)',
        }}
      >

        {/* Breadcrumb Navigation */}
        {activePage !== 'dashboard' && (
          <Box 
            sx={{ 
              px: 3, 
              pt: 2, 
              pb: 1,
              bgcolor: 'rgba(255,255,255,0.58)',
              backdropFilter: 'blur(18px)',
              borderBottom: '1px solid rgba(15,23,42,0.08)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                size="small"
                onClick={() => handlePageChange('dashboard')}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': { 
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Breadcrumbs>
                <Link
                  component="button"
                  variant="body1"
                  onClick={() => handlePageChange('dashboard')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    textDecoration: 'none',
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                    cursor: 'pointer'
                  }}
                >
                  <HomeIcon fontSize="small" />
                  Dashboard
                </Link>
                <Typography
                  color="text.primary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
                >
                  {menuItems.find(item => item.id === activePage)?.icon}
                  {menuItems.find(item => item.id === activePage)?.label}
                </Typography>
              </Breadcrumbs>
            </Box>
          </Box>
        )}

        {/* Page Content */}
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1680, mx: 'auto' }}>
          {/* Each page component manages its own data, state and behavior independently */}
          {activePage === 'dashboard' && (
            <LandingDashboard
              credentials={activeCredentials}
              selectedSubscriptionId={selectedSubscriptionId}
              onSubscriptionChange={setSelectedSubscriptionId}
              onNavigate={handlePageChange}
              selectedProviders={selectedProviders}
              activeProvider={activeProvider}
              onProviderChange={setActiveProvider}
            />
          )}
          {activePage === 'resources' && (
            <ResourcesTab credentials={activeCredentials} />
          )}
          {activePage === 'costs' && (
            <CostsTab credentials={activeCredentials} activeProvider={activeProvider} onChangeProviders={onChangeProviders} cloudCredentials={cloudCredentials} />
          )}
          {activePage === 'finops' && (
            <FinOpsDashboard credentials={activeCredentials} />
          )}
          {activePage === 'monitoring' && (
            <MonitoringTab credentials={activeCredentials} />
          )}
          {activePage === 'recommendations' && (
            <RecommendationsTab credentials={activeCredentials} />
          )}
          {activePage === 'compliance' && (
            <Soc2ComplianceDashboard credentials={activeCredentials} />
          )}
          {activePage === 'access-reviews' && (
            <AccessReviewDashboard credentials={activeCredentials} />
          )}
          {activePage === 'change-management' && (
            <ChangeManagementReport credentials={activeCredentials} />
          )}
          {activePage === 'remediation' && (
            <RemediationTracker credentials={activeCredentials} />
          )}
          {activePage === 'readiness' && (
            <ReadinessAssessment credentials={activeCredentials} />
          )}
          {activePage === 'availability' && (
            <AvailabilityReport credentials={activeCredentials} />
          )}
          {activePage === 'vulnerabilities' && (
            <VulnerabilityManagement credentials={activeCredentials} />
          )}
          {activePage === 'network-security' && (
            <NetworkSecurityReport credentials={activeCredentials} />
          )}
          {activePage === 'secrets-monitor' && (
            <SecretsMonitor credentials={activeCredentials} />
          )}
          {activePage === 'soc-incidents' && (
            <SocIncidentDashboard credentials={activeCredentials} />
          )}
          {activePage === 'assistant' && (
            <CloudAssistantChat />
          )}
          {activePage === 'ai-insights' && (
            <AIInsightsTab credentials={activeCredentials} />
          )}
          {activePage === 'cloud-accounts' && (
            <CloudAccountsTab credentials={activeCredentials} />
          )}
          {activePage === 'settings' && (
            <SettingsTab credentials={credentials} onDisconnect={onDisconnect} selectedProviders={selectedProviders} onChangeProviders={onChangeProviders} />
          )}
        </Box>
      </Box>
    </Box>
  );
};
export default Dashboard;

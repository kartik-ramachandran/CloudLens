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
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BuildIcon from '@mui/icons-material/Build';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { AzureCredentials, AzureResource, CostData, SecurityRecommendation } from '../types';
import { CloudProvider, CloudCredentials } from './CloudProviderSelectModal';
import ResourcesTab from './ResourcesTab';
import CostsTab from './CostsTab';
import RecommendationsTab from './RecommendationsTab';
import SettingsTab from './SettingsTab';
import AIInsightsTab from './AIInsightsTab';
import CloudAccountsTab from './CloudAccountsTab';
import SubscriptionDashboard from './SubscriptionDashboard';
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

interface DashboardProps {
  credentials: AzureCredentials;
  onDisconnect: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
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

const Dashboard: React.FC<DashboardProps> = ({ credentials, onDisconnect, darkMode, onToggleDarkMode, currentUser, selectedProviders = ['azure'], onChangeProviders, cloudCredentials }) => {
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
    { id: 'soc-incidents', label: 'SOC Incidents', icon: <SecurityIcon /> },
    { id: 'ai-insights', label: 'AI Insights', icon: <AutoAwesomeIcon /> },
    { id: 'cloud-accounts', label: 'Cloud Accounts', icon: <CloudIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1464 0%, #0066CC 60%, #0099bc 100%)',
          color: 'white',
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box 
            component="img" 
            src="/logo.svg" 
            alt="AzureLens"
            sx={{ 
              width: 40, 
              height: 40,
              filter: 'brightness(0) invert(1)' // Make logo white on blue background
            }} 
          />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            CloudLens
          </Typography>
        </Box>

        {/* User Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {(credentials.subscriptions?.length ?? 0) > 0 && (
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <Select
                value={selectedSubscriptionId}
                onChange={(e) => setSelectedSubscriptionId(e.target.value)}
                displayEmpty
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '.MuiSvgIcon-root': { color: 'white' }
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
          
          {/* Dark Mode Toggle */}
          <IconButton
            onClick={onToggleDarkMode}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
            size="small"
          >
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* Active cloud provider chips — click to change */}
          <Box
            onClick={onChangeProviders}
            sx={{ display: 'flex', gap: 0.75, cursor: 'pointer', alignItems: 'center' }}
            title="Change cloud providers"
          >
            {selectedProviders.map(p => (
              <Chip
                key={p}
                label={p.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: PROVIDER_COLORS[p],
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  height: 22,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </Box>

          {/* Settings — opens cloud provider modal */}
          <IconButton
            onClick={onChangeProviders}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
            size="small"
            title="Cloud provider settings"
          >
            <SettingsIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 0.5 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#4A90E2' }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {currentUser?.name ?? 'Azure User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>
                {selectedSubscriptionId ? selectedSubName : `${credentials.subscriptionIds?.length || 0} subscription(s)`}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onDisconnect} sx={{ color: 'white', ml: 1 }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>


      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 72px)',
        }}
      >

        {/* Breadcrumb Navigation */}
        {activePage !== 'dashboard' && (
          <Box 
            sx={{ 
              px: 3, 
              pt: 2, 
              pb: 1,
              bgcolor: 'background.default',
              borderBottom: '1px solid rgba(102,126,234,0.14)'
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
        <Box sx={{ p: 3 }}>
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
          {activePage === 'soc-incidents' && (
            <SocIncidentDashboard credentials={activeCredentials} />
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

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Avatar,
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
import { AzureCredentials, AzureResource, CostData, SecurityRecommendation } from '../types';
import ResourcesTab from './ResourcesTab';
import CostsTab from './CostsTab';
import RecommendationsTab from './RecommendationsTab';
import SettingsTab from './SettingsTab';
import AIInsightsTab from './AIInsightsTab';
import CloudAccountsTab from './CloudAccountsTab';
import SubscriptionDashboard from './SubscriptionDashboard';
import MonitoringTab from './MonitoringTab';

interface DashboardProps {
  credentials: AzureCredentials;
  onDisconnect: () => void;
}

const DRAWER_WIDTH = 240;

const Dashboard: React.FC<DashboardProps> = ({ credentials, onDisconnect }) => {
  const [activePage, setActivePage] = useState('dashboard');

  const handlePageChange = (page: string) => {
    setActivePage(page);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'resources', label: 'Resources', icon: <StorageIcon /> },
    { id: 'costs', label: 'Costs', icon: <AttachMoneyIcon /> },
    { id: 'monitoring', label: 'Monitoring', icon: <MonitorHeartIcon /> },
    { id: 'recommendations', label: 'Recommendations', icon: <SecurityIcon /> },
    { id: 'ai-insights', label: 'AI Insights', icon: <AutoAwesomeIcon /> },
    { id: 'cloud-accounts', label: 'Cloud Accounts', icon: <CloudIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: '#0066CC',
            color: 'white',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudIcon sx={{ fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Cost Finder
          </Typography>
        </Box>

        {/* Navigation Menu */}
        <List sx={{ px: 1, flexGrow: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={activePage === item.id}
                onClick={() => handlePageChange(item.id)}
                sx={{
                  borderRadius: 1,
                  color: 'rgba(255,255,255,0.8)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* User Profile at Bottom */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#4A90E2' }}>
              <PersonIcon fontSize="small" />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Azure User
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                {credentials.subscriptionIds?.length || 0} subscription(s)
              </Typography>
            </Box>
            <IconButton size="small" onClick={onDisconnect} sx={{ color: 'white' }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: 'white',
            borderBottom: '1px solid #e0e0e0',
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {menuItems.find(item => item.id === activePage)?.label || 'Dashboard'}
            </Typography>
            {credentials.subscriptionIds && activePage !== 'dashboard' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Viewing data from {credentials.subscriptionIds.length} subscription(s)
              </Typography>
            )}
          </Box>
        </Box>

        {/* Page Content */}
        <Box sx={{ p: 3 }}>
          {/* Each page component manages its own data, state and behavior independently */}
          {activePage === 'dashboard' && (
            <SubscriptionDashboard credentials={credentials} />
          )}
          {activePage === 'resources' && (
            <ResourcesTab credentials={credentials} />
          )}
          {activePage === 'costs' && (
            <CostsTab credentials={credentials} />
          )}
          {activePage === 'monitoring' && (
            <MonitoringTab credentials={credentials} />
          )}
          {activePage === 'recommendations' && (
            <RecommendationsTab recommendations={[]} />
          )}
          {activePage === 'ai-insights' && (
            <AIInsightsTab credentials={credentials} />
          )}
          {activePage === 'cloud-accounts' && (
            <CloudAccountsTab credentials={credentials} />
          )}
          {activePage === 'settings' && (
            <SettingsTab credentials={credentials} onDisconnect={onDisconnect} />
          )}
        </Box>
      </Box>
    </Box>
  );
};
export default Dashboard;

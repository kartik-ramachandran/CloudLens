import React, { useState } from 'react';
import {
  Box,
  Alert,
  Tabs,
  Tab,
  Button,
  Snackbar,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { AzureCredentials } from '../types';
import SecureScoresMicrofrontend from './SecureScoresMicrofrontend';
import AlertRulesMicrofrontend from './AlertRulesMicrofrontend';
import AKSServicesMicrofrontend from './AKSServicesMicrofrontend';
import AKSPodsMicrofrontend from './AKSPodsMicrofrontend';

interface MonitoringTabProps {
  credentials: AzureCredentials;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MonitoringTab: React.FC<MonitoringTabProps> = ({ credentials }) => {
  const [tabValue, setTabValue] = useState(0);
  const [ticketMessage, setTicketMessage] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleTicketCreated = (ticketKey: string, ticketUrl: string) => {
    setTicketMessage(`✓ JIRA ticket ${ticketKey} created successfully!`);
    setTicketUrl(ticketUrl);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="monitoring tabs" sx={{
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.875rem' },
          '& .Mui-selected': { color: '#667eea !important' },
          '& .MuiTabs-indicator': { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', height: 3, borderRadius: '3px 3px 0 0' },
        }}>
          <Tab label="Secure Scores" />
          <Tab label="Alert Rules" />
          <Tab label="AKS Services" />
          <Tab label="AKS Pods" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <SecureScoresMicrofrontend 
          credentials={credentials} 
          onTicketCreated={handleTicketCreated} 
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <AlertRulesMicrofrontend 
          credentials={credentials} 
          onTicketCreated={handleTicketCreated} 
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AKSServicesMicrofrontend credentials={credentials} />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <AKSPodsMicrofrontend credentials={credentials} />
      </TabPanel>

      {/* Snackbar for ticket creation notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={ticketMessage?.includes('✓') ? 'success' : 'error'}
          sx={{ width: '100%' }}
          action={
            ticketUrl && (
              <Button
                color="inherit"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(ticketUrl, '_blank')}
              >
                View Ticket
              </Button>
            )
          }
        >
          {ticketMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MonitoringTab;

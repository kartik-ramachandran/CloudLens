import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { AzureCredentials, AlertRule } from '../types';
import { getAlertRules, getJiraSettings, createJiraTicketFromAlert } from '../services/api';

interface AlertRulesMicrofrontendProps {
  credentials: AzureCredentials;
  onTicketCreated?: (ticketKey: string, ticketUrl: string) => void;
}

const AlertRulesMicrofrontend: React.FC<AlertRulesMicrofrontendProps> = ({ 
  credentials, 
  onTicketCreated 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [jiraEnabled, setJiraEnabled] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    checkJiraSettings();
  }, [credentials.sessionId, credentials.subscriptionIds]);

  const checkJiraSettings = async () => {
    try {
      const settings = await getJiraSettings();
      setJiraEnabled(settings.isEnabled);
    } catch (err) {
      console.error('Failed to check JIRA settings:', err);
    }
  };

  const fetchData = async () => {
    if (!credentials.sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const alertsData = await getAlertRules(credentials);
      setAlerts(alertsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch alert rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (alertId: string, alertName: string) => {
    setCreatingTicket(alertId);

    try {
      const response = await createJiraTicketFromAlert(alertId);
      if (response.success && onTicketCreated) {
        onTicketCreated(response.ticketKey || '', response.ticketUrl || '');
      }
    } catch (err: any) {
      console.error('Error creating ticket:', err);
    } finally {
      setCreatingTicket(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
      case 'warning':
        return 'warning';
      case 'low':
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Subscription</TableCell>
            <TableCell>Resource Group</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Condition</TableCell>
            {jiraEnabled && <TableCell align="center">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>{alert.name}</TableCell>
              <TableCell>
                <Tooltip title={alert.subscriptionId}>
                  <span>{alert.subscriptionName}</span>
                </Tooltip>
              </TableCell>
              <TableCell>{alert.resourceGroup}</TableCell>
              <TableCell>
                <Chip
                  label={alert.severity}
                  color={getSeverityColor(alert.severity) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={alert.isEnabled ? 'Enabled' : 'Disabled'}
                  color={alert.isEnabled ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>{alert.condition}</TableCell>
              {jiraEnabled && (
                <TableCell align="center">
                  <Tooltip title="Create JIRA ticket">
                    <IconButton
                      size="small"
                      onClick={() => handleCreateTicket(alert.id, alert.name)}
                      disabled={creatingTicket === alert.id}
                      color="primary"
                    >
                      <ConfirmationNumberIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
          {alerts.length === 0 && (
            <TableRow>
              <TableCell colSpan={jiraEnabled ? 7 : 6} align="center">
                <Typography variant="body2" color="text.secondary">
                  No alert rules found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AlertRulesMicrofrontend;

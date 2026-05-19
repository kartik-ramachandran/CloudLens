import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { AzureCredentials, SecureScore } from '../types';
import { getSecureScores, getJiraSettings, createJiraTicketFromSecureScore } from '../services/api';

interface SecureScoresMicrofrontendProps {
  credentials: AzureCredentials;
  onTicketCreated?: (ticketKey: string, ticketUrl: string) => void;
}

const SecureScoresMicrofrontend: React.FC<SecureScoresMicrofrontendProps> = ({ 
  credentials, 
  onTicketCreated 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secureScores, setSecureScores] = useState<SecureScore[]>([]);
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
      const scoresData = await getSecureScores(credentials);
      setSecureScores(scoresData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch secure scores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (subscriptionId: string, controlName: string, displayName: string) => {
    const ticketId = `${subscriptionId}-${controlName}`;
    setCreatingTicket(ticketId);

    try {
      const response = await createJiraTicketFromSecureScore(subscriptionId, controlName);
      if (response.success && onTicketCreated) {
        onTicketCreated(response.ticketKey || '', response.ticketUrl || '');
      }
    } catch (err: any) {
      console.error('Error creating ticket:', err);
    } finally {
      setCreatingTicket(null);
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
    <Grid container spacing={3}>
      {secureScores.map((score) => (
        <Grid item xs={12} md={6} key={score.subscriptionId}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {score.subscriptionName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={score.percentage}
                    sx={{ height: 10, borderRadius: 5 }}
                    color={score.percentage >= 80 ? 'success' : score.percentage >= 50 ? 'warning' : 'error'}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {score.percentage.toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Score
                  </Typography>
                  <Typography variant="h6">
                    {score.currentScore.toFixed(0)} / {score.maxScore.toFixed(0)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Healthy
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {score.healthyResourcesCount}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Unhealthy
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {score.unhealthyResourcesCount}
                  </Typography>
                </Grid>
              </Grid>
              {score.controls.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Top Controls
                  </Typography>
                  {score.controls.slice(0, 5).map((control, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ flex: 1 }}>{control.displayName}</Typography>
                        {jiraEnabled && control.unhealthyResourcesCount > 0 && (
                          <Tooltip title="Create JIRA ticket for this control">
                            <IconButton
                              size="small"
                              onClick={() => handleCreateTicket(score.subscriptionId, control.controlName, control.displayName)}
                              disabled={creatingTicket === `${score.subscriptionId}-${control.controlName}`}
                              sx={{ ml: 1 }}
                            >
                              <ConfirmationNumberIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={control.percentage}
                        sx={{ height: 6, borderRadius: 3 }}
                        color={control.percentage >= 80 ? 'success' : control.percentage >= 50 ? 'warning' : 'error'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {control.unhealthyResourcesCount} unhealthy resources
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default SecureScoresMicrofrontend;

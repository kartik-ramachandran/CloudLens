import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Divider,
  Paper,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { AzureCredentials, SubscriptionInfo } from '../types';

interface CloudAccountsTabProps {
  credentials: AzureCredentials;
}

const CloudAccountsTab: React.FC<CloudAccountsTabProps> = ({ credentials }) => {
  const subscriptions = credentials.subscriptions || [];
  
  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'enabled':
        return 'success';
      case 'disabled':
        return 'error';
      case 'warned':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state.toLowerCase()) {
      case 'enabled':
        return <CheckCircleIcon fontSize="small" />;
      case 'disabled':
        return <ErrorIcon fontSize="small" />;
      default:
        return <CloudIcon fontSize="small" />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Cloud Accounts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your connected Azure subscriptions
        </Typography>
      </Box>

      {/* Summary Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <CloudIcon sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Microsoft Azure
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Connected with {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CloudIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No subscriptions found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please reconnect to Azure to load your subscriptions
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {subscriptions.map((subscription: SubscriptionInfo, index: number) => (
            <Card
              key={subscription.subscriptionId}
              elevation={1}
              sx={{
                transition: 'all 0.2s',
                '&:hover': {
                  elevation: 3,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      {getStateIcon(subscription.state)}
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {subscription.displayName}
                      </Typography>
                      <Chip
                        label={subscription.state}
                        size="small"
                        color={getStateColor(subscription.state)}
                        sx={{ ml: 1 }}
                      />
                    </Stack>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Subscription ID
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            backgroundColor: 'action.hover',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                          }}
                        >
                          {subscription.subscriptionId}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Tenant ID
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            backgroundColor: 'action.hover',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                          }}
                        >
                          {subscription.tenantId}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default CloudAccountsTab;

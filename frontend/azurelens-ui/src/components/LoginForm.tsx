import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import { AzureCredentials } from '../types';
import { connectToAzure } from '../services/api';

interface LoginFormProps {
  onConnect: (credentials: AzureCredentials) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onConnect }) => {
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credentials: AzureCredentials = {
        tenantId,
        clientId,
        clientSecret,
      };

      const response = await connectToAzure(credentials);
      
      if (response.success) {
        credentials.subscriptions = response.subscriptions;
        credentials.subscriptionIds = response.subscriptions.map((s: any) => s.subscriptionId);
        credentials.sessionId = response.sessionId; // Store session ID
        onConnect(credentials);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to Azure. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box 
              component="img" 
              src="/logo.svg" 
              alt="AzureLens Logo"
              sx={{ 
                width: 80, 
                height: 80, 
                mb: 2,
                filter: 'drop-shadow(0px 4px 8px rgba(0, 120, 212, 0.2))'
              }} 
            />
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#0078D4' }}>
              AzureLens
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Advanced Azure Security, Compliance & Cost Management
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Tenant ID"
              variant="outlined"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
              sx={{ mb: 2 }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />

            <TextField
              fullWidth
              label="Client ID"
              variant="outlined"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              sx={{ mb: 2 }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />

            <TextField
              fullWidth
              label="Client Secret"
              variant="outlined"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
              sx={{ mb: 3 }}
              placeholder="Your client secret"
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CloudIcon />}
            >
              {loading ? 'Connecting...' : 'Connect to Azure'}
            </Button>
          </form>

          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Note: Your credentials are stored locally in your browser. You can update them anytime from Settings.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;

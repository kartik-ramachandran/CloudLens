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
            <CloudIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Cost Finder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect to Azure to monitor resources, costs, and security
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

          {/* Demo Credentials Section */}
          <Box 
            sx={{ 
              mt: 3, 
              p: 2, 
              bgcolor: '#f5f5f5', 
              borderRadius: 2,
              border: '1px solid #e0e0e0'
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#667eea' }}>
              📋 Demo Credentials
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Use these credentials to view the demo (India_test subscription)
            </Typography>
            
            <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1, mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: 'text.secondary' }}>
                Tenant ID:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' },
                  p: 0.5,
                  borderRadius: 0.5
                }}
                onClick={() => {
                  setTenantId('71a9d935-2760-4973-b514-a5c33566cc4b');
                  navigator.clipboard.writeText('71a9d935-2760-4973-b514-a5c33566cc4b');
                }}
                title="Click to copy and fill"
              >
                71a9d935-2760-4973-b514-a5c33566cc4b
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1, mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: 'text.secondary' }}>
                Client ID (InternalCostFinder):
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' },
                  p: 0.5,
                  borderRadius: 0.5
                }}
                onClick={() => {
                  setClientId('adbcf251-7c66-4a72-a319-84a5ed3a096e');
                  navigator.clipboard.writeText('adbcf251-7c66-4a72-a319-84a5ed3a096e');
                }}
                title="Click to copy and fill"
              >
                adbcf251-7c66-4a72-a319-84a5ed3a096e
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: 'text.secondary' }}>
                Client Secret:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' },
                  p: 0.5,
                  borderRadius: 0.5
                }}
                onClick={() => {
                  setClientSecret('YOUR-CLIENT-SECRET-HERE');
                  navigator.clipboard.writeText('YOUR-CLIENT-SECRET-HERE');
                }}
                title="Click to copy and fill"
              >
                YOUR-CLIENT-SECRET-HERE
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{ 
                mt: 2, 
                textTransform: 'none',
                borderColor: '#667eea',
                color: '#667eea',
                '&:hover': {
                  borderColor: '#764ba2',
                  bgcolor: 'rgba(102, 126, 234, 0.04)'
                }
              }}
              onClick={() => {
                setTenantId('YOUR-TENANT-ID-HERE');
                setClientId('YOUR-CLIENT-ID-HERE');
                setClientSecret('YOUR-CLIENT-SECRET-HERE');
              }}
            >
              Fill All Demo Credentials
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;

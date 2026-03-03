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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { AzureCredentials } from '../types';
import { connectToAzure } from '../services/api';

interface LoginFormProps {
  onConnect: (credentials: AzureCredentials) => void;
}

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: '#0078D4',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {number}
      </Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
    </Box>
    <Box sx={{ pl: 5 }}>{children}</Box>
  </Box>
);

const InstructionsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
    <DialogTitle sx={{ fontWeight: 700, color: '#0078D4', pb: 1 }}>
      How to set up Azure credentials
    </DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        AzureLens uses an Azure App Registration (service principal) with read-only access. Follow the steps below to create one.
      </Typography>

      <Step number={1} title="Open Azure Active Directory">
        <Typography variant="body2" color="text.secondary">
          In the <strong>Azure Portal</strong>, search for <strong>Microsoft Entra ID</strong> (formerly Azure Active Directory) and open it.
        </Typography>
      </Step>

      <Step number={2} title="Create an App Registration">
        <Typography variant="body2" color="text.secondary">
          Go to <strong>App registrations → New registration</strong>. Give it a name (e.g. <em>AzureLens</em>), leave the default settings, and click <strong>Register</strong>.
        </Typography>
      </Step>

      <Step number={3} title="Copy Tenant ID and Client ID">
        <Typography variant="body2" color="text.secondary">
          On the app's <strong>Overview</strong> page, copy:
        </Typography>
        <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
          <li><Typography variant="body2" color="text.secondary"><strong>Directory (tenant) ID</strong> → paste into Tenant ID</Typography></li>
          <li><Typography variant="body2" color="text.secondary"><strong>Application (client) ID</strong> → paste into Client ID</Typography></li>
        </Box>
      </Step>

      <Step number={4} title="Create a Client Secret">
        <Typography variant="body2" color="text.secondary">
          Go to <strong>Certificates & secrets → New client secret</strong>. Set an expiry, click <strong>Add</strong>, then immediately copy the secret <strong>Value</strong> (it is only shown once) → paste into Client Secret.
        </Typography>
      </Step>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Permissions to assign
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Assign the following roles on each subscription you want to monitor. Go to <strong>Subscriptions → Access control (IAM) → Add role assignment</strong>, search for the role, then select your app registration as the member.
      </Typography>

      {[
        { role: 'Reader', color: '#107C10', desc: 'Required — read all resource metadata.' },
        { role: 'Cost Management Reader', color: '#0078D4', desc: 'Required for cost and billing data in the FinOps dashboard.' },
        { role: 'Security Reader', color: '#E3008C', desc: 'Required for Defender for Cloud recommendations and alerts.' },
        { role: 'Billing Reader', color: '#8764B8', desc: 'Optional — needed if you also want billing account-level data.' },
      ].map(({ role, color, desc }) => (
        <Box key={role} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <Chip
            label={role}
            size="small"
            sx={{
              bgcolor: color,
              color: '#fff',
              fontWeight: 600,
              fontSize: 11,
              flexShrink: 0,
              mt: 0.25,
            }}
          />
          <Typography variant="body2" color="text.secondary">{desc}</Typography>
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" color="text.secondary">
        All roles are <strong>read-only</strong>. AzureLens never writes to or modifies your Azure environment.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">Got it</Button>
    </DialogActions>
  </Dialog>
);

const LoginForm: React.FC<LoginFormProps> = ({ onConnect }) => {
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);

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

          <Button
            fullWidth
            variant="text"
            size="small"
            startIcon={<HelpOutlineIcon />}
            onClick={() => setInstructionsOpen(true)}
            sx={{ mt: 1.5, color: 'text.secondary', textTransform: 'none' }}
          >
            How do I get these credentials?
          </Button>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Admin Setup:</strong> These credentials will be stored securely in the database and used by all users to access AzureLens. No per-user authentication required.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <InstructionsModal open={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
    </Box>
  );
};

export default LoginForm;

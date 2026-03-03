import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, Alert, CircularProgress,
  IconButton, Divider, InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { connectToAzure } from '../services/api';
import { AzureCredentials } from '../types';

interface AzureCredentialsModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save so the parent can reload credentials. */
  onSaved: () => void;
}

const AzureCredentialsModal: React.FC<AzureCredentialsModalProps> = ({ open, onClose, onSaved }) => {
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    if (!tenantId.trim() || !clientId.trim() || !clientSecret.trim()) {
      setMessage({ type: 'error', text: 'All three fields are required.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const creds: AzureCredentials = {
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        subscriptionIds: [],
      };

      const result = await connectToAzure(creds);

      if (result?.success) {
        const count = result.subscriptions?.length ?? 0;
        setMessage({ type: 'success', text: `Connected! Found ${count} subscription${count !== 1 ? 's' : ''}.` });
        setTimeout(() => {
          onSaved();
          onClose();
          setMessage(null);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result?.error ?? 'Failed to connect. Check your credentials.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.error ?? e.message ?? 'Unexpected error.' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setMessage(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CloudIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Azure Credentials</Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ mx: 3, mt: 1.5 }} />

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your Azure service principal credentials. AzureLens will connect and discover
          all accessible subscriptions automatically.
        </Typography>

        {message && (
          <Alert
            severity={message.type}
            icon={message.type === 'success' ? <CheckCircleIcon /> : undefined}
            sx={{ mb: 2.5 }}
          >
            {message.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Tenant ID"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            fullWidth
            disabled={saving}
            helperText="Your Azure Active Directory / Entra ID tenant ID"
          />
          <TextField
            label="Client ID"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            fullWidth
            disabled={saving}
            helperText="Application (client) ID of your service principal"
          />
          <TextField
            label="Client Secret"
            placeholder="Enter client secret value"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            fullWidth
            disabled={saving}
            type={showSecret ? 'text' : 'password'}
            helperText="Secret value (not the secret ID)"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowSecret(v => !v)} edge="end">
                    {showSecret ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Alert severity="info" sx={{ mt: 3, fontSize: '0.78rem' }}>
          The service principal needs <strong>Reader</strong> role on each subscription
          and <strong>Security Reader</strong> for security recommendations.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !tenantId || !clientId || !clientSecret}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CloudIcon />}
        >
          {saving ? 'Connecting…' : 'Save & Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AzureCredentialsModal;

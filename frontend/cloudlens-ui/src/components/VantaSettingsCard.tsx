import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Alert,
  Switch, FormControlLabel, Divider, Grid, Chip, CircularProgress,
  LinearProgress, Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LinkIcon from '@mui/icons-material/Link';
import { AzureCredentials, VantaSettings, VantaSyncStatus } from '../types';
import { getVantaSettings, saveVantaSettings, testVantaConnection, triggerVantaSync, getVantaSyncStatus } from '../services/api';

interface VantaSettingsCardProps {
  credentials?: AzureCredentials;
}

const VantaSettingsCard: React.FC<VantaSettingsCardProps> = ({ credentials }) => {
  const [settings, setSettings] = useState<VantaSettings>({
    apiToken: '',
    organizationId: '',
    isEnabled: false,
    autoSyncEnabled: false,
    syncIntervalMinutes: 360,
    syncResources: true,
    syncCompliance: true,
    syncFinOps: false
  });
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [syncStatus, setSyncStatus] = useState<VantaSyncStatus | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsData, statusData] = await Promise.allSettled([
        getVantaSettings(),
        getVantaSyncStatus()
      ]);
      if (settingsData.status === 'fulfilled') {
        const s = settingsData.value;
        setSettings(s);
        setIsConfigured(s.isConfigured ?? false);
      }
      if (statusData.status === 'fulfilled') {
        setSyncStatus(statusData.value);
      }
    } catch (e) {
      console.error('Error loading Vanta settings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const payload: VantaSettings = {
        ...settings,
        apiToken: apiTokenInput || settings.apiToken
      };
      const result = await saveVantaSettings(payload);
      setIsConfigured(result.isConfigured);
      setApiTokenInput('');
      setSaveMessage('Vanta settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (e: any) {
      setSaveMessage(`Error: ${e.message}`);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMessage('');
    setTestSuccess(null);
    try {
      const result = await testVantaConnection();
      setTestSuccess(result.success);
      setTestMessage(result.message);
    } catch (e: any) {
      setTestSuccess(false);
      setTestMessage(e.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (syncType: string = 'Full') => {
    if (!credentials) {
      setSyncMessage('No active Azure session. Please connect to Azure first.');
      return;
    }
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await triggerVantaSync(credentials, syncType);
      if (result.success) {
        setSyncMessage(
          `Sync completed! Resources: ${result.resourcesSynced}, Evidence: ${result.evidenceItemsSynced}, Tests: ${result.testResultsSynced}`
        );
        await load(); // Refresh sync status
      } else {
        setSyncMessage(`Sync failed: ${result.errorMessage}`);
      }
    } catch (e: any) {
      setSyncMessage(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleString() : 'Never';

  const statusColor = (status: string) =>
    status === 'Completed' ? '#107c10' : status === 'Failed' ? '#d13438' : '#0078d4';

  if (loading) return <LinearProgress />;

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LinkIcon sx={{ color: '#5865F2' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Vanta Integration
          </Typography>
          {isConfigured && <Chip label="Configured" color="success" size="small" />}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Automatically sync Azure resources, compliance evidence, and security findings to Vanta for SOC2 automation.
        </Typography>

        {/* Connection Settings */}
        <TextField
          fullWidth
          label="Vanta API Token"
          type="password"
          value={apiTokenInput}
          onChange={(e) => setApiTokenInput(e.target.value)}
          placeholder={isConfigured ? '••••••••' : 'Enter your Vanta API token'}
          helperText={isConfigured ? 'Token is configured. Enter a new token to update.' : 'Found in Vanta Settings → API Tokens'}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Organization ID"
          value={settings.organizationId}
          onChange={(e) => setSettings({ ...settings, organizationId: e.target.value })}
          placeholder="your-org-id"
          helperText="Found in Vanta Settings → Organization"
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Sync Options */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Sync Options</Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={settings.isEnabled} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })} />}
              label="Enable Vanta Integration"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={settings.autoSyncEnabled} onChange={(e) => setSettings({ ...settings, autoSyncEnabled: e.target.checked })} disabled={!settings.isEnabled} />}
              label="Auto-sync on schedule"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={<Switch checked={settings.syncResources} onChange={(e) => setSettings({ ...settings, syncResources: e.target.checked })} disabled={!settings.isEnabled} />}
              label="Sync Resources"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={<Switch checked={settings.syncCompliance} onChange={(e) => setSettings({ ...settings, syncCompliance: e.target.checked })} disabled={!settings.isEnabled} />}
              label="Sync Compliance Evidence"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={<Switch checked={settings.syncFinOps} onChange={(e) => setSettings({ ...settings, syncFinOps: e.target.checked })} disabled={!settings.isEnabled} />}
              label="Sync FinOps Data"
            />
          </Grid>
        </Grid>

        {settings.autoSyncEnabled && (
          <TextField
            label="Sync Interval (minutes)"
            type="number"
            value={settings.syncIntervalMinutes}
            onChange={(e) => setSettings({ ...settings, syncIntervalMinutes: Number(e.target.value) })}
            inputProps={{ min: 60, max: 1440, step: 60 }}
            helperText="Minimum 60 minutes. Default: 360 (6 hours)"
            size="small"
            sx={{ mb: 2 }}
          />
        )}

        {saveMessage && (
          <Alert severity={saveMessage.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>
            {saveMessage}
          </Alert>
        )}
        {testMessage && (
          <Alert severity={testSuccess ? 'success' : 'error'} sx={{ mb: 2 }}>
            {testMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
            disabled={!apiTokenInput && !isConfigured}>
            Save Settings
          </Button>
          <Button variant="outlined" onClick={handleTest} disabled={testing || !isConfigured}>
            {testing ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Test Connection
          </Button>
        </Box>

        {/* Sync Controls */}
        {isConfigured && credentials && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Manual Sync</Typography>

            {syncMessage && (
              <Alert severity={syncMessage.includes('failed') || syncMessage.includes('Failed') ? 'error' : 'success'} sx={{ mb: 2 }}>
                {syncMessage}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                onClick={() => handleSync('Full')}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Full Sync'}
              </Button>
              <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => handleSync('Resources')} disabled={syncing}>
                Sync Resources
              </Button>
              <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => handleSync('Evidence')} disabled={syncing}>
                Sync Evidence
              </Button>
              <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => handleSync('Tests')} disabled={syncing}>
                Sync Tests
              </Button>
            </Box>
          </>
        )}

        {/* Sync Status */}
        {syncStatus && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Sync Status</Typography>
            <Grid container spacing={1}>
              {[
                { label: 'Last Status', value: syncStatus.lastSyncStatus, isChip: true },
                { label: 'Resources Synced', value: `${syncStatus.resourcesSyncedLastRun}` },
                { label: 'Evidence Synced', value: `${syncStatus.evidenceItemsSyncedLastRun}` },
                { label: 'Tests Synced', value: `${syncStatus.testResultsSyncedLastRun}` },
                { label: 'Last Resource Sync', value: formatDate(syncStatus.lastResourceSync) },
                { label: 'Last Evidence Sync', value: formatDate(syncStatus.lastEvidenceSync) },
              ].map((item, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    {item.isChip ? (
                      <Chip label={item.value} size="small"
                        sx={{ bgcolor: statusColor(item.value), color: 'white' }} />
                    ) : (
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.value}</Typography>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
            {syncStatus.lastErrorMessage && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Last error: {syncStatus.lastErrorMessage}
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VantaSettingsCard;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloudIcon from '@mui/icons-material/Cloud';
import EditIcon from '@mui/icons-material/Edit';
import Chip from '@mui/material/Chip';
import { AzureCredentials } from '../types';
import api from '../services/api';
import JiraSettingsCard from './JiraSettingsCard';
import VantaSettingsCard from './VantaSettingsCard';
import { CloudProvider } from './CloudProviderSelectModal';

interface SettingsTabProps {
  credentials: AzureCredentials;
  onDisconnect: () => void;
  selectedProviders?: CloudProvider[];
  onChangeProviders?: () => void;
}

const PROVIDER_META: Record<CloudProvider, { label: string; color: string }> = {
  azure: { label: 'Microsoft Azure', color: '#0078D4' },
  aws:   { label: 'Amazon Web Services', color: '#FF9900' },
  gcp:   { label: 'Google Cloud Platform', color: '#4285F4' },
};

interface AISettings {
  provider: string;
  apiKey: string;
  model: string;
  endpoint?: string;
  maxTokens: number;
  temperature: number;
  isConfigured?: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ credentials, onDisconnect, selectedProviders = ['azure'], onChangeProviders }) => {
  const [tenantId, setTenantId] = useState(credentials.tenantId);
  const [clientId, setClientId] = useState(credentials.clientId);
  const [clientSecret, setClientSecret] = useState(credentials.clientSecret);
  const [saveMessage, setSaveMessage] = useState('');

  // AI Settings
  const [aiProvider, setAiProvider] = useState('OpenAI');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiEndpoint, setAiEndpoint] = useState('');
  const [aiMaxTokens, setAiMaxTokens] = useState(2000);
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiSaveMessage, setAiSaveMessage] = useState('');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');

  useEffect(() => {
    loadAISettings();
  }, []);

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all cached data? Fresh data will be fetched from Azure on the next request.')) {
      try {
        const response = await api.post('/azure/cache/clear');
        setCacheMessage(response.data.message || 'Cache cleared successfully!');
        setTimeout(() => setCacheMessage(''), 5000);
      } catch (error) {
        console.error('Error clearing cache:', error);
        setCacheMessage('Error clearing cache');
      }
    }
  };

  const loadAISettings = async () => {
    try {
      const response = await api.get('/azure/ai-settings');
      const settings: AISettings = response.data;
      setAiProvider(settings.provider);
      setAiModel(settings.model);
      setAiEndpoint(settings.endpoint || '');
      setAiMaxTokens(settings.maxTokens);
      setAiTemperature(settings.temperature);
      setAiConfigured(settings.isConfigured || false);
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaveMessage('');
      const updatedCredentials: AzureCredentials = {
        tenantId,
        clientId,
        clientSecret,
        subscriptionIds: credentials.subscriptionIds,
      };
      
      // Reconnect to Azure to generate a new session ID
      setSaveMessage('Reconnecting to Azure with new credentials...');
      const response = await api.post('/azure/connect', updatedCredentials);
      
      if (response.data.success) {
        // Update credentials with new session ID
        updatedCredentials.sessionId = response.data.sessionId;
        updatedCredentials.subscriptions = response.data.subscriptions;
        updatedCredentials.subscriptionIds = response.data.subscriptions.map((s: any) => s.subscriptionId);
        
        localStorage.setItem('azureCredentials', JSON.stringify(updatedCredentials));
        setSaveMessage('✓ Credentials updated and reconnected successfully! New session created.');
        
        // Auto-reload the page after 2 seconds to refresh all components
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error reconnecting:', error);
      setSaveMessage('⚠ Failed to reconnect. Please check your credentials and try again.');
      setTimeout(() => {
        setSaveMessage('');
      }, 5000);
    }
  };

  const handleClearCredentials = () => {
    if (window.confirm('Are you sure you want to clear all saved credentials? You will need to log in again.')) {
      onDisconnect();
    }
  };

  const handleSaveAISettings = async () => {
    try {
      const settings = {
        provider: aiProvider,
        apiKey: aiApiKey,
        model: aiModel,
        endpoint: aiEndpoint || null,
        maxTokens: aiMaxTokens,
        temperature: aiTemperature,
      };

      const response = await api.post('/azure/ai-settings', settings);
      const result = response.data;
      setAiConfigured(result.isConfigured);
      setAiSaveMessage('AI settings saved successfully!');
      setAiApiKey(''); // Clear the API key input for security
      setTimeout(() => setAiSaveMessage(''), 5000);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      setAiSaveMessage('Error saving AI settings');
    }
  };

  const getModelOptions = () => {
    switch (aiProvider) {
      case 'OpenAI':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      case 'AzureOpenAI':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-35-turbo'];
      case 'Anthropic':
        return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
      case 'Bedrock':
        return ['anthropic.claude-v2', 'anthropic.claude-instant-v1', 'amazon.titan-text-express-v1'];
      default:
        return ['gpt-4o'];
    }
  };

  return (
    <Box>

      {/* ── CLOUD PROVIDERS SECTION ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CloudIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Cloud Providers</Typography>
            </Box>
            {onChangeProviders && (
              <Button size="small" startIcon={<EditIcon />} onClick={onChangeProviders} variant="outlined">
                Change Providers
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You are connected to the following cloud providers. Click "Change Providers" to add or remove providers.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {selectedProviders.map(id => {
              const meta = PROVIDER_META[id];
              return (
                <Chip
                  key={id}
                  label={meta.label}
                  icon={<CloudIcon />}
                  sx={{ bgcolor: meta.color, color: 'white', fontWeight: 700, '& .MuiChip-icon': { color: 'white' } }}
                />
              );
            })}
          </Box>

          {/* ── Per-provider credential sections ── */}
          {selectedProviders.includes('aws') && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#FF9900' }}>
                AWS Credentials
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                IAM Access Key credentials used for fetching costs via AWS Cost Explorer. Requires <code>ce:GetCostAndUsage</code> permission.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField size="small" label="Access Key ID" placeholder="AKIAIOSFODNN7EXAMPLE"
                  sx={{ flex: '1 1 200px' }}
                  helperText="Stored in session only — not persisted to the database"
                />
                <TextField size="small" label="Secret Access Key" type="password" placeholder="••••••••••••••••"
                  sx={{ flex: '1 1 200px' }}
                />
                <TextField size="small" label="Region" placeholder="us-east-1" sx={{ flex: '0 0 140px' }} />
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                Enter credentials in the Costs → AWS tab to fetch and view cost data.
              </Typography>
            </Box>
          )}

          {selectedProviders.includes('gcp') && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#4285F4' }}>
                GCP Credentials
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Service Account JSON key used to authenticate with GCP Cloud Billing. The account needs <code>roles/billing.viewer</code>.
              </Typography>
              <TextField
                fullWidth multiline rows={4} size="small"
                label="Service Account JSON Key"
                placeholder={'{\n  "type": "service_account",\n  "project_id": "my-project",\n  ...\n}'}
                inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                helperText="Paste the full contents of your downloaded service account key file. Stored in session only."
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Azure Credentials
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Update your Azure service principal credentials anytime. We'll automatically reconnect with a fresh session!
          </Typography>

          {saveMessage && (
            <Alert 
              severity={saveMessage.includes('Failed') || saveMessage.includes('⚠') ? 'error' : saveMessage.includes('Reconnecting') ? 'info' : 'success'} 
              sx={{ mb: 3 }}
            >
              {saveMessage}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Tenant ID"
            variant="outlined"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Client ID"
            variant="outlined"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Client Secret"
            variant="outlined"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveMessage.includes('Reconnecting')}
            >
              {saveMessage.includes('Reconnecting') ? 'Reconnecting...' : 'Save & Reconnect'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleClearCredentials}
            >
              Clear & Disconnect
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Current Connection Info
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Subscriptions:</strong> {credentials.subscriptionIds?.length || 0}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Tenant ID:</strong> {credentials.tenantId}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              <strong>Client ID:</strong> {credentials.clientId}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            <SmartToyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            AI Settings
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure AI provider for generating recommendations and insights.
          </Typography>

          {aiConfigured && (
            <Alert severity="success" sx={{ mb: 2 }}>
              AI is configured and ready to use!
            </Alert>
          )}

          {aiSaveMessage && (
            <Alert severity={aiSaveMessage.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>
              {aiSaveMessage}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>AI Provider</InputLabel>
            <Select
              value={aiProvider}
              label="AI Provider"
              onChange={(e) => {
                setAiProvider(e.target.value);
                setAiModel(getModelOptions()[0]);
              }}
            >
              <MenuItem value="OpenAI">OpenAI</MenuItem>
              <MenuItem value="AzureOpenAI">Azure OpenAI</MenuItem>
              <MenuItem value="Anthropic">Anthropic (Claude)</MenuItem>
              <MenuItem value="Bedrock">AWS Bedrock</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{aiProvider === 'AzureOpenAI' ? 'Deployment Name' : 'Model'}</InputLabel>
            <Select
              value={aiModel}
              label={aiProvider === 'AzureOpenAI' ? 'Deployment Name' : 'Model'}
              onChange={(e) => setAiModel(e.target.value)}
            >
              {getModelOptions().map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="API Key"
            variant="outlined"
            type="password"
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            placeholder={aiConfigured ? '••••••••' : 'Enter your API key'}
            helperText={aiConfigured ? 'API key is configured. Enter a new key to update.' : 'Required'}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label={aiProvider === 'AzureOpenAI' ? 'Azure OpenAI Endpoint (Required)' : 'Custom Endpoint (Optional)'}
            variant="outlined"
            value={aiEndpoint}
            onChange={(e) => setAiEndpoint(e.target.value)}
            placeholder={
              aiProvider === 'AzureOpenAI'
                ? 'https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT/chat/completions?api-version=2024-10-21'
                : aiProvider === 'OpenAI'
                ? 'https://api.openai.com/v1/chat/completions'
                : 'Leave empty for default'
            }
            helperText={
              aiProvider === 'AzureOpenAI'
                ? 'Full Azure OpenAI chat completions URL including deployment name and api-version'
                : 'Leave empty to use the default endpoint'
            }
            required={aiProvider === 'AzureOpenAI'}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Max Tokens"
              variant="outlined"
              type="number"
              value={aiMaxTokens}
              onChange={(e) => setAiMaxTokens(Number(e.target.value))}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Temperature"
              variant="outlined"
              type="number"
              inputProps={{ step: 0.1, min: 0, max: 2 }}
              value={aiTemperature}
              onChange={(e) => setAiTemperature(Number(e.target.value))}
              sx={{ flex: 1 }}
            />
          </Box>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveAISettings}
            disabled={!aiApiKey && !aiConfigured}
          >
            Save AI Settings
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Cache Management
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Clear all cached data from the database. This includes resources, costs, and AI recommendations. 
            Fresh data will be fetched from Azure on the next request.
          </Typography>
          
          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteIcon />}
            onClick={handleClearCache}
          >
            Clear All Cache
          </Button>

          {cacheMessage && (
            <Alert severity={cacheMessage.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {cacheMessage}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* JIRA Integration Settings */}
      <JiraSettingsCard />

      {/* Vanta Integration Settings */}
      <VantaSettingsCard credentials={credentials} />

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Data Storage
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Azure credentials are stored locally in your browser's localStorage. AI settings are stored in SQLite database on the server.
          </Typography>
          
          <Alert severity="info">
            <strong>Security Note:</strong> Azure credentials are stored in plain text in localStorage. 
            For production use, consider using more secure storage methods or session-based authentication.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsTab;

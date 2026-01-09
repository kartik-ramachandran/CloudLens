import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../services/api';

interface JiraSettingsProps {
  onSettingsSaved?: () => void;
}

interface JiraSettings {
  jiraUrl: string;
  username: string;
  apiToken: string;
  projectKey: string;
  defaultIssueType: string;
  isEnabled: boolean;
}

const JiraSettingsCard: React.FC<JiraSettingsProps> = ({ onSettingsSaved }) => {
  const [jiraUrl, setJiraUrl] = useState('');
  const [username, setUsername] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [defaultIssueType, setDefaultIssueType] = useState('Task');
  const [isEnabled, setIsEnabled] = useState(false);
  
  const [saveMessage, setSaveMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  useEffect(() => {
    loadJiraSettings();
  }, []);

  const loadJiraSettings = async () => {
    try {
      const response = await api.get('/azure/jira/settings');
      const settings: JiraSettings = response.data;
      setJiraUrl(settings.jiraUrl || '');
      setUsername(settings.username || '');
      setProjectKey(settings.projectKey || '');
      setDefaultIssueType(settings.defaultIssueType || 'Task');
      setIsEnabled(settings.isEnabled || false);
      // Don't load API token for security
    } catch (error) {
      console.error('Error loading JIRA settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaveMessage('');
      const settings: JiraSettings = {
        jiraUrl,
        username,
        apiToken,
        projectKey,
        defaultIssueType,
        isEnabled,
      };

      await api.post('/azure/jira/settings', settings);
      setSaveMessage('JIRA settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      if (onSettingsSaved) {
        onSettingsSaved();
      }
    } catch (error: any) {
      console.error('Error saving JIRA settings:', error);
      setSaveMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleTestConnection = async () => {
    if (!jiraUrl || !username || !apiToken) {
      setConnectionMessage('Please fill in all required fields first');
      return;
    }

    setTestingConnection(true);
    setConnectionMessage('');
    
    try {
      // First save settings
      await api.post('/azure/jira/settings', {
        jiraUrl,
        username,
        apiToken,
        projectKey,
        defaultIssueType,
        isEnabled: true,
      });

      // Then test connection
      const response = await api.post('/azure/jira/test-connection');
      if (response.data.success) {
        setConnectionMessage('✓ Connection successful!');
        setIsEnabled(true);
      } else {
        setConnectionMessage('✗ Connection failed. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Error testing JIRA connection:', error);
      setConnectionMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setTestingConnection(false);
      setTimeout(() => setConnectionMessage(''), 5000);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            JIRA Integration
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                color="primary"
              />
            }
            label={isEnabled ? 'Enabled' : 'Disabled'}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure JIRA integration to create tickets directly from alerts and monitoring issues.
        </Typography>

        {saveMessage && (
          <Alert severity={saveMessage.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>
            {saveMessage}
          </Alert>
        )}

        {connectionMessage && (
          <Alert 
            severity={connectionMessage.includes('✓') ? 'success' : 'error'} 
            sx={{ mb: 2 }}
          >
            {connectionMessage}
          </Alert>
        )}

        <TextField
          fullWidth
          label="JIRA URL"
          placeholder="https://your-company.atlassian.net"
          value={jiraUrl}
          onChange={(e) => setJiraUrl(e.target.value)}
          sx={{ mb: 2 }}
          helperText="Your JIRA Cloud instance URL"
        />

        <TextField
          fullWidth
          label="Username/Email"
          placeholder="your-email@company.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
          helperText="Your JIRA account email"
        />

        <TextField
          fullWidth
          type="password"
          label="API Token"
          placeholder="Enter your JIRA API token"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          sx={{ mb: 2 }}
          helperText="Generate an API token from your JIRA account settings"
        />

        <TextField
          fullWidth
          label="Project Key"
          placeholder="PROJ"
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
          sx={{ mb: 2 }}
          helperText="The key of the JIRA project where tickets will be created"
        />

        <TextField
          fullWidth
          label="Default Issue Type"
          value={defaultIssueType}
          onChange={(e) => setDefaultIssueType(e.target.value)}
          sx={{ mb: 3 }}
          helperText="Default issue type (Task, Bug, Story, etc.)"
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!jiraUrl || !username || !projectKey}
          >
            Save Settings
          </Button>
          
          <Button
            variant="outlined"
            startIcon={testingConnection ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            onClick={handleTestConnection}
            disabled={testingConnection || !jiraUrl || !username || !apiToken}
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>How to get an API token:</strong> Go to your JIRA account settings → Security → API tokens → Create API token
        </Alert>
      </CardContent>
    </Card>
  );
};

export default JiraSettingsCard;

import React, { useState } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import { AzureCredentials } from './types';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0066CC',
    },
    secondary: {
      main: '#4A90E2',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

function App() {
  const [credentials, setCredentials] = useState<AzureCredentials | null>(() => {
    // Try to load session from localStorage
    const savedSession = localStorage.getItem('azureSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        // Return a credentials object with only sessionId, subscriptionIds, and subscriptions
        return {
          sessionId: session.sessionId,
          subscriptionIds: session.subscriptionIds,
          subscriptions: session.subscriptions,
          tenantId: '', // Not needed for subsequent requests
          clientId: '',
          clientSecret: ''
        };
      } catch (e) {
        console.error('Failed to parse saved session');
        localStorage.removeItem('azureSession');
        return null;
      }
    }
    return null;
  });
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('azureSession') !== null;
  });

  const handleConnect = (creds: AzureCredentials) => {
    setCredentials(creds);
    setIsConnected(true);
    // Store ONLY sessionId, subscriptionIds, and subscription info
    localStorage.setItem('azureSession', JSON.stringify({
      sessionId: creds.sessionId,
      subscriptionIds: creds.subscriptionIds,
      subscriptions: creds.subscriptions
    }));
  };

  const handleDisconnect = () => {
    setCredentials(null);
    setIsConnected(false);
    localStorage.removeItem('azureSession');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!isConnected ? (
        <LoginForm onConnect={handleConnect} />
      ) : (
        <Dashboard credentials={credentials!} onDisconnect={handleDisconnect} />
      )}
    </ThemeProvider>
  );
}

export default App;

import React, { useState, useMemo } from 'react';
import { CssBaseline, ThemeProvider, createTheme, PaletteMode } from '@mui/material';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import { AzureCredentials } from './types';

const getTheme = (mode: PaletteMode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#667eea' : '#0066CC',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: mode === 'light' ? '#f4f6fb' : '#0a0e27',
      paper:   mode === 'light' ? '#ffffff'  : '#141830',
    },
    text: {
      primary:   mode === 'light' ? '#1e2a3a' : '#e0e6ed',
      secondary: mode === 'light' ? '#6b7280' : '#a0a8b5',
    },
    divider: mode === 'light' ? 'rgba(102,126,234,0.14)' : 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light'
            ? '0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(102,126,234,0.08)'
            : '0 2px 12px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: mode === 'light' ? 'rgba(102,126,234,0.12)' : 'rgba(255,255,255,0.06)' },
      },
    },
  },
});

function App() {
  const [darkMode, setDarkMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('darkMode');
    return (saved === 'dark' ? 'dark' : 'light') as PaletteMode;
  });

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

  const theme = useMemo(() => getTheme(darkMode), [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('darkMode', newMode);
      return newMode;
    });
  };

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
        <Dashboard 
          credentials={credentials!} 
          onDisconnect={handleDisconnect}
          darkMode={darkMode === 'dark'}
          onToggleDarkMode={toggleDarkMode}
        />
      )}
    </ThemeProvider>
  );
}

export default App;

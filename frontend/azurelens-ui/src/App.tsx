import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CssBaseline, ThemeProvider, createTheme, PaletteMode, Box, CircularProgress, Typography } from '@mui/material';
import Dashboard from './components/Dashboard';
import SsoLoginPage from './components/SsoLoginPage';
import OAuthCallback from './components/OAuthCallback';
import { AzureCredentials } from './types';
import { checkGlobalCredentials } from './services/api';
import { isAuthenticated, clearAuth, getStoredUser } from './utils/oauth';

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
  shape: { borderRadius: 10 },
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
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 } },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: mode === 'light' ? 'rgba(102,126,234,0.12)' : 'rgba(255,255,255,0.06)' },
      },
    },
  },
});

// ── View states ───────────────────────────────────────────────────────────────
type View = 'loading' | 'sso-login' | 'oauth-callback' | 'dashboard';

function isOAuthCallbackUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('code') && params.has('state');
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [darkMode, setDarkMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('darkMode');
    return (saved === 'dark' ? 'dark' : 'light') as PaletteMode;
  });

  const [view, setView] = useState<View>('loading');
  const [credentials, setCredentials] = useState<AzureCredentials | null>(null);

  const theme = useMemo(() => getTheme(darkMode), [darkMode]);

  // Detect OAuth callback before anything else
  useEffect(() => {
    if (isOAuthCallbackUrl()) {
      setView('oauth-callback');
      return;
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrap = useCallback(async () => {
    // 1. User must have a valid JWT
    if (!isAuthenticated()) {
      setView('sso-login');
      return;
    }

    // 2. Load global Azure credentials
    try {
      const result = await checkGlobalCredentials();
      if (result.exists && result.subscriptions) {
        const creds: AzureCredentials = {
          sessionId: 'global-' + Date.now(),
          subscriptionIds: result.subscriptions.map((s: any) => s.subscriptionId),
          subscriptions: result.subscriptions,
          tenantId: '',
          clientId: '',
          clientSecret: '',
        };
        setCredentials(creds);
        setView('dashboard');
      } else {
        // Authenticated but no Azure credentials — admin needs to configure them
        setCredentials({
          sessionId: 'global-pending',
          subscriptionIds: [],
          subscriptions: [],
          tenantId: '',
          clientId: '',
          clientSecret: '',
        });
        setView('dashboard');
      }
    } catch {
      setView('dashboard');
    }
  }, []);

  // After OAuth callback completes successfully, re-run bootstrap
  const handleAuthSuccess = useCallback(() => {
    setView('loading');
    bootstrap();
  }, [bootstrap]);

  const handleAuthError = useCallback(() => {
    clearAuth();
    setView('sso-login');
  }, []);

  const handleDisconnect = useCallback(() => {
    clearAuth();
    setCredentials(null);
    setView('sso-login');
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('darkMode', next);
      return next as PaletteMode;
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {view === 'loading' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">Loading AzureLens…</Typography>
        </Box>
      )}

      {view === 'sso-login' && <SsoLoginPage />}

      {view === 'oauth-callback' && (
        <OAuthCallback onSuccess={handleAuthSuccess} onError={handleAuthError} />
      )}

      {view === 'dashboard' && (
        <Dashboard
          credentials={credentials!}
          onDisconnect={handleDisconnect}
          darkMode={darkMode === 'dark'}
          onToggleDarkMode={toggleDarkMode}
          currentUser={getStoredUser()}
        />
      )}
    </ThemeProvider>
  );
}

export default App;

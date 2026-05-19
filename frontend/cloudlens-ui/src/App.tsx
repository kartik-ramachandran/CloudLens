import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CssBaseline, ThemeProvider, createTheme, Box, CircularProgress, Typography } from '@mui/material';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import OAuthCallback from './components/OAuthCallback';
import CloudProviderSelectModal, { CloudProvider, CloudCredentials } from './components/CloudProviderSelectModal';
import TermsOfServicePage from './components/TermsOfServicePage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import LandingPage from './components/LandingPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import { AzureCredentials } from './types';
import { checkGlobalCredentials } from './services/api';
import { isAuthenticated, clearAuth, getStoredUser, storeAuth } from './utils/oauth';

function loadStoredCredentials(): CloudCredentials | null {
  try {
    const raw = localStorage.getItem('cloudCredentials');
    if (raw) return JSON.parse(raw) as CloudCredentials;
  } catch {}
  return null;
}

function loadStoredProviders(): CloudProvider[] | null {
  try {
    const raw = localStorage.getItem('cloudProviders');
    if (raw) return JSON.parse(raw) as CloudProvider[];
  } catch {}
  return null;
}

const getTheme = (mode: 'light' | 'dark' = 'light') => createTheme({
    palette: {
      mode,
    primary: {
      main: mode === 'dark' ? '#60a5fa' : '#1455d9',
      light: '#38bdf8',
      dark: '#0f2f7a',
    },
    secondary: {
      main: '#14b8a6',
      light: '#5eead4',
      dark: '#0f766e',
    },
    success: {
      main: '#16a34a',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: mode === 'light' ? '#eef3f8' : '#07111f',
      paper:   mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(13,23,38,0.86)',
    },
    text: {
      primary:   mode === 'light' ? '#0f172a' : '#e5eefb',
      secondary: mode === 'light' ? '#587086' : '#9fb0c4',
    },
    divider: mode === 'light' ? 'rgba(15,23,42,0.10)' : 'rgba(226,232,240,0.10)',
  },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 750 },
    button: { letterSpacing: 0 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            mode === 'light'
              ? 'linear-gradient(180deg, #f8fbff 0%, #eef3f8 45%, #e7eef7 100%)'
              : 'linear-gradient(180deg, #07111f 0%, #0b1526 55%, #08101d 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: mode === 'light'
            ? '1px solid rgba(15,23,42,0.08)'
            : '1px solid rgba(226,232,240,0.10)',
          backgroundImage: mode === 'light'
            ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,251,255,0.92))'
            : 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.78))',
          backdropFilter: 'blur(18px)',
          boxShadow: mode === 'light'
            ? '0 18px 55px rgba(31,51,86,0.10)'
            : '0 24px 70px rgba(0,0,0,0.38)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderColor: mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(226,232,240,0.10)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 750,
          boxShadow: 'none',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1455d9 0%, #0ea5e9 55%, #14b8a6 100%)',
          '&:hover': {
            boxShadow: '0 16px 36px rgba(20,85,217,0.28)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(15,23,42,0.58)',
        },
        notchedOutline: {
          borderColor: mode === 'light' ? 'rgba(15,23,42,0.14)' : 'rgba(226,232,240,0.14)',
        },
      },
    },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(226,232,240,0.08)',
        },
        head: {
          color: mode === 'light' ? '#334155' : '#cbd5e1',
          backgroundColor: mode === 'light' ? 'rgba(226,232,240,0.70)' : 'rgba(30,41,59,0.72)',
          fontWeight: 800,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: mode === 'light' ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(226,232,240,0.10)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
          background: 'linear-gradient(90deg, #1455d9, #14b8a6)',
        },
      },
    },
    },
  });

// ── View states ───────────────────────────────────────────────────────────────
type View = 'loading' | 'landing' | 'sso-login' | 'forgot-password' | 'oauth-callback' | 'cloud-select' | 'dashboard' | 'terms' | 'privacy';

function isOAuthCallbackUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('code') && params.has('state');
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState<View>('loading');
  const [prevView, setPrevView] = useState<View>('landing');
  const [loginInitialTab, setLoginInitialTab] = useState<'signin' | 'signup'>('signin');
  const [credentials, setCredentials] = useState<AzureCredentials | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<CloudProvider[]>(loadStoredProviders() ?? []);
  const [cloudCredentials, setCloudCredentials] = useState<CloudCredentials>(loadStoredCredentials() ?? {});
  const [providerModalOpen, setProviderModalOpen] = useState(false);

  const theme = useMemo(() => getTheme(), []);

  // Detect special entry points before anything else
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
      setView('landing');
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
        setCredentials(creds);
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
      }
    } catch {
      // ignore
    }

    // Show provider selection modal if no stored choice yet
    const stored = loadStoredProviders();
    if (!stored || stored.length === 0) {
      setView('cloud-select');
    } else {
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
    setView('landing');
  }, []);

  const handleDisconnect = useCallback(() => {
    clearAuth();
    setCredentials(null);
    setView('landing');
  }, []);

  const handleProviderConfirm = useCallback((providers: CloudProvider[], creds: CloudCredentials) => {
    localStorage.setItem('cloudProviders', JSON.stringify(providers));
    localStorage.setItem('cloudCredentials', JSON.stringify(creds));
    setSelectedProviders(providers);
    setCloudCredentials(creds);
    setProviderModalOpen(false);
    setView('dashboard');
  }, []);

  const handleOpenProviderModal = useCallback(() => {
    setProviderModalOpen(true);
  }, []);

  const handleCloseProviderModal = useCallback(() => {
    setProviderModalOpen(false);
  }, []);

  const handleCloseInitialProviderModal = useCallback(() => {
    setView('dashboard');
  }, []);

  const handleGoToSignIn = useCallback(() => {
    setLoginInitialTab('signin');
    setView('sso-login');
  }, []);

  const handleForgotPassword = useCallback(() => {
    setView('forgot-password');
  }, []);

  const handleGetStarted = useCallback(() => {
    setLoginInitialTab('signup');
    setView('sso-login');
  }, []);

  const handleOpenTerms = useCallback(() => {
    setPrevView(view);
    setView('terms');
  }, [view]);

  const handleOpenPrivacy = useCallback(() => {
    setPrevView(view);
    setView('privacy');
  }, [view]);

  const handleBackFromLegal = useCallback(() => {
    setView(prevView);
  }, [prevView]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {view === 'loading' && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: 2,
          background: 'linear-gradient(115deg, rgba(20,85,217,0.14), rgba(20,184,166,0.10) 48%, rgba(249,115,22,0.10)), #eef3f8',
        }}>
          <Box sx={{
            p: 4,
            minWidth: 300,
            textAlign: 'center',
            borderRadius: 5,
            bgcolor: 'rgba(255,255,255,0.80)',
            border: '1px solid rgba(255,255,255,0.70)',
            backdropFilter: 'blur(22px)',
            boxShadow: '0 34px 90px rgba(15,23,42,0.18)',
          }}>
            <CircularProgress size={56} thickness={4} />
            <Typography variant="h6" color="text.primary" sx={{ mt: 2, fontWeight: 800 }}>
              Loading CloudLens…
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Preparing your cloud command center
            </Typography>
          </Box>
        </Box>
      )}

      {view === 'landing' && (
        <LandingPage
          onSignIn={handleGoToSignIn}
          onGetStarted={handleGetStarted}
          onOpenTerms={handleOpenTerms}
          onOpenPrivacy={handleOpenPrivacy}
        />
      )}

      {view === 'sso-login' && (
        <LoginPage
          initialTab={loginInitialTab}
          onOpenTerms={handleOpenTerms}
          onOpenPrivacy={handleOpenPrivacy}
          onForgotPassword={handleForgotPassword}
        />
      )}

      {view === 'forgot-password' && (
        <ForgotPasswordPage onBack={handleGoToSignIn} />
      )}

      {view === 'terms' && <TermsOfServicePage onBack={handleBackFromLegal} />}
      {view === 'privacy' && <PrivacyPolicyPage onBack={handleBackFromLegal} />}

      {view === 'oauth-callback' && (
        <OAuthCallback onSuccess={handleAuthSuccess} onError={handleAuthError} />
      )}

      {/* Cloud provider selection — shown after first login or when user reopens it */}
      {view === 'cloud-select' && (
        <CloudProviderSelectModal
          open={true}
          initialProviders={selectedProviders.length > 0 ? selectedProviders : undefined}
          initialCredentials={cloudCredentials}
          onConfirm={handleProviderConfirm}
          onClose={handleCloseInitialProviderModal}
        />
      )}

      {view === 'dashboard' && (
        <>
          <Dashboard
            credentials={credentials!}
            onDisconnect={handleDisconnect}
            currentUser={getStoredUser()}
            selectedProviders={selectedProviders}
            onChangeProviders={handleOpenProviderModal}
            cloudCredentials={cloudCredentials}
          />
          {/* Provider re-select modal (from navbar/settings) */}
          <CloudProviderSelectModal
            open={providerModalOpen}
            initialProviders={selectedProviders}
            initialCredentials={cloudCredentials}
            onConfirm={handleProviderConfirm}
            onClose={handleCloseProviderModal}
          />
        </>
      )}
    </ThemeProvider>
  );
}

export default App;

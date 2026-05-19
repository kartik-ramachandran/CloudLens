import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Alert, Divider, Avatar, IconButton, Tooltip,
  Paper, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import { SsoProvider } from '../types';
import { getAuthProviders } from '../services/api';
import { buildAuthorizationUrl, getDefaultRedirectUri } from '../utils/oauth';

// ── Per-provider branding ────────────────────────────────────────────────────

interface ProviderMeta {
  label: string;
  color: string;
  hoverColor: string;
  textColor: string;
  logo: React.ReactNode;
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  Microsoft: {
    label: 'Continue with Microsoft',
    color: '#ffffff',
    hoverColor: '#f3f3f3',
    textColor: '#1a1a1a',
    logo: (
      <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
        <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
      </svg>
    ),
  },
  Google: {
    label: 'Continue with Google',
    color: '#ffffff',
    hoverColor: '#f7f7f7',
    textColor: '#1a1a1a',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  Okta: {
    label: 'Continue with Okta',
    color: '#007DC1',
    hoverColor: '#006aad',
    textColor: '#ffffff',
    logo: (
      <svg width="20" height="20" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#007DC1"/>
        <circle cx="64" cy="64" r="32" fill="#ffffff"/>
      </svg>
    ),
  },
  Ping: {
    label: 'Continue with Ping Identity',
    color: '#C8102E',
    hoverColor: '#b00e28',
    textColor: '#ffffff',
    logo: (
      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#ffffff" opacity="0.9"/>
        <circle cx="12" cy="12" r="5" fill="#C8102E"/>
      </svg>
    ),
  },
};

// Order to display providers (even if some are unconfigured)
const DISPLAY_ORDER = ['Microsoft', 'Google', 'Okta', 'Ping'];

// ── SSO config snippets ───────────────────────────────────────────────────────

interface ProviderInstructions {
  name: string;
  steps: string[];
  payload: string;
}

const SSO_INSTRUCTIONS: ProviderInstructions[] = [
  {
    name: 'Microsoft Entra ID (Azure AD)',
    steps: [
      'Go to Azure Portal → Microsoft Entra ID → App registrations → New registration',
      'Set Redirect URI to: <your-origin>/auth/callback',
      'Under Certificates & secrets, create a new client secret',
      'Note the Application (client) ID, tenant ID, and client secret',
    ],
    payload: JSON.stringify({
      provider: 'Microsoft',
      clientId: '<Application (client) ID>',
      clientSecret: '<Client secret value>',
      authority: 'https://login.microsoftonline.com/<tenant-id>/v2.0',
      redirectUri: '<your-origin>/auth/callback',
      scopes: 'openid,profile,email',
      isEnabled: true,
    }, null, 2),
  },
  {
    name: 'Google Workspace',
    steps: [
      'Go to Google Cloud Console → APIs & Services → Credentials',
      'Create OAuth 2.0 Client ID (Web application type)',
      'Add Authorized redirect URI: <your-origin>/auth/callback',
      'Note the Client ID and Client Secret',
    ],
    payload: JSON.stringify({
      provider: 'Google',
      clientId: '<Google Client ID>',
      clientSecret: '<Google Client Secret>',
      authority: 'https://accounts.google.com',
      redirectUri: '<your-origin>/auth/callback',
      scopes: 'openid,profile,email',
      isEnabled: true,
    }, null, 2),
  },
  {
    name: 'Okta',
    steps: [
      'In your Okta Admin Console go to Applications → Create App Integration',
      'Choose OIDC – OpenID Connect and Web Application',
      'Add Sign-in redirect URI: <your-origin>/auth/callback',
      'Note the Client ID, Client Secret, and your Okta domain',
    ],
    payload: JSON.stringify({
      provider: 'Okta',
      clientId: '<Okta Client ID>',
      clientSecret: '<Okta Client Secret>',
      authority: 'https://<your-okta-domain>',
      redirectUri: '<your-origin>/auth/callback',
      scopes: 'openid,profile,email',
      isEnabled: true,
    }, null, 2),
  },
  {
    name: 'Ping Identity',
    steps: [
      'In PingOne or PingFederate, create a new OIDC application',
      'Set the Redirect URI to: <your-origin>/auth/callback',
      'Note the Client ID, Client Secret, and issuer URL',
    ],
    payload: JSON.stringify({
      provider: 'Ping',
      clientId: '<Ping Client ID>',
      clientSecret: '<Ping Client Secret>',
      authority: 'https://<your-ping-domain>',
      redirectUri: '<your-origin>/auth/callback',
      scopes: 'openid,profile,email',
      isEnabled: true,
    }, null, 2),
  },
];

// ── Small helper: copy-to-clipboard snippet ───────────────────────────────────

const CodeSnippet: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        p: 1.5,
        mt: 1,
        bgcolor: 'action.hover',
        borderRadius: 1.5,
        fontFamily: 'monospace',
        fontSize: '0.72rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        lineHeight: 1.6,
        maxHeight: 220,
        overflow: 'auto',
      }}
    >
      <Tooltip title={copied ? 'Copied!' : 'Copy'} placement="top">
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{ position: 'absolute', top: 6, right: 6, opacity: 0.7 }}
        >
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      {code}
    </Paper>
  );
};

// ── Component ────────────────────────────────────────────────────────────────

const SsoLoginPage: React.FC = () => {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [initiating, setInitiating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    getAuthProviders()
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false));
  }, []);

  const configuredSet = new Set(providers.map(p => p.provider));

  const handleSignIn = async (provider: SsoProvider) => {
    setError('');
    setInitiating(provider.provider);
    try {
      const redirectUri = getDefaultRedirectUri();
      const url = await buildAuthorizationUrl(
        provider.provider,
        provider.clientId,
        provider.authority ?? '',
        provider.scopes,
        redirectUri,
      );
      window.location.href = url;
    } catch (e: any) {
      setError(e.message || 'Failed to initiate sign-in');
      setInitiating(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          linear-gradient(115deg, rgba(20,85,217,0.14), rgba(20,184,166,0.10) 48%, rgba(249,115,22,0.10)),
          #eef3f8
        `,
        p: 2,
      }}
    >
      {/* ── Main login card ── */}
      <Card sx={{
        width: '100%',
        maxWidth: 440,
        borderRadius: 5,
        border: '1px solid rgba(255,255,255,0.70)',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(22px)',
        boxShadow: '0 34px 90px rgba(15,23,42,0.20)',
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>

          {/* Logo + brand */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 1.5, boxShadow: '0 18px 34px rgba(20,85,217,0.28)' }}>
              <LockOutlinedIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Typography variant="h5" fontWeight={700} letterSpacing={-0.3}>
              CloudLens
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sign in to access your Azure insights
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loadingProviders ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* SSO provider buttons */}
              {providers.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  {DISPLAY_ORDER.map(name => {
                    const configured = configuredSet.has(name);
                    const meta = PROVIDER_META[name];
                    const provider = providers.find(p => p.provider === name);
                    if (!meta || !configured) return null;

                    return (
                      <Button
                        key={name}
                        fullWidth
                        variant="outlined"
                        disabled={initiating === name}
                        onClick={() => provider && handleSignIn(provider)}
                        startIcon={
                          initiating === name
                            ? <CircularProgress size={18} />
                            : <Box sx={{ display: 'flex', alignItems: 'center' }}>{meta.logo}</Box>
                        }
                        sx={{
                          py: 1.4,
                          justifyContent: 'flex-start',
                          pl: 2.5,
                          gap: 1.5,
                          bgcolor: meta.color,
                          color: meta.textColor,
                          borderColor: 'transparent',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                          '&:hover': { bgcolor: meta.hoverColor, borderColor: 'transparent', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' },
                        }}
                      >
                        <Box sx={{ flex: 1, textAlign: 'left' }}>
                          {initiating === name ? 'Redirecting...' : meta.label}
                        </Box>
                      </Button>
                    );
                  })}
                </Box>
              )}

              {providers.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                  No SSO providers configured yet.
                </Typography>
              )}
            </>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Footer row: policy text + configure SSO link */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.6 }}>
              Access is controlled by your SSO provider.
            </Typography>
            <Button
              size="small"
              variant="text"
              startIcon={<HelpOutlineIcon fontSize="small" />}
              onClick={() => setInstructionsOpen(true)}
              sx={{ fontSize: '0.72rem', whiteSpace: 'nowrap', ml: 1 }}
            >
              Configure SSO
            </Button>
          </Box>

        </CardContent>
      </Card>

      {/* ── SSO configuration instructions modal ── */}
      <Dialog
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Configure SSO Providers</Typography>
          <IconButton size="small" onClick={() => setInstructionsOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Alert severity="info" sx={{ mx: 3, mb: 1, fontSize: '0.8rem' }}>
          Send a <strong>POST</strong> request to <code>/api/auth/providers</code> with an Admin JWT.
        </Alert>

        {/* Provider tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {SSO_INSTRUCTIONS.map(inst => (
            <Tab key={inst.name} label={inst.name.split(' ')[0]} sx={{ fontSize: '0.78rem', fontWeight: 600 }} />
          ))}
        </Tabs>

        <DialogContent sx={{ pt: 2.5 }}>
          {SSO_INSTRUCTIONS.map((inst, idx) => (
            <Box key={inst.name} hidden={activeTab !== idx}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                {inst.name}
              </Typography>

              <List dense disablePadding sx={{ mb: 2 }}>
                {inst.steps.map((step, i) => (
                  <ListItem key={i} sx={{ py: 0.4, pl: 0, alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={`${i + 1}. ${step}`}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                  </ListItem>
                ))}
              </List>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Then send this JSON to <code>POST /api/auth/providers</code>:
              </Typography>
              <CodeSnippet code={inst.payload} />
            </Box>
          ))}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
          <Button variant="contained" onClick={() => setInstructionsOpen(false)} sx={{ alignSelf: 'flex-end' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default SsoLoginPage;

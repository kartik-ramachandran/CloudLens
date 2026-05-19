import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Alert, Divider, TextField, InputAdornment, IconButton, Link,
  Grid, Checkbox, FormControlLabel,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessIcon from '@mui/icons-material/Business';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { SsoProvider } from '../types';
import {
  getAuthProviders, getSocialProviders,
  loginWithEmail, registerWithEmail,
} from '../services/api';
import { buildAuthorizationUrl, getDefaultRedirectUri, storeAuth } from '../utils/oauth';

// ── SVG logos ─────────────────────────────────────────────────────────────────

const GOOGLE_LOGO = (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const MICROSOFT_LOGO = (
  <svg width="20" height="20" viewBox="0 0 23 23">
    <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
    <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
    <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
    <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocialProvider { provider: string; clientId: string; authority: string; scopes?: string[]; redirectUri?: string }
type AccountType = 'personal' | 'enterprise';

const AUTH_GRAD = 'linear-gradient(135deg, #1455d9 0%, #0ea5e9 52%, #14b8a6 100%)';
const ENTERPRISE_GRAD = 'linear-gradient(135deg, #0f172a 0%, #1455d9 46%, #f97316 100%)';

// ── Shared tab toggle ─────────────────────────────────────────────────────────

const AccountTypeTabs: React.FC<{ value: AccountType; onChange: (v: AccountType) => void }> = ({ value, onChange }) => (
  <Box sx={{
    display: 'flex',
    borderRadius: 3,
    border: '1px solid rgba(148,163,184,0.26)',
    overflow: 'hidden',
    mb: 2.5,
    p: 0.5,
    bgcolor: 'rgba(15,23,42,0.04)',
  }}>
    {(['personal', 'enterprise'] as AccountType[]).map(t => (
      <Box
        key={t}
        onClick={() => onChange(t)}
        sx={{
          flex: 1, py: 1.1, px: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 0.8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
          borderRadius: 2.2,
          transition: 'all 0.18s ease',
          bgcolor: value === t ? 'background.paper' : 'transparent',
          color: value === t ? '#0f172a' : 'text.secondary',
          boxShadow: value === t ? '0 12px 28px rgba(15,23,42,0.12)' : 'none',
          '&:hover': { bgcolor: value === t ? 'background.paper' : 'rgba(255,255,255,0.50)' },
        }}
      >
        {t === 'personal' ? <PersonOutlineIcon sx={{ fontSize: 18 }} /> : <BusinessIcon sx={{ fontSize: 18 }} />}
        {t === 'personal' ? 'Personal' : 'Enterprise'}
      </Box>
    ))}
  </Box>
);

// ── Social button ─────────────────────────────────────────────────────────────

const SocialBtn: React.FC<{
  logo: React.ReactNode; label: string; loading: boolean; onClick: () => void;
}> = ({ logo, label, loading, onClick }) => (
  <Button
    fullWidth variant="outlined" disabled={loading} onClick={onClick}
    startIcon={loading ? <CircularProgress size={18} /> : logo}
    sx={{
      py: 1.25, fontWeight: 750, fontSize: '0.875rem',
      color: 'text.primary',
      borderColor: 'rgba(148,163,184,0.28)',
      bgcolor: 'rgba(255,255,255,0.72)',
      justifyContent: 'center', gap: 1.5,
      '&:hover': {
        bgcolor: 'white',
        borderColor: 'rgba(20,85,217,0.34)',
        transform: 'translateY(-1px)',
        boxShadow: '0 14px 30px rgba(15,23,42,0.10)',
      },
    }}
  >
    {loading ? 'Redirecting…' : label}
  </Button>
);

// ── Password field ────────────────────────────────────────────────────────────

const PwdField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; autoComplete?: string;
  error?: boolean; helperText?: string;
}> = ({ label, value, onChange, show, onToggle, autoComplete, error, helperText }) => (
  <TextField
    label={label} type={show ? 'text' : 'password'} value={value}
    onChange={e => onChange(e.target.value)} required fullWidth size="small"
    autoComplete={autoComplete} error={error} helperText={helperText}
    InputProps={{
      endAdornment: (
        <InputAdornment position="end">
          <IconButton size="small" onClick={onToggle} edge="end" tabIndex={-1}>
            {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
        </InputAdornment>
      ),
    }}
  />
);

// ── Outer shell ───────────────────────────────────────────────────────────────

const Shell: React.FC<{
  children: React.ReactNode;
  wide?: boolean;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}> = ({ children, wide, onOpenTerms, onOpenPrivacy }) => (
  <Box sx={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    p: { xs: 2, md: 4 },
    position: 'relative',
    overflow: 'hidden',
    background: `
      linear-gradient(115deg, rgba(20,85,217,0.10), rgba(20,184,166,0.08) 46%, rgba(249,115,22,0.08)),
      #eef3f8
    `,
    '&:before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)',
      backgroundSize: '44px 44px',
      maskImage: 'linear-gradient(to bottom, black 0%, transparent 78%)',
      pointerEvents: 'none',
    },
  }}>
    <Card sx={{
      width: '100%', maxWidth: wide ? 640 : 460,
      borderRadius: 5,
      boxShadow: '0 34px 90px rgba(15,23,42,0.22)',
      border: '1px solid rgba(255,255,255,0.70)',
      background: 'rgba(255,255,255,0.78)',
      backdropFilter: 'blur(24px)',
      position: 'relative',
      overflow: 'hidden',
      '&:before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        height: 4,
        background: AUTH_GRAD,
      },
    }}>
      {children}
    </Card>
    <Typography variant="caption" color="text.secondary" sx={{ mt: 2.5, textAlign: 'center', position: 'relative' }}>
      By signing in, you agree to our{' '}
      <Link
        component="button" type="button" underline="hover" color="primary"
        sx={{ fontWeight: 500, fontSize: 'inherit', verticalAlign: 'baseline', cursor: 'pointer' }}
        onClick={onOpenTerms}
      >
        Terms of Service
      </Link>
      {' '}and{' '}
      <Link
        component="button" type="button" underline="hover" color="primary"
        sx={{ fontWeight: 500, fontSize: 'inherit', verticalAlign: 'baseline', cursor: 'pointer' }}
        onClick={onOpenPrivacy}
      >
        Privacy Policy
      </Link>
    </Typography>
  </Box>
);

// ── Brand header ──────────────────────────────────────────────────────────────

const BrandHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, mb: 0.5 }}>
      <Box sx={{
        width: 44,
        height: 44,
        borderRadius: 2.5,
        display: 'grid',
        placeItems: 'center',
        background: AUTH_GRAD,
        boxShadow: '0 18px 34px rgba(20,85,217,0.28)',
      }}>
        <Box component="img" src="/logo.svg" alt="CloudLens" sx={{ width: 28, height: 28, filter: 'brightness(0) invert(1)' }} />
      </Box>
      <Typography variant="h6" fontWeight={900} sx={{ color: '#0f172a' }}>
        CloudLens
      </Typography>
    </Box>
    <Typography variant="h4" fontWeight={900} sx={{ mt: 1.5, mb: 0.5, fontSize: { xs: '1.65rem', sm: '2rem' } }}>{title}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>{subtitle}</Typography>
  </Box>
);

// ── Enterprise info banner ────────────────────────────────────────────────────

const EnterpriseBanner: React.FC<{ text: string }> = ({ text }) => (
  <Box sx={{
    display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2,
    p: 1.35,
    borderRadius: 2.5,
    bgcolor: 'rgba(20,85,217,0.08)',
    border: '1px solid rgba(20,85,217,0.18)',
  }}>
    <ShieldOutlinedIcon sx={{ fontSize: 16, color: '#1455d9', mt: 0.2, flexShrink: 0 }} />
    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{text}</Typography>
  </Box>
);

// ── OR divider ────────────────────────────────────────────────────────────────

const OrDivider: React.FC<{ text?: string }> = ({ text = 'OR CONTINUE WITH EMAIL' }) => (
  <Divider sx={{ my: 2 }}>
    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: 0.5, fontSize: '0.7rem' }}>
      {text}
    </Typography>
  </Divider>
);

// ── Sign-in view ──────────────────────────────────────────────────────────────

const SignInView: React.FC<{
  socialProviders: SocialProvider[];
  ssoProviders: SsoProvider[];
  loadingProviders: boolean;
  onSocialSignIn: (p: SocialProvider) => void;
  initiating: string | null;
  onSwitchToSignUp: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onForgotPassword: () => void;
}> = ({ socialProviders, ssoProviders, loadingProviders, onSocialSignIn, initiating, onSwitchToSignUp, onOpenTerms, onOpenPrivacy, onForgotPassword }) => {
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginWithEmail(email, password);
      if (!result.success || !result.token || !result.user) {
        setError(result.error ?? 'Invalid email or password.');
        return;
      }
      storeAuth(result.token, result.user);
      window.location.reload();
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // SSO enterprise providers that aren't Google/Microsoft
  const orgSsoProviders = ssoProviders.filter(p => p.provider !== 'Google' && p.provider !== 'Microsoft');
  const googleProvider = socialProviders.find(p => p.provider === 'Google');
  const msProvider = socialProviders.find(p => p.provider === 'Microsoft');

  const handleSocialClick = (providerName: 'Google' | 'Microsoft') => {
    const p = providerName === 'Google' ? googleProvider : msProvider;
    if (p) { onSocialSignIn(p); return; }
    setError(`${providerName} sign-in is not configured. Add the ClientId in ExternalAuth settings.`);
  };

  return (
    <Shell onOpenTerms={onOpenTerms} onOpenPrivacy={onOpenPrivacy}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <BrandHeader title="Welcome back" subtitle="Sign in to access your Azure insights" />

        <AccountTypeTabs value={accountType} onChange={setAccountType} />

        {accountType === 'enterprise' && (
          <EnterpriseBanner text="Enterprise accounts have additional security and collaboration features" />
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <SocialBtn
            logo={GOOGLE_LOGO}
            label={accountType === 'enterprise' ? 'Continue with Google (Work)' : 'Continue with Google'}
            loading={initiating === 'Google'}
            onClick={() => handleSocialClick('Google')}
          />
          <SocialBtn
            logo={MICROSOFT_LOGO}
            label={accountType === 'enterprise' ? 'Continue with Microsoft (Work)' : 'Continue with Microsoft'}
            loading={initiating === 'Microsoft'}
            onClick={() => handleSocialClick('Microsoft')}
          />
          {accountType === 'enterprise' && orgSsoProviders.length > 0 && orgSsoProviders.map(p => (
            <Button
              key={p.provider}
              fullWidth variant="outlined"
              disabled={initiating === p.provider}
              onClick={() => onSocialSignIn({ provider: p.provider, clientId: p.clientId, authority: p.authority ?? '', scopes: p.scopes, redirectUri: p.redirectUri })}
              startIcon={<ShieldOutlinedIcon sx={{ fontSize: 18, color: '#5c47d6' }} />}
              sx={{
                py: 1.25, fontWeight: 750, fontSize: '0.875rem',
                color: '#1455d9', borderColor: 'rgba(20,85,217,0.24)',
                bgcolor: 'rgba(20,85,217,0.06)', justifyContent: 'center', gap: 1.5,
                '&:hover': { bgcolor: 'rgba(20,85,217,0.10)', borderColor: 'rgba(20,85,217,0.40)' },
              }}
            >
              {initiating === p.provider ? 'Redirecting…' : `Continue with ${p.provider}`}
            </Button>
          ))}
          {accountType === 'enterprise' && orgSsoProviders.length === 0 && (
            <Button
              fullWidth variant="outlined"
              startIcon={<ShieldOutlinedIcon sx={{ fontSize: 18, color: '#5c47d6' }} />}
              disabled
              sx={{
                py: 1.25, fontWeight: 750, fontSize: '0.875rem',
                color: '#1455d9', borderColor: 'rgba(20,85,217,0.24)',
                bgcolor: 'rgba(20,85,217,0.06)', justifyContent: 'center', gap: 1.5, opacity: 0.7,
              }}
            >
              Continue with your organization
            </Button>
          )}
          {accountType === 'enterprise' && (
            <Box sx={{ textAlign: 'center' }}>
              <Link href="#" variant="caption" color="primary" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                Set up SSO for my organisation →
              </Link>
            </Box>
          )}
        </Box>

        <OrDivider />

        {/* Email/password form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={accountType === 'enterprise' ? 'Work Email' : 'Email'}
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required fullWidth size="small" autoComplete="email"
            placeholder={accountType === 'enterprise' ? 'Enter your work email' : 'Enter your email'}
          />
          <PwdField
            label="Password" value={password} onChange={setPassword}
            show={showPwd} onToggle={() => setShowPwd(v => !v)}
            autoComplete="current-password"
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: -0.5 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />}
              label={<Typography variant="body2">Remember me</Typography>}
              sx={{ mr: 0 }}
            />
            <Link component="button" type="button" variant="body2" color="primary" fontWeight={600} onClick={onForgotPassword}>
              Forgot password?
            </Link>
          </Box>

          <Button
            type="submit" fullWidth variant="contained" size="large" disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{
              py: 1.3, fontWeight: 700, fontSize: '0.95rem',
              background: accountType === 'enterprise'
                ? ENTERPRISE_GRAD
                : AUTH_GRAD,
              '&:hover': {
                background: accountType === 'enterprise'
                  ? ENTERPRISE_GRAD
                  : AUTH_GRAD,
                boxShadow: '0 18px 34px rgba(20,85,217,0.24)',
              },
              boxShadow: '0 16px 30px rgba(20,85,217,0.20)',
            }}
          >
            {loading ? 'Signing in…' : accountType === 'enterprise' ? 'Sign In to Organization' : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component="button" type="button" variant="body2" fontWeight={700} color="primary"
              onClick={onSwitchToSignUp}>Sign up</Link>
          </Typography>
        </Box>
      </CardContent>
    </Shell>
  );
};

// ── Sign-up view ──────────────────────────────────────────────────────────────

const SignUpView: React.FC<{
  socialProviders: SocialProvider[];
  loadingProviders: boolean;
  onSocialSignIn: (p: SocialProvider) => void;
  initiating: string | null;
  onSwitchToSignIn: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}> = ({ socialProviders, loadingProviders, onSocialSignIn, initiating, onSwitchToSignIn, onOpenTerms, onOpenPrivacy }) => {
  const [accountType, setAccountType] = useState<AccountType>('personal');

  // Personal fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Enterprise extra fields
  const [orgName, setOrgName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pwdMismatch = !!confirm && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const org = accountType === 'enterprise' ? orgName : undefined;
      const result = await registerWithEmail(fullName, email, password, org);
      if (!result.success || !result.token || !result.user) {
        setError(result.error ?? 'Registration failed.');
        return;
      }
      storeAuth(result.token, result.user);
      window.location.reload();
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const googleProvider = socialProviders.find(p => p.provider === 'Google');
  const msProvider = socialProviders.find(p => p.provider === 'Microsoft');

  return (
    <Shell wide={accountType === 'enterprise'} onOpenTerms={onOpenTerms} onOpenPrivacy={onOpenPrivacy}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <BrandHeader title="Create your account" subtitle="Start monitoring your Azure environment today" />

        <AccountTypeTabs value={accountType} onChange={t => { setAccountType(t); setError(''); }} />

        {accountType === 'enterprise' && (
          <EnterpriseBanner text="For teams, organizations, and enterprise deployments with enhanced security" />
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Enterprise org info */}
          {accountType === 'enterprise' && (
            <>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: -0.5 }}>Organisation Information</Typography>
              <Divider />
              <TextField
                label="Organisation Name" value={orgName} onChange={e => setOrgName(e.target.value)}
                required fullWidth size="small" placeholder="Acme Corporation"
              />
            </>
          )}

          {/* Name row */}
          {accountType === 'enterprise' && (
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5, mb: -0.5 }}>Administrator Account</Typography>
          )}
          {accountType === 'enterprise' && <Divider />}

          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)}
                required fullWidth size="small" autoComplete="given-name" />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)}
                required fullWidth size="small" autoComplete="family-name" />
            </Grid>
          </Grid>

          <TextField
            label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            required fullWidth size="small" autoComplete="email"
          />
          <PwdField
            label="Password" value={password} onChange={setPassword}
            show={showPwd} onToggle={() => setShowPwd(v => !v)}
            autoComplete="new-password"
          />
          <PwdField
            label="Confirm Password" value={confirm} onChange={setConfirm}
            show={showPwd} onToggle={() => setShowPwd(v => !v)}
            autoComplete="new-password"
            error={pwdMismatch} helperText={pwdMismatch ? 'Passwords do not match' : ''}
          />

          <Button
            type="submit" fullWidth variant="contained" size="large" disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{
              py: 1.3, fontWeight: 700, fontSize: '0.95rem',
              background: accountType === 'enterprise' ? ENTERPRISE_GRAD : AUTH_GRAD,
              '&:hover': {
                background: accountType === 'enterprise' ? ENTERPRISE_GRAD : AUTH_GRAD,
                boxShadow: '0 18px 34px rgba(20,85,217,0.24)',
              },
              boxShadow: '0 16px 30px rgba(20,85,217,0.20)',
            }}
          >
            {loading ? 'Creating account…' : accountType === 'enterprise' ? 'Create Enterprise Account' : 'Create Personal Account'}
          </Button>
        </Box>

        <OrDivider text={accountType === 'enterprise' ? 'OR CONTINUE WITH SSO' : 'OR CONTINUE WITH'} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <SocialBtn
            logo={GOOGLE_LOGO}
            label={accountType === 'enterprise' ? 'Continue with Google (Work)' : 'Continue with Google'}
            loading={initiating === 'Google'}
            onClick={() => googleProvider ? onSocialSignIn(googleProvider) : undefined}
          />
          <SocialBtn
            logo={MICROSOFT_LOGO}
            label={accountType === 'enterprise' ? 'Continue with Microsoft (Work)' : 'Continue with Microsoft'}
            loading={initiating === 'Microsoft'}
            onClick={() => msProvider ? onSocialSignIn(msProvider) : undefined}
          />
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component="button" type="button" variant="body2" fontWeight={700} color="primary"
              onClick={onSwitchToSignIn}>Sign in</Link>
          </Typography>
        </Box>
      </CardContent>
    </Shell>
  );
};

// ── Root component ────────────────────────────────────────────────────────────

interface LoginPageProps {
  initialTab?: 'signin' | 'signup';
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onForgotPassword: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ initialTab = 'signin', onOpenTerms, onOpenPrivacy, onForgotPassword }) => {
  const [view, setView] = useState<'signin' | 'signup'>(initialTab);
  const [socialProviders, setSocialProviders] = useState<SocialProvider[]>([]);
  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [initiating, setInitiating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSocialProviders(), getAuthProviders()])
      .then(([social, sso]) => { setSocialProviders(social); setSsoProviders(sso); })
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, []);

  // Merge: DB-configured Google/Microsoft fill gaps when appsettings not set
  const mergedSocial: SocialProvider[] = useMemo(() => {
    const map = new Map<string, SocialProvider>();
    for (const p of socialProviders) map.set(p.provider, p);
    for (const p of ssoProviders) {
      if ((p.provider === 'Google' || p.provider === 'Microsoft') && !map.has(p.provider))
        map.set(p.provider, { provider: p.provider, clientId: p.clientId, authority: p.authority ?? '', scopes: p.scopes, redirectUri: p.redirectUri });
    }
    return ['Google', 'Microsoft'].map(k => map.get(k)).filter(Boolean) as SocialProvider[];
  }, [socialProviders, ssoProviders]);

  const handleSocialSignIn = async (p: SocialProvider) => {
    setInitiating(p.provider);
    try {
      const redirectUri = getDefaultRedirectUri();
      const scopes = p.scopes ?? ['openid', 'profile', 'email'];
      const url = await buildAuthorizationUrl(p.provider, p.clientId, p.authority, scopes, redirectUri);
      window.location.href = url;
    } catch (e: any) {
      setInitiating(null);
    }
  };

  if (view === 'signup') {
    return (
      <SignUpView
        socialProviders={mergedSocial}
        loadingProviders={loadingProviders}
        onSocialSignIn={handleSocialSignIn}
        initiating={initiating}
        onSwitchToSignIn={() => setView('signin')}
        onOpenTerms={onOpenTerms}
        onOpenPrivacy={onOpenPrivacy}
      />
    );
  }

  return (
    <SignInView
      socialProviders={mergedSocial}
      ssoProviders={ssoProviders}
      loadingProviders={loadingProviders}
      onSocialSignIn={handleSocialSignIn}
      initiating={initiating}
      onSwitchToSignUp={() => setView('signup')}
      onOpenTerms={onOpenTerms}
      onOpenPrivacy={onOpenPrivacy}
      onForgotPassword={onForgotPassword}
    />
  );
};

export default LoginPage;

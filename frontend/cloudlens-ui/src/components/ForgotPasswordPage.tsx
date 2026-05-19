import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Alert, Link, InputAdornment, IconButton, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { forgotPassword, resetPassword } from '../services/api';

const AUTH_GRAD = 'linear-gradient(135deg, #1455d9 0%, #0ea5e9 52%, #14b8a6 100%)';

// ── Shared shell ──────────────────────────────────────────────────────────────

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    p: { xs: 2, md: 4 },
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(115deg, rgba(20,85,217,0.10), rgba(20,184,166,0.08) 46%, rgba(249,115,22,0.08)), #eef3f8',
    '&:before': {
      content: '""', position: 'absolute', inset: 0,
      backgroundImage: 'linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)',
      backgroundSize: '44px 44px',
      maskImage: 'linear-gradient(to bottom, black 0%, transparent 78%)',
      pointerEvents: 'none',
    },
  }}>
    <Card sx={{
      width: '100%', maxWidth: 440, borderRadius: 5,
      boxShadow: '0 34px 90px rgba(15,23,42,0.22)',
      border: '1px solid rgba(255,255,255,0.70)',
      background: 'rgba(255,255,255,0.78)',
      backdropFilter: 'blur(24px)',
      position: 'relative', overflow: 'hidden',
      '&:before': {
        content: '""', position: 'absolute', inset: 0,
        height: 4, background: AUTH_GRAD,
      },
    }}>
      {children}
    </Card>
  </Box>
);

// ── Step 1: request reset ─────────────────────────────────────────────────────

const RequestStep: React.FC<{
  onBack: () => void;
  onDone: (token: string) => void;
}> = ({ onBack, onDone }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      if (!result.success) {
        setError(result.error ?? 'Something went wrong. Please try again.');
        return;
      }
      onDone(result.resetToken ?? '');
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: 3, mb: 2,
            display: 'grid', placeItems: 'center',
            background: AUTH_GRAD, boxShadow: '0 14px 28px rgba(20,85,217,0.28)',
          }}>
            <LockResetOutlinedIcon sx={{ fontSize: 26, color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Forgot password?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.6 }}>
            Enter your email and we'll send you a reset code.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            required fullWidth size="small" autoComplete="email"
            placeholder="Enter your email address"
            autoFocus
          />
          <Button
            type="submit" fullWidth variant="contained" size="large" disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{
              py: 1.3, fontWeight: 700, fontSize: '0.95rem',
              background: AUTH_GRAD,
              '&:hover': { background: AUTH_GRAD, boxShadow: '0 18px 34px rgba(20,85,217,0.24)' },
              boxShadow: '0 16px 30px rgba(20,85,217,0.20)',
            }}
          >
            {loading ? 'Sending…' : 'Send Reset Code'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <Link
            component="button" type="button" variant="body2" color="primary"
            fontWeight={600} onClick={onBack}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} /> Back to Sign In
          </Link>
        </Box>
      </CardContent>
    </Shell>
  );
};

// ── Step 2: enter code + new password ─────────────────────────────────────────

const ResetStep: React.FC<{
  prefillToken: string;
  onBack: () => void;
  onSuccess: () => void;
}> = ({ prefillToken, onBack, onSuccess }) => {
  const [token, setToken] = useState(prefillToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const pwdMismatch = !!confirm && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const result = await resetPassword(token.trim(), password);
      if (!result.success) {
        setError(result.error ?? 'Reset failed. Please try again.');
        return;
      }
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Shell>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
            display: 'grid', placeItems: 'center',
            bgcolor: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.25)',
          }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 30, color: '#16a34a' }} />
          </Box>
          <Typography variant="h6" fontWeight={800} gutterBottom>Password updated!</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
            Your password has been reset successfully. You can now sign in with your new password.
          </Typography>
          <Button
            fullWidth variant="contained" size="large" onClick={onSuccess}
            sx={{
              py: 1.3, fontWeight: 700, background: AUTH_GRAD,
              '&:hover': { background: AUTH_GRAD, boxShadow: '0 18px 34px rgba(20,85,217,0.24)' },
              boxShadow: '0 16px 30px rgba(20,85,217,0.20)',
            }}
          >
            Sign In
          </Button>
        </CardContent>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: 3, mb: 2,
            display: 'grid', placeItems: 'center',
            background: AUTH_GRAD, boxShadow: '0 14px 28px rgba(20,85,217,0.28)',
          }}>
            <LockResetOutlinedIcon sx={{ fontSize: 26, color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Set new password</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.6 }}>
            Enter the reset code from your email and choose a new password.
          </Typography>
        </Box>

        {/* Dev hint: show token if present */}
        {prefillToken && (
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.78rem' }}>
            <strong>Dev mode:</strong> Reset code auto-filled from server response.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Reset Code" value={token} onChange={e => setToken(e.target.value)}
            required fullWidth size="small"
            placeholder="Paste your reset code"
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
          />
          <TextField
            label="New Password" type={showPwd ? 'text' : 'password'}
            value={password} onChange={e => setPassword(e.target.value)}
            required fullWidth size="small" autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd(v => !v)} edge="end" tabIndex={-1}>
                    {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password" type={showPwd ? 'text' : 'password'}
            value={confirm} onChange={e => setConfirm(e.target.value)}
            required fullWidth size="small" autoComplete="new-password"
            error={pwdMismatch} helperText={pwdMismatch ? 'Passwords do not match' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd(v => !v)} edge="end" tabIndex={-1}>
                    {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit" fullWidth variant="contained" size="large" disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{
              py: 1.3, fontWeight: 700, fontSize: '0.95rem',
              background: AUTH_GRAD,
              '&:hover': { background: AUTH_GRAD, boxShadow: '0 18px 34px rgba(20,85,217,0.24)' },
              boxShadow: '0 16px 30px rgba(20,85,217,0.20)',
            }}
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <Link
            component="button" type="button" variant="body2" color="primary"
            fontWeight={600} onClick={onBack}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} /> Back to Sign In
          </Link>
        </Box>
      </CardContent>
    </Shell>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────

interface ForgotPasswordPageProps {
  onBack: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBack }) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [resetToken, setResetToken] = useState('');

  if (step === 'reset') {
    return (
      <ResetStep
        prefillToken={resetToken}
        onBack={onBack}
        onSuccess={onBack}
      />
    );
  }

  return (
    <RequestStep
      onBack={onBack}
      onDone={token => { setResetToken(token); setStep('reset'); }}
    />
  );
};

export default ForgotPasswordPage;

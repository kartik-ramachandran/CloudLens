import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { loginWithCode } from '../services/api';
import { retrievePkceState, clearPkceState, storeAuth } from '../utils/oauth';

interface OAuthCallbackProps {
  onSuccess: () => void;
  onError: () => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onSuccess, onError }) => {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const handledRef = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    if (handledRef.current) return;
    handledRef.current = true;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const returnedState = params.get('state');
      const oauthError = params.get('error');
      const oauthErrorDesc = params.get('error_description');

      // Handle provider-returned errors
      if (oauthError) {
        setErrorMsg(oauthErrorDesc ?? oauthError);
        setStatus('error');
        clearPkceState();
        return;
      }

      if (!code) {
        setErrorMsg('No authorization code in the callback URL.');
        setStatus('error');
        return;
      }

      const pkce = retrievePkceState();
      if (!pkce) {
        setErrorMsg('PKCE state not found. Please start the sign-in again.');
        setStatus('error');
        return;
      }

      if (pkce.state !== returnedState) {
        setErrorMsg('State mismatch — possible CSRF attack. Please sign in again.');
        setStatus('error');
        clearPkceState();
        return;
      }

      clearPkceState();

      try {
        const result = await loginWithCode(
          pkce.provider,
          code,
          pkce.codeVerifier,
          pkce.redirectUri,
        );

        if (!result.success || !result.token || !result.user) {
          setErrorMsg(result.error ?? 'Authentication failed. Please try again.');
          setStatus('error');
          return;
        }

        storeAuth(result.token, result.user);

        // Clean up the URL params before navigating
        window.history.replaceState({}, document.title, '/');
        onSuccess();
      } catch (e: any) {
        const msg = e.response?.data?.error ?? e.message ?? 'Unexpected error during sign-in.';
        setErrorMsg(msg);
        setStatus('error');
      }
    };

    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 5,
          minWidth: 320,
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          AzureLens
        </Typography>

        {status === 'loading' ? (
          <>
            <CircularProgress sx={{ my: 2 }} />
            <Typography color="text.secondary">Completing sign-in…</Typography>
          </>
        ) : (
          <>
            <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
              {errorMsg}
            </Alert>
            <Button variant="contained" sx={{ mt: 2 }} onClick={onError}>
              Back to Sign In
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default OAuthCallback;

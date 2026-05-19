import React from 'react';
import { Alert, Box, Chip, CircularProgress, IconButton, Snackbar, Tooltip } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useCacheStatus } from '../hooks/useCacheStatus';

export function CacheStatusIndicator() {
  const { status, triggerRefresh } = useCacheStatus();
  const [refreshError, setRefreshError] = React.useState('');

  const lastRefreshLabel = status.lastRefresh
    ? `Refreshed ${formatAgo(status.lastRefresh)}`
    : 'Not yet refreshed';

  const providerEntries = Object.entries(status.providers);

  const handleRefresh = async () => {
    setRefreshError('');

    try {
      await triggerRefresh();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Unable to start cache refresh.');
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        {/* Per-provider chips */}
        {providerEntries.map(([provider, state]) => (
          <Chip
            key={provider}
            label={provider.toUpperCase()}
            size="small"
            icon={
              state === 'refreshing' ? (
                <CircularProgress size={10} sx={{ color: 'inherit' }} />
              ) : state === 'ok' ? (
                <CloudDoneIcon sx={{ fontSize: 14 }} />
              ) : (
                <CloudOffIcon sx={{ fontSize: 14 }} />
              )
            }
            color={state === 'ok' ? 'success' : state === 'error' ? 'error' : 'default'}
            variant="outlined"
            sx={{
              height: 24,
              fontSize: 10,
              fontWeight: 800,
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.10)',
              borderColor: 'rgba(255,255,255,0.24)',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        ))}

        {/* Last refresh time */}
        <Tooltip title={lastRefreshLabel}>
          <Chip
            label={status.isRefreshing ? 'Refreshing…' : lastRefreshLabel}
            size="small"
            icon={
              status.isRefreshing ? (
                <CircularProgress size={10} sx={{ color: 'inherit' }} />
              ) : status.connected ? (
                <CloudDoneIcon sx={{ fontSize: 14 }} />
              ) : (
                <CloudOffIcon sx={{ fontSize: 14 }} />
              )
            }
            color={status.connected ? 'default' : 'warning'}
            variant="outlined"
            sx={{
              height: 24,
              fontSize: 10,
              fontWeight: 800,
              color: 'white',
              bgcolor: status.connected ? 'rgba(255,255,255,0.10)' : 'rgba(245,158,11,0.18)',
              borderColor: status.connected ? 'rgba(255,255,255,0.24)' : 'rgba(251,191,36,0.45)',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        </Tooltip>

        {/* Manual refresh button */}
        <Tooltip title="Trigger cache refresh now">
          <span>
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={status.isRefreshing}
              sx={{
                p: 0.5,
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.11)',
                border: '1px solid rgba(255,255,255,0.18)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.46)', borderColor: 'rgba(255,255,255,0.10)' },
              }}
            >
              <SyncIcon
                sx={{
                  fontSize: 16,
                  animation: status.isRefreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                }}
              />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Snackbar
        open={!!refreshError}
        autoHideDuration={6000}
        onClose={() => setRefreshError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setRefreshError('')} sx={{ width: '100%' }}>
          {refreshError}
        </Alert>
      </Snackbar>
    </>
  );
}

function formatAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

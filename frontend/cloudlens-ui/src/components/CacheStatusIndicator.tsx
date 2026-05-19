import React from 'react';
import { Box, Chip, CircularProgress, Tooltip, IconButton } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useCacheStatus } from '../hooks/useCacheStatus';

export function CacheStatusIndicator() {
  const { status, triggerRefresh } = useCacheStatus();

  const lastRefreshLabel = status.lastRefresh
    ? `Refreshed ${formatAgo(status.lastRefresh)}`
    : 'Not yet refreshed';

  const providerEntries = Object.entries(status.providers);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          sx={{ height: 22, fontSize: 10 }}
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
          sx={{ height: 22, fontSize: 10 }}
        />
      </Tooltip>

      {/* Manual refresh button */}
      <Tooltip title="Trigger cache refresh now">
        <span>
          <IconButton
            size="small"
            onClick={triggerRefresh}
            disabled={status.isRefreshing}
            sx={{ p: 0.5 }}
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
  );
}

function formatAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

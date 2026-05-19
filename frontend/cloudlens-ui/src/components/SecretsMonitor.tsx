import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, Tabs, Tab, CircularProgress,
  Tooltip, IconButton, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { AzureCredentials, AppSecretsReport, KeyVaultExpiryReport, AppSecretInfo, KeyVaultExpiryItem } from '../types';
import { getAppSecretsReport, getKeyVaultExpiryReport } from '../services/api';

interface SecretsMonitorProps {
  credentials: AzureCredentials;
}

type StatusFilter = 'all' | 'expired' | 'expiring_soon' | 'expiring_90d' | 'healthy' | 'no_expiry';

const statusChip = (status: string, days: number) => {
  if (status === 'expired')
    return <Chip size="small" icon={<ErrorOutlineIcon />} label="Expired" color="error" />;
  if (status === 'expiring_soon')
    return <Chip size="small" icon={<WarningAmberIcon />} label={`${days}d`} color="warning" />;
  if (status === 'expiring_90d')
    return <Chip size="small" icon={<WarningAmberIcon />} label={`${days}d`} sx={{ bgcolor: '#fff3cd', color: '#856404' }} />;
  if (status === 'healthy')
    return <Chip size="small" icon={<CheckCircleOutlineIcon />} label={`${days}d`} color="success" />;
  return <Chip size="small" label="No expiry" variant="outlined" />;
};

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; value: number | string; color: string; icon?: React.ReactNode }> = ({ label, value, color, icon }) => (
  <Card sx={{ flex: 1, minWidth: 110 }}>
    <CardContent sx={{ textAlign: 'center', py: 2, px: 1.5 }}>
      {icon && <Box sx={{ color, mb: 0.5 }}>{icon}</Box>}
      <Typography variant="h3" sx={{ fontWeight: 700, color }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

// ── App Secrets Tab ───────────────────────────────────────────────────────────
const AppSecretsTab: React.FC<{ credentials: AzureCredentials }> = ({ credentials }) => {
  const [report, setReport] = useState<AppSecretsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const load = async () => {
    setLoading(true);
    try { setReport(await getAppSecretsReport(credentials)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (credentials.sessionId) load();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered: AppSecretInfo[] = report
    ? (filter === 'all' ? report.secrets : report.secrets.filter(s => s.status === filter))
    : [];

  if (loading && !report) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {report && report.expiredSecrets > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {report.expiredSecrets} app secret{report.expiredSecrets > 1 ? 's have' : ' has'} expired — rotate immediately to avoid authentication failures.
        </Alert>
      )}
      {report && report.expiringSoon30d - report.expiredSecrets > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {report.expiringSoon30d - report.expiredSecrets} secret{report.expiringSoon30d - report.expiredSecrets > 1 ? 's expire' : ' expires'} within 30 days.
        </Alert>
      )}

      {/* KPIs */}
      {report && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <KpiCard label="Apps" value={report.totalApps} color="#0078d4" />
          <KpiCard label="Total Secrets" value={report.totalSecrets} color="#5c2d91" />
          <KpiCard label="Expired" value={report.expiredSecrets} color="#d13438" icon={<ErrorOutlineIcon fontSize="small" />} />
          <KpiCard label="Expiring ≤30d" value={report.expiringSoon30d - report.expiredSecrets} color="#e67e00" icon={<WarningAmberIcon fontSize="small" />} />
          <KpiCard label="Expiring ≤90d" value={report.expiringSoon90d - report.expiringSoon30d} color="#856404" />
          <KpiCard label="Healthy" value={report.healthySecrets} color="#107c10" icon={<CheckCircleOutlineIcon fontSize="small" />} />
        </Box>
      )}

      {/* Filter + Refresh */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter by status</InputLabel>
          <Select value={filter} label="Filter by status" onChange={e => setFilter(e.target.value as StatusFilter)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="expiring_soon">Expiring ≤30d</MenuItem>
            <MenuItem value="expiring_90d">Expiring ≤90d</MenuItem>
            <MenuItem value="healthy">Healthy</MenuItem>
            <MenuItem value="no_expiry">No Expiry Set</MenuItem>
          </Select>
        </FormControl>
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {report && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {filtered.length} of {report.totalSecrets} secrets
          </Typography>
        )}
      </Box>

      {/* Table */}
      {report && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Application</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Secret Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Expires</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No secrets match the selected filter.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s, i) => (
                <TableRow key={`${s.appObjectId}-${s.secretId}-${i}`} hover
                  sx={s.status === 'expired' ? { bgcolor: 'rgba(211,52,56,0.06)' }
                    : s.status === 'expiring_soon' ? { bgcolor: 'rgba(230,126,0,0.06)' } : {}}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.displayName || '(unnamed)'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{s.appId}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{s.secretDisplayName || '(unnamed)'}</Typography>
                  </TableCell>
                  <TableCell>{fmtDate(s.expiryDate)}</TableCell>
                  <TableCell>{statusChip(s.status, s.daysUntilExpiry)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!report && !loading && (
        <Alert severity="info">Connect your Azure credentials to load app registration secrets.</Alert>
      )}
    </Box>
  );
};

// ── Key Vault Expiry Tab ──────────────────────────────────────────────────────
const KeyVaultExpiryTab: React.FC<{ credentials: AzureCredentials }> = ({ credentials }) => {
  const [report, setReport] = useState<KeyVaultExpiryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'secret' | 'certificate'>('all');

  const load = async () => {
    setLoading(true);
    try { setReport(await getKeyVaultExpiryReport(credentials)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (credentials.sessionId) load();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered: KeyVaultExpiryItem[] = report
    ? report.items.filter(i =>
        (filter === 'all' || i.status === filter) &&
        (typeFilter === 'all' || i.itemType === typeFilter)
      )
    : [];

  if (loading && !report) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {report && report.expiredItems > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {report.expiredItems} Key Vault item{report.expiredItems > 1 ? 's have' : ' has'} expired and may be blocking services.
        </Alert>
      )}
      {report && report.expiringSoon30d - report.expiredItems > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {report.expiringSoon30d - report.expiredItems} item{report.expiringSoon30d - report.expiredItems > 1 ? 's expire' : ' expires'} within 30 days.
        </Alert>
      )}

      {/* KPIs */}
      {report && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <KpiCard label="Vaults" value={report.totalVaults} color="#0078d4" />
          <KpiCard label="Total Items" value={report.totalItems} color="#5c2d91" />
          <KpiCard label="Expired" value={report.expiredItems} color="#d13438" icon={<ErrorOutlineIcon fontSize="small" />} />
          <KpiCard label="Expiring ≤30d" value={report.expiringSoon30d - report.expiredItems} color="#e67e00" icon={<WarningAmberIcon fontSize="small" />} />
          <KpiCard label="Expiring ≤90d" value={report.expiringSoon90d - report.expiringSoon30d} color="#856404" />
          <KpiCard label="Healthy" value={report.healthyItems} color="#107c10" icon={<CheckCircleOutlineIcon fontSize="small" />} />
          <KpiCard label="No Expiry" value={report.noExpiryItems} color="#5c636a" />
        </Box>
      )}

      {/* Filters + Refresh */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value as any)}>
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="secret">Secrets</MenuItem>
            <MenuItem value="certificate">Certificates</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter by status</InputLabel>
          <Select value={filter} label="Filter by status" onChange={e => setFilter(e.target.value as StatusFilter)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="expiring_soon">Expiring ≤30d</MenuItem>
            <MenuItem value="expiring_90d">Expiring ≤90d</MenuItem>
            <MenuItem value="healthy">Healthy</MenuItem>
            <MenuItem value="no_expiry">No Expiry Set</MenuItem>
          </Select>
        </FormControl>
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {report && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {filtered.length} of {report.totalItems} items
          </Typography>
        )}
      </Box>

      {/* Table */}
      {report && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Vault</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Resource Group</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Expires</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No items match the selected filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((item, i) => (
                <TableRow key={`${item.vaultName}-${item.itemName}-${i}`} hover
                  sx={item.status === 'expired' ? { bgcolor: 'rgba(211,52,56,0.06)' }
                    : item.status === 'expiring_soon' ? { bgcolor: 'rgba(230,126,0,0.06)' } : {}}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.vaultName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.itemName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={item.itemType === 'certificate' ? <LockIcon sx={{ fontSize: 14 }} /> : <KeyIcon sx={{ fontSize: 14 }} />}
                      label={item.itemType}
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{item.resourceGroup}</Typography>
                  </TableCell>
                  <TableCell>{fmtDate(item.expiryDate)}</TableCell>
                  <TableCell>{statusChip(item.status, item.daysUntilExpiry)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!report && !loading && (
        <Alert severity="info">Connect your Azure credentials to load Key Vault expiry data.</Alert>
      )}
    </Box>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const SecretsMonitor: React.FC<SecretsMonitorProps> = ({ credentials }) => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <VpnKeyIcon sx={{ color: '#5c2d91', fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Secrets &amp; Credentials Monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Track expiry for app registration secrets, Key Vault secrets and certificates.
          </Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="App Registration Secrets" icon={<KeyIcon />} iconPosition="start" />
        <Tab label="Key Vault Secrets &amp; Certs" icon={<LockIcon />} iconPosition="start" />
      </Tabs>

      {tab === 0 && <AppSecretsTab credentials={credentials} />}
      {tab === 1 && <KeyVaultExpiryTab credentials={credentials} />}
    </Box>
  );
};

export default SecretsMonitor;

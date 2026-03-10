import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, CircularProgress,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, TablePagination, TextField, InputAdornment, Alert,
  Grid, Skeleton, Select, MenuItem, FormControl, Badge, IconButton,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import StorageIcon from '@mui/icons-material/Storage';
import LinkIcon from '@mui/icons-material/Link';
import { CostData, ResourceCostData, AzureCredentials } from '../types';
import { getResourceCosts, getAzureCosts, getAwsCosts, getGcpCosts, CloudCostSummary } from '../services/api';
import { CloudProvider, CloudCredentials } from './CloudProviderSelectModal';
import {
  DS, SectionHeader, StyledHeadCell, styledRowSx, EmptyState,
  KpiCard, gradCostSx, gradButtonSx, styledTabsSx, fmtCost, fmtDate,
} from '../theme/designSystem';

interface CostsTabProps {
  credentials: AzureCredentials;
  activeProvider?: CloudProvider;
  onChangeProviders?: () => void;
  cloudCredentials?: CloudCredentials;
}

const CHART_COLORS = ['#6C63FF', '#00D2FF', '#FF6B6B', '#FFA500', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const PROVIDER_ACCENT: Record<CloudProvider, string> = {
  azure: '#0078D4',
  aws:   '#FF9900',
  gcp:   '#4285F4',
};

const PROVIDER_HERO_GRADIENT: Record<CloudProvider, string> = {
  azure: 'linear-gradient(135deg, #0078D4 0%, #004e8c 100%)',
  aws:   'linear-gradient(135deg, #FF9900 0%, #c55500 100%)',
  gcp:   'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
};

// ── Normalize CloudCostSummary for shared panel ───────────────────────────────
function normalizeAzure(costs: CostData[]): CloudCostSummary[] {
  return costs.map(c => ({
    accountId:   c.subscriptionId,
    accountName: c.subscriptionName,
    totalCost:   c.totalCost,
    currency:    c.currency,
    startDate:   c.startDate,
    endDate:     c.endDate,
    costsByService: c.costsByService ?? [],
    monthlyCosts:   c.monthlyCosts   ?? [],
  }));
}

// ── Shared cost panel — same cards for Azure, AWS, GCP ───────────────────────
interface ProviderCostPanelProps {
  providerLabel: string;
  accentColor: string;
  heroGradient: string;
  accountLabel: string;       // "Subscription" | "Account"
  data: CloudCostSummary[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  noCredentials?: boolean;
  onConnect?: () => void;
  extraTab?: { label: string; content: React.ReactNode };
}

const ProviderCostPanel: React.FC<ProviderCostPanelProps> = ({
  providerLabel, accentColor, heroGradient, accountLabel, data, loading, error, onRefresh,
  noCredentials, onConnect, extraTab,
}) => {
  const [tab, setTab] = useState(0);
  const [accountFilter, setAccountFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');

  const totalCost  = data.reduce((s, a) => s + Number(a.totalCost || 0), 0);
  const accountCnt = data.length;
  const avgCost    = accountCnt > 0 ? totalCost / accountCnt : 0;

  const uniqueAccounts = useMemo(() => {
    const s = new Set(['All']);
    data.forEach(d => { if (d.accountName) s.add(d.accountName); });
    return Array.from(s);
  }, [data]);

  const uniqueCurrencies = useMemo(() => {
    const s = new Set(['All']);
    data.forEach(d => { if (d.currency) s.add(d.currency); });
    return Array.from(s);
  }, [data]);

  const filtered = useMemo(() => data.filter(d => {
    const matchAcc = accountFilter === 'All' || d.accountName === accountFilter;
    const matchCur = currencyFilter === 'All' || d.currency === currencyFilter;
    return matchAcc && matchCur;
  }), [data, accountFilter, currencyFilter]);

  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(acc => acc.monthlyCosts?.forEach(mc => {
      map.set(mc.month, (map.get(mc.month) || 0) + Number(mc.cost || 0));
    }));
    return Array.from(map.entries())
      .map(([month, cost]) => ({
        month: new Date(month + (month.length === 7 ? '-01' : '')).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cost: Number(cost.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [filtered]);

  const serviceCostData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(acc => acc.costsByService?.forEach(s => {
      if (s.cost > 0) map.set(s.serviceName, (map.get(s.serviceName) || 0) + Number(s.cost));
    }));
    const all = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    if (all.length > 12) {
      const top = all.slice(0, 12);
      const othersSum = all.slice(12).reduce((s, x) => s + x.value, 0);
      if (othersSum > 0) top.push({ name: `Other Services (${all.length - 12})`, value: othersSum });
      return top;
    }
    return all;
  }, [filtered]);

  const activeFilters = (accountFilter !== 'All' ? 1 : 0) + (currencyFilter !== 'All' ? 1 : 0);

  if (noCredentials) {
    return (
      <Card sx={{ mt: 2, textAlign: 'center', p: 5 }}>
        <LinkIcon sx={{ fontSize: 56, color: accentColor, mb: 2, opacity: 0.7 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Connect {providerLabel}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No credentials configured for {providerLabel}. Open Settings to add them.
        </Typography>
        <Button variant="contained" onClick={onConnect}
          sx={{ bgcolor: accentColor, '&:hover': { bgcolor: accentColor, filter: 'brightness(0.88)' } }}>
          Open Settings
        </Button>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>{error}</Alert>}

      {/* ── HERO CARD ── */}
      <Card sx={{
        mb: 3, color: 'white', overflow: 'hidden', position: 'relative',
        background: heroGradient,
        minHeight: 180,
      }}>
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <CardContent sx={{ position: 'relative', p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 54, height: 54, borderRadius: 3, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    <TrendingUpIcon sx={{ fontSize: 30 }} />
                  </Box>
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 2, fontSize: '0.62rem', display: 'block' }}>
                      COST MANAGEMENT
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {providerLabel} Cost Overview ☁
                    </Typography>
                  </Box>
                </Box>
                <Button variant="outlined" size="small"
                  startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={onRefresh} disabled={loading}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                  {loading ? 'Loading…' : 'Refresh'}
                </Button>
              </Box>
              <Box sx={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 3, px: 3, py: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                {loading
                  ? <Skeleton variant="text" width={200} height={60} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} />
                  : <>
                      <Typography variant="caption" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: '0.62rem', display: 'block' }}>
                        TOTAL SPEND · LAST 12 MONTHS
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: '"SF Mono","Fira Code",monospace', letterSpacing: -1 }}>
                        {fmtCost(totalCost)}
                      </Typography>
                    </>}
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, px: 2, py: 1.5, flex: '1 1 110px' }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', fontSize: '0.62rem', letterSpacing: 1 }}>{accountLabel.toUpperCase()}S</Typography>
                  {loading ? <Skeleton variant="text" width={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} /> : <Typography variant="h4" sx={{ fontWeight: 700 }}>{accountCnt}</Typography>}
                </Box>
                <Box sx={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, px: 2, py: 1.5, flex: '1 1 130px' }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', fontSize: '0.62rem', letterSpacing: 1 }}>AVG PER {accountLabel.toUpperCase()}</Typography>
                  {loading ? <Skeleton variant="text" width={80} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} /> : <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmtCost(avgCost)}</Typography>}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── KPI CARDS ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <KpiCard label={`Total ${providerLabel} Spend`} value={fmtCost(totalCost)} subtext="Last 12 months"
            icon={<AccountBalanceWalletIcon />} ringColor={accentColor}
            progress={Math.min((totalCost / 10000) * 100, 100)} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label={`Avg per ${accountLabel}`} value={fmtCost(avgCost)}
            subtext={`Across ${accountCnt} ${accountLabel.toLowerCase()}${accountCnt !== 1 ? 's' : ''}`}
            icon={<CalendarMonthIcon />} ringColor="#00C49F"
            progress={Math.min((avgCost / 5000) * 100, 100)} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label={`${accountLabel}s with Cost`} value={data.length > 0 ? String(data.length) : '—'} subtext="Loaded"
            icon={<StorageIcon />} ringColor="#FF6B6B"
            progress={Math.min((data.length / 20) * 100, 100)} loading={loading} />
        </Grid>
      </Grid>

      {/* ── TREND CHART ── */}
      {!loading && trendData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<TrendingUpIcon />}>Cost Trends Over Time</SectionHeader>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trendData} margin={{ left: 12, right: 24, top: 12, bottom: 12 }}>
                <defs>
                  <linearGradient id={`${providerLabel}Grad`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accentColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#666' }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v: number) => `$${Number(v).toLocaleString()}`} />
                <Tooltip
                  formatter={(v: number) => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Total Cost']}
                  contentStyle={{ borderRadius: '8px', border: DS.border, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="cost" stroke={accentColor} strokeWidth={2.5} fill={`url(#${providerLabel}Grad)`} name="Total Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── SUB-TABS ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={styledTabsSx}>
          <Tab label={`Cost by ${accountLabel}`} />
          <Tab label="Cost by Service" />
          {extraTab && <Tab label={extraTab.label} />}
        </Tabs>
      </Box>

      {/* ── TAB 0: COST BY ACCOUNT ── */}
      {tab === 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<AccountBalanceWalletIcon />}>Cost by {accountLabel}</SectionHeader>
            {loading ? (
              <Box>{[...Array(3)].map((_, i) => <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}><Skeleton variant="rounded" width="38%" height={52} /><Skeleton variant="rounded" width="28%" height={52} /><Skeleton variant="rounded" width="20%" height={52} /><Skeleton variant="rounded" width="14%" height={52} /></Box>)}</Box>
            ) : data.length === 0 ? (
              <EmptyState icon={<AccountBalanceWalletIcon />} title="No cost data available" subtitle="Cost data may take 24–48 hours to appear after resource creation." />
            ) : (
              <TableContainer sx={{ borderRadius: 2, border: DS.border }}>
                <Table sx={{ minWidth: 580 }}>
                  <TableHead>
                    <TableRow>
                      <StyledHeadCell width="36%">{accountLabel}</StyledHeadCell>
                      <StyledHeadCell width="30%">Period</StyledHeadCell>
                      <StyledHeadCell align="right" width="22%">Total Cost</StyledHeadCell>
                      <StyledHeadCell align="center" width="12%">Currency</StyledHeadCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                      <TableCell sx={{ py: 1, px: 1 }}>
                        <FormControl fullWidth size="small">
                          <Select value={accountFilter} displayEmpty onChange={e => setAccountFilter(e.target.value)} sx={{ bgcolor: 'background.paper' }}>
                            {uniqueAccounts.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                          {activeFilters > 0 && <IconButton size="small" onClick={() => { setAccountFilter('All'); setCurrencyFilter('All'); }}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>}
                          {activeFilters > 0 && <Badge badgeContent={activeFilters} color="primary"><FilterListIcon sx={{ fontSize: 16 }} /></Badge>}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 1 }} />
                      <TableCell sx={{ py: 1, px: 1 }}>
                        <FormControl fullWidth size="small">
                          <Select value={currencyFilter} displayEmpty onChange={e => setCurrencyFilter(e.target.value)} sx={{ bgcolor: 'background.paper' }}>
                            {uniqueCurrencies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((row, idx) => (
                      <TableRow key={`${row.accountId}-${idx}`} sx={styledRowSx}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{row.accountName || 'Unnamed'}</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>{row.accountId}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" color="text.secondary">{fmtDate(row.startDate)} – {fmtDate(row.endDate)}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Typography variant="body1" sx={gradCostSx}>{fmtCost(row.totalCost)}</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5 }}>
                          <Chip label={row.currency || 'USD'} size="small" sx={{ background: DS.gradSubtle, border: DS.border, fontWeight: 600, fontSize: '0.7rem' }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 1: COST BY SERVICE ── */}
      {tab === 1 && serviceCostData.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<TrendingUpIcon />}>Cost by Service</SectionHeader>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie data={serviceCostData} cx="42%" cy="50%" outerRadius={150} labelLine={false} dataKey="value">
                  {serviceCostData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Cost']} />
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  wrapperStyle={{ paddingLeft: '10px', fontSize: '11px', maxHeight: '360px', overflowY: 'auto', lineHeight: '1.3' }}
                  iconSize={10} formatter={(v: string) => v.length > 28 ? v.substring(0, 26) + '…' : v} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── EXTRA TAB (Azure resource costs) ── */}
      {extraTab && tab === 2 && extraTab.content}
    </Box>
  );
};

// ── Azure resource-costs sub-tab content ─────────────────────────────────────
interface AzureResourceTabProps {
  credentials: AzureCredentials;
  getSubscriptionName: (id: string) => string;
}

const AzureResourceTab: React.FC<AzureResourceTabProps> = ({ credentials, getSubscriptionName }) => {
  const [resourceCosts, setResourceCosts] = useState<ResourceCostData[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('All');
  const [resourceSubFilter, setResourceSubFilter] = useState('All');
  const [resourceGroupFilter, setResourceGroupFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const ago = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    setStartDate(ago.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchResources = async () => {
    if (!startDate || !endDate) { setError('Select both dates'); return; }
    setLoadingResources(true); setError('');
    try {
      const data = await getResourceCosts(credentials, startDate, endDate);
      setResourceCosts(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load resource cost data');
    } finally { setLoadingResources(false); }
  };

  const uniqueTypes = useMemo(() => { const s = new Set(['All']); resourceCosts.forEach(r => { if (r.resourceType) s.add(r.resourceType); }); return Array.from(s); }, [resourceCosts]);
  const uniqueSubs  = useMemo(() => { const s = new Set(['All']); resourceCosts.forEach(r => { const n = getSubscriptionName(r.resourceId); if (n !== 'Unknown') s.add(n); }); return Array.from(s); }, [resourceCosts, getSubscriptionName]);
  const uniqueGroups = useMemo(() => { const s = new Set(['All']); resourceCosts.forEach(r => { if (r.resourceGroup) s.add(r.resourceGroup); }); return Array.from(s); }, [resourceCosts]);

  const activeFilterCount = (resourceTypeFilter !== 'All' ? 1 : 0) + (resourceSubFilter !== 'All' ? 1 : 0) + (resourceGroupFilter !== 'All' ? 1 : 0);
  const clearFilters = () => { setResourceTypeFilter('All'); setResourceSubFilter('All'); setResourceGroupFilter('All'); setSearchTerm(''); };

  const filtered = useMemo(() => resourceCosts.filter(r => {
    const sm = (r.resourceName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) || (r.resourceType || '').toLowerCase().includes(debouncedSearch.toLowerCase()) || (r.resourceGroup || '').toLowerCase().includes(debouncedSearch.toLowerCase());
    return sm && (resourceTypeFilter === 'All' || r.resourceType === resourceTypeFilter) && (resourceSubFilter === 'All' || getSubscriptionName(r.resourceId) === resourceSubFilter) && (resourceGroupFilter === 'All' || r.resourceGroup === resourceGroupFilter);
  }), [resourceCosts, debouncedSearch, resourceTypeFilter, resourceSubFilter, resourceGroupFilter, getSubscriptionName]);

  const paginated = useMemo(() => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filtered, page, rowsPerPage]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <SectionHeader icon={<StorageIcon />}>Cost by Resource</SectionHeader>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Start Date" type="date" size="small" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="End Date" type="date" size="small" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button fullWidth onClick={fetchResources} disabled={loadingResources} variant="contained" sx={{ height: '40px', ...gradButtonSx }}>
              {loadingResources ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Load Data'}
            </Button>
          </Grid>
        </Grid>

        {loadingResources ? (
          <Box>{[...Array(6)].map((_, i) => <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}><Skeleton variant="rounded" width="26%" height={44} /><Skeleton variant="rounded" width="18%" height={44} /><Skeleton variant="rounded" width="22%" height={44} /><Skeleton variant="rounded" width="18%" height={44} /><Skeleton variant="rounded" width="12%" height={44} /><Skeleton variant="rounded" width="4%" height={44} /></Box>)}</Box>
        ) : resourceCosts.length > 0 ? (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow>
                    <StyledHeadCell width="27%">Resource Name</StyledHeadCell>
                    <StyledHeadCell width="18%">Subscription</StyledHeadCell>
                    <StyledHeadCell width="22%">Type</StyledHeadCell>
                    <StyledHeadCell width="16%">Resource Group</StyledHeadCell>
                    <StyledHeadCell align="right" width="12%">Total Cost</StyledHeadCell>
                    <StyledHeadCell align="center" width="5%">CCY</StyledHeadCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <TextField fullWidth size="small" placeholder="Search name…" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }} sx={{ bgcolor: 'background.paper' }} />
                    </TableCell>
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <FormControl fullWidth size="small"><Select value={resourceSubFilter} displayEmpty onChange={e => { setResourceSubFilter(e.target.value); setPage(0); }} sx={{ bgcolor: 'background.paper' }}>{uniqueSubs.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
                    </TableCell>
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <FormControl fullWidth size="small"><Select value={resourceTypeFilter} displayEmpty onChange={e => { setResourceTypeFilter(e.target.value); setPage(0); }} sx={{ bgcolor: 'background.paper' }}>{uniqueTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
                    </TableCell>
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <FormControl fullWidth size="small"><Select value={resourceGroupFilter} displayEmpty onChange={e => { setResourceGroupFilter(e.target.value); setPage(0); }} sx={{ bgcolor: 'background.paper' }}>{uniqueGroups.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}</Select></FormControl>
                    </TableCell>
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                        {activeFilterCount > 0 && <IconButton size="small" onClick={clearFilters}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>}
                        {activeFilterCount > 0 && <Badge badgeContent={activeFilterCount} color="primary"><FilterListIcon sx={{ fontSize: 16 }} /></Badge>}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1, px: 1 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((r, i) => (
                    <TableRow key={`${r.resourceId}-${i}`} sx={styledRowSx}>
                      <TableCell sx={{ py: 1.5, maxWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: r.resourceName ? 'normal' : 'italic', color: r.resourceName ? 'text.primary' : 'text.disabled' }}>{r.resourceName || '(Unnamed Resource)'}</Typography></TableCell>
                      <TableCell sx={{ py: 1.5, maxWidth: 0 }}><Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getSubscriptionName(r.resourceId)}</Typography></TableCell>
                      <TableCell sx={{ py: 1.5, maxWidth: 0 }}><Chip label={r.resourceType || 'Unknown'} size="small" variant="outlined" sx={{ maxWidth: '100%', fontSize: '0.68rem', height: 22, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} /></TableCell>
                      <TableCell sx={{ py: 1.5, maxWidth: 0 }}><Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.resourceGroup || '—'}</Typography></TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}><Typography variant="body2" sx={gradCostSx}>{fmtCost(r.totalCost)}</Typography></TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}><Chip label={r.currency || 'USD'} size="small" sx={{ background: DS.gradSubtle, border: DS.border, fontWeight: 600, fontSize: '0.65rem', height: 20 }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={filtered.length} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100, 250, 500]}
              sx={{ borderTop: '1px solid', borderColor: 'divider' }} />
            <Box sx={{ mt: 4 }}>
              <SectionHeader icon={<TrendingUpIcon />}>Top 10 Most Expensive Resources</SectionHeader>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={resourceCosts.slice(0, 10).map(r => ({ resourceName: r.resourceName || '(Unnamed)', totalCost: Number(r.totalCost || 0) }))} layout="vertical" margin={{ left: 16, right: 48, top: 0, bottom: 0 }}>
                  <defs><linearGradient id="costBarGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={DS.accent} /><stop offset="100%" stopColor={DS.accent2} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `$${Number(v).toLocaleString()}`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="resourceName" type="category" width={160} tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} />
                  <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Total Cost']} cursor={{ fill: 'rgba(102,126,234,0.07)' }} />
                  <Bar dataKey="totalCost" name="Total Cost" radius={[0, 4, 4, 0]} fill="url(#costBarGrad)" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </>
        ) : (
          <EmptyState icon={<StorageIcon />} title="No resource cost data loaded" subtitle={`Select a date range above and click "Load Data" to view cost breakdown by resource.`} />
        )}
      </CardContent>
    </Card>
  );
};

// ── Main CostsTab ─────────────────────────────────────────────────────────────
const CostsTab: React.FC<CostsTabProps> = ({
  credentials,
  activeProvider = 'azure',
  onChangeProviders,
  cloudCredentials,
}) => {
  // ── Azure state ──
  const [azureCosts, setAzureCosts] = useState<CostData[]>([]);
  const [azureLoading, setAzureLoading] = useState(false);
  const [azureError, setAzureError] = useState('');

  // ── AWS state ──
  const [awsData, setAwsData] = useState<CloudCostSummary[]>([]);
  const [awsLoading, setAwsLoading] = useState(false);
  const [awsError, setAwsError] = useState('');

  // ── GCP state ──
  const [gcpData, setGcpData] = useState<CloudCostSummary[]>([]);
  const [gcpLoading, setGcpLoading] = useState(false);
  const [gcpError, setGcpError] = useState('');

  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  const fetchAzure = useCallback(async (force = false) => {
    setAzureLoading(true); setAzureError('');
    try {
      const data = await getAzureCosts(credentialsRef.current, force);
      setAzureCosts(data);
    } catch (err: any) {
      setAzureError(err.response?.data?.error || err.message || 'Failed to fetch Azure costs');
    } finally { setAzureLoading(false); }
  }, []);

  const fetchAws = useCallback(async () => {
    const creds = cloudCredentials?.aws;
    if (!creds?.accessKeyId) return;
    setAwsLoading(true); setAwsError('');
    try {
      const data = await getAwsCosts({ accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, region: creds.region || 'us-east-1' });
      setAwsData(data);
    } catch (err: any) {
      setAwsError(err.response?.data?.error || err.message || 'Failed to fetch AWS costs');
    } finally { setAwsLoading(false); }
  }, [cloudCredentials?.aws]);

  const fetchGcp = useCallback(async () => {
    const creds = cloudCredentials?.gcp;
    if (!creds?.serviceAccountJson) return;
    setGcpLoading(true); setGcpError('');
    try {
      const data = await getGcpCosts({ serviceAccountJson: creds.serviceAccountJson });
      setGcpData(data);
    } catch (err: any) {
      setGcpError(err.response?.data?.error || err.message || 'Failed to fetch GCP costs');
    } finally { setGcpLoading(false); }
  }, [cloudCredentials?.gcp]);

  // Auto-fetch on mount / credential change
  useEffect(() => { fetchAzure(); }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cloudCredentials?.aws?.accessKeyId && awsData.length === 0) fetchAws(); }, [cloudCredentials?.aws?.accessKeyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cloudCredentials?.gcp?.serviceAccountJson && gcpData.length === 0) fetchGcp(); }, [cloudCredentials?.gcp?.serviceAccountJson]); // eslint-disable-line react-hooks/exhaustive-deps

  const getSubscriptionName = useCallback((resourceId: string): string => {
    const match = resourceId.match(/\/subscriptions\/([^/]+)/);
    if (match?.[1]) {
      const sub = credentials.subscriptions?.find(s => s.subscriptionId === match[1]);
      return sub?.displayName || match[1].substring(0, 8) + '…';
    }
    return 'Unknown';
  }, [credentials.subscriptions]);

  const azureNormalized = useMemo(() => normalizeAzure(azureCosts), [azureCosts]);

  return (
    <Box sx={{ pb: 4 }}>
      {activeProvider === 'azure' && (
        <ProviderCostPanel
          providerLabel="Azure"
          accentColor={PROVIDER_ACCENT.azure}
          heroGradient={PROVIDER_HERO_GRADIENT.azure}
          accountLabel="Subscription"
          data={azureNormalized}
          loading={azureLoading}
          error={azureError}
          onRefresh={() => fetchAzure(true)}
          extraTab={{
            label: 'Cost by Resource',
            content: <AzureResourceTab credentials={credentials} getSubscriptionName={getSubscriptionName} />,
          }}
        />
      )}

      {activeProvider === 'aws' && (
        <ProviderCostPanel
          providerLabel="AWS"
          accentColor={PROVIDER_ACCENT.aws}
          heroGradient={PROVIDER_HERO_GRADIENT.aws}
          accountLabel="Account"
          data={awsData}
          loading={awsLoading}
          error={awsError}
          onRefresh={fetchAws}
          noCredentials={!cloudCredentials?.aws?.accessKeyId}
          onConnect={onChangeProviders}
        />
      )}

      {activeProvider === 'gcp' && (
        <ProviderCostPanel
          providerLabel="GCP"
          accentColor={PROVIDER_ACCENT.gcp}
          heroGradient={PROVIDER_HERO_GRADIENT.gcp}
          accountLabel="Account"
          data={gcpData}
          loading={gcpLoading}
          error={gcpError}
          onRefresh={fetchGcp}
          noCredentials={!cloudCredentials?.gcp?.serviceAccountJson}
          onConnect={onChangeProviders}
        />
      )}
    </Box>
  );
};

export default CostsTab;

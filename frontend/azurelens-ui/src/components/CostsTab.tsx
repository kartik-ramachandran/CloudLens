import React, { useState, useEffect, useRef,useMemo, useCallback } from 'react';
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
import { CostData, ResourceCostData, AzureCredentials } from '../types';
import { getResourceCosts, getAzureCosts } from '../services/api';
import {
  DS, SectionHeader, StyledHeadCell, styledRowSx, EmptyState,
  KpiCard, gradCostSx, gradButtonSx, styledTabsSx, fmtCost, fmtDate,
} from '../theme/designSystem';

interface CostsTabProps {
  credentials: AzureCredentials;
}

const CHART_COLORS = ['#6C63FF', '#00D2FF', '#FF6B6B', '#FFA500', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CostsTab: React.FC<CostsTabProps> = ({ credentials }) => {
  const [costs, setCosts] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [resourceCosts, setResourceCosts] = useState<ResourceCostData[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [resourceStartDate, setResourceStartDate] = useState('');
  const [resourceEndDate, setResourceEndDate] = useState('');
  
  // Filters for Tab 0 (Subscription Costs)
  const [subscriptionFilter, setSubscriptionFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  
  // Filters for Tab 1 (Resource Costs)
  const [resourceTypeFilter, setResourceTypeFilter] = useState('All');
  const [resourceSubFilter, setResourceSubFilter] = useState('All');
  const [resourceGroupFilter, setResourceGroupFilter] = useState('All');

  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCosts = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await getAzureCosts(credentialsRef.current, forceRefresh);
      setCosts(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch costs');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCosts(); }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  useEffect(() => {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    setResourceStartDate(threeMonthsAgo.toISOString().split('T')[0]);
    setResourceEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Compute unique values for Tab 0 filters
  const uniqueSubscriptions = useMemo(() => {
    const subs = new Set<string>();
    subs.add('All');
    costs.forEach(c => {
      if (c.subscriptionName) subs.add(c.subscriptionName);
    });
    return Array.from(subs);
  }, [costs]);

  const uniqueCurrencies = useMemo(() => {
    const curr = new Set<string>();
    curr.add('All');
    costs.forEach(c => {
      if (c.currency) curr.add(c.currency);
    });
    return Array.from(curr);
  }, [costs]);

  // Compute active filter count for Tab 0
  const activeFilterCountTab0 = useMemo(() => {
    let count = 0;
    if (subscriptionFilter !== 'All') count++;
    if (currencyFilter !== 'All') count++;
    return count;
  }, [subscriptionFilter, currencyFilter]);

  // Clear all filters for Tab 0
  const clearFiltersTab0 = useCallback(() => {
    setSubscriptionFilter('All');
    setCurrencyFilter('All');
  }, []);

  // Filtered costs for Tab 0
  const filteredCosts = useMemo(() => {
    return costs.filter(c => {
      const matchesSubscription = subscriptionFilter === 'All' || c.subscriptionName === subscriptionFilter;
      const matchesCurrency = currencyFilter === 'All' || c.currency === currencyFilter;
      return matchesSubscription && matchesCurrency;
    });
  }, [costs, subscriptionFilter, currencyFilter]);

  const totalCost = filteredCosts.reduce((sum, c) => sum + Number(c.totalCost || 0), 0);
  const avgPerSub = filteredCosts.length > 0 ? totalCost / filteredCosts.length : 0;
  const subCount = filteredCosts.length;

  const getSubscriptionName = useCallback((resourceId: string): string => {
    const match = resourceId.match(/\/subscriptions\/([^/]+)/);
    if (match?.[1]) {
      const sub = credentials.subscriptions?.find(s => s.subscriptionId === match[1]);
      return sub?.displayName || match[1].substring(0, 8) + '…';
    }
    return 'Unknown';
  }, [credentials.subscriptions]);

  const fetchResourceCosts = async () => {
    if (!resourceStartDate || !resourceEndDate) {
      setError('Please select both start and end dates');
      return;
    }
    setLoadingResources(true);
    setError('');
    try {
      const data = await getResourceCosts(credentials, resourceStartDate, resourceEndDate);
      setResourceCosts(data);
    } catch (err: any) {
      setError(
        err.response?.status === 401
          ? 'Session expired. Please reconnect.'
          : err.response?.data?.error || err.message || 'Failed to load resource cost data'
      );
    } finally {
      setLoadingResources(false);
    }
  };

  // Compute unique values for Tab 1 filters
  const uniqueResourceTypes = useMemo(() => {
    const types = new Set<string>();
    types.add('All');
    resourceCosts.forEach(r => {
      if (r.resourceType) types.add(r.resourceType);
    });
    return Array.from(types);
  }, [resourceCosts]);

  const uniqueResourceSubs = useMemo(() => {
    const subs = new Set<string>();
    subs.add('All');
    resourceCosts.forEach(r => {
      const subName = getSubscriptionName(r.resourceId);
      if (subName && subName !== 'Unknown') subs.add(subName);
    });
    return Array.from(subs);
  }, [resourceCosts, getSubscriptionName]);

  const uniqueResourceGroups = useMemo(() => {
    const groups = new Set<string>();
    groups.add('All');
    resourceCosts.forEach(r => {
      if (r.resourceGroup) groups.add(r.resourceGroup);
    });
    return Array.from(groups);
  }, [resourceCosts]);

  // Compute active filter count for Tab 1
  const activeFilterCountTab1 = useMemo(() => {
    let count = 0;
    if (resourceTypeFilter !== 'All') count++;
    if (resourceSubFilter !== 'All') count++;
    if (resourceGroupFilter !== 'All') count++;
    return count;
  }, [resourceTypeFilter, resourceSubFilter, resourceGroupFilter]);

  // Clear all filters for Tab 1
  const clearFiltersTab1 = useCallback(() => {
    setResourceTypeFilter('All');
    setResourceSubFilter('All');
    setResourceGroupFilter('All');
    setSearchTerm('');
  }, []);

  const filteredResources = useMemo(() => {
    return resourceCosts.filter(r => {
      const searchMatch = (r.resourceName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (r.resourceType || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (r.resourceGroup || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesType = resourceTypeFilter === 'All' || r.resourceType === resourceTypeFilter;
      const matchesSub = resourceSubFilter === 'All' || getSubscriptionName(r.resourceId) === resourceSubFilter;
      const matchesGroup = resourceGroupFilter === 'All' || r.resourceGroup === resourceGroupFilter;
      
      return searchMatch && matchesType && matchesSub && matchesGroup;
    });
  }, [resourceCosts, debouncedSearchTerm, resourceTypeFilter, resourceSubFilter, resourceGroupFilter, getSubscriptionName]);

  const paginatedResources = useMemo(() => {
    return filteredResources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredResources, page, rowsPerPage]);

  // Aggregate service costs from all filtered subscriptions
  const serviceCostData = useMemo(() => {
    const serviceMap = new Map<string, number>();
    filteredCosts.forEach(cost => {
      cost.costsByService?.forEach(s => {
        if (s.cost > 0) {
          const current = serviceMap.get(s.serviceName) || 0;
          serviceMap.set(s.serviceName, current + Number(s.cost));
        }
      });
    });
    return Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCosts]);

  // Compute trend data from monthly costs
  const trendData = useMemo(() => {
    const monthMap = new Map<string, number>();
    filteredCosts.forEach(cost => {
      cost.monthlyCosts?.forEach(mc => {
        const current = monthMap.get(mc.month) || 0;
        monthMap.set(mc.month, current + Number(mc.cost || 0));
      });
    });
    return Array.from(monthMap.entries())
      .map(([month, cost]) => ({ 
        month: new Date(month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cost: Number(cost.toFixed(2))
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [filteredCosts]);

  return (
    <Box sx={{ pb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* ── GLASSMORPHISM HERO CARD ── */}
      <Card sx={{
        mb: 3, color: 'white', overflow: 'hidden', position: 'relative',
        background: DS.gradHero, minHeight: 200,
      }}>
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -40, right: 100, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <CardContent sx={{ position: 'relative', p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 54, height: 54, borderRadius: 3,
                    background: 'rgba(255,255,255,0.14)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}>
                    <TrendingUpIcon sx={{ fontSize: 30 }} />
                  </Box>
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 2, fontSize: '0.62rem', display: 'block' }}>
                      COST MANAGEMENT
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      Azure Cost Overview
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined" size="small"
                  startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={() => fetchCosts(true)} disabled={loading}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  {loading ? 'Loading…' : 'Refresh'}
                </Button>
              </Box>

              <Box sx={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 3, px: 3, py: 2,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}>
                {loading
                  ? <Skeleton variant="text" width={200} height={60} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} />
                  : <>
                      <Typography variant="caption" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: '0.62rem', display: 'block' }}>
                        TOTAL SPEND · LAST 30 DAYS
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: '"SF Mono","Fira Code",monospace', letterSpacing: -1 }}>
                        {fmtCost(totalCost)}
                      </Typography>
                    </>
                }
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, px: 2, py: 1.5, flex: '1 1 110px' }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', fontSize: '0.62rem', letterSpacing: 1 }}>SUBSCRIPTIONS</Typography>
                  {loading
                    ? <Skeleton variant="text" width={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                    : <Typography variant="h4" sx={{ fontWeight: 700 }}>{subCount}</Typography>
                  }
                </Box>
                <Box sx={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, px: 2, py: 1.5, flex: '1 1 130px' }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', fontSize: '0.62rem', letterSpacing: 1 }}>AVG PER SUB</Typography>
                  {loading
                    ? <Skeleton variant="text" width={80} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                    : <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmtCost(avgPerSub)}</Typography>
                  }
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── KPI CARDS ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Total Azure Spend" value={fmtCost(totalCost)} subtext="Last 30 days"
            icon={<AccountBalanceWalletIcon />} ringColor={DS.accent}
            progress={Math.min((totalCost / 10000) * 100, 100)} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Avg per Subscription" value={fmtCost(avgPerSub)}
            subtext={`Across ${subCount} sub${subCount !== 1 ? 's' : ''}`}
            icon={<CalendarMonthIcon />} ringColor="#00C49F"
            progress={Math.min((avgPerSub / 5000) * 100, 100)} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Resources w/ Cost"
            value={resourceCosts.length > 0 ? String(resourceCosts.length) : '—'} subtext="Loaded for period"
            icon={<StorageIcon />} ringColor="#FF6B6B"
            progress={Math.min((resourceCosts.length / 100) * 100, 100)} loading={loading} />
        </Grid>
      </Grid>

      {/* ── COST TRENDS CHART ── */}
      {!loading && trendData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<TrendingUpIcon />}>Cost Trends Over Time</SectionHeader>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trendData} margin={{ left: 12, right: 24, top: 12, bottom: 12 }}>
                <defs>
                  <linearGradient id="costTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={DS.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={DS.accent} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#666' }} 
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#666' }} 
                  tickFormatter={(v: number) => `$${Number(v).toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(v: number) => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Total Cost']}
                  contentStyle={{ borderRadius: '8px', border: DS.border, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stroke={DS.accent} 
                  strokeWidth={2.5}
                  fill="url(#costTrendGrad)" 
                  name="Total Cost"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── TABS ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={styledTabsSx}>
          <Tab label="Current Costs" />
          <Tab label="Cost by Resource" />
        </Tabs>
      </Box>

      {/* ── TAB 0: CURRENT COSTS ── */}
      {tabValue === 0 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<AccountBalanceWalletIcon />}>Cost by Subscription</SectionHeader>

              {loading ? (
                <Box>
                  {[...Array(3)].map((_, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                      <Skeleton variant="rounded" width="38%" height={52} />
                      <Skeleton variant="rounded" width="28%" height={52} />
                      <Skeleton variant="rounded" width="20%" height={52} />
                      <Skeleton variant="rounded" width="14%" height={52} />
                    </Box>
                  ))}
                </Box>
              ) : costs.length === 0 ? (
                <EmptyState
                  icon={<AccountBalanceWalletIcon />}
                  title="No cost data available"
                  subtitle="Cost data may take 24–48 hours to appear after resource creation."
                />
              ) : (
                <TableContainer sx={{ borderRadius: 2, border: DS.border }}>
                  <Table sx={{ minWidth: 580 }}>
                    <TableHead>
                      <TableRow>
                        <StyledHeadCell width="36%">Subscription</StyledHeadCell>
                        <StyledHeadCell width="30%">Period</StyledHeadCell>
                        <StyledHeadCell align="right" width="22%">Total Cost</StyledHeadCell>
                        <StyledHeadCell align="center" width="12%">Currency</StyledHeadCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'background.default' }}>
                        <TableCell sx={{ py: 1, px: 1 }}>
                          <FormControl fullWidth size="small">
                            <Select 
                              value={subscriptionFilter} 
                              displayEmpty
                              onChange={e => setSubscriptionFilter(e.target.value)}
                              sx={{ bgcolor: 'background.paper' }}
                            >
                              {uniqueSubscriptions.map(sub => (
                                <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            {activeFilterCountTab0 > 0 && (
                              <IconButton size="small" onClick={clearFiltersTab0} title="Clear all filters">
                                <ClearIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                            {activeFilterCountTab0 > 0 && (
                              <Badge badgeContent={activeFilterCountTab0} color="primary">
                                <FilterListIcon sx={{ fontSize: 16 }} />
                              </Badge>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1 }} />
                        <TableCell sx={{ py: 1, px: 1 }}>
                          <FormControl fullWidth size="small">
                            <Select 
                              value={currencyFilter} 
                              displayEmpty
                              onChange={e => setCurrencyFilter(e.target.value)}
                              sx={{ bgcolor: 'background.paper' }}
                            >
                              {uniqueCurrencies.map(curr => (
                                <MenuItem key={curr} value={curr}>{curr}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCosts.map((cost, idx) => (
                        <TableRow key={`${cost.subscriptionId}-${idx}`} sx={styledRowSx}>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                              {cost.subscriptionName || 'Unnamed Subscription'}
                            </Typography>
                            <Typography variant="caption" color="text.disabled"
                              sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>
                              {cost.subscriptionId}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {fmtDate(cost.startDate)} – {fmtDate(cost.endDate)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>
                            <Typography variant="body1" sx={gradCostSx}>{fmtCost(cost.totalCost)}</Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <Chip label={cost.currency || 'USD'} size="small" sx={{
                              background: DS.gradSubtle, border: DS.border,
                              fontWeight: 600, fontSize: '0.7rem',
                            }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {serviceCostData.length > 0 && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<TrendingUpIcon />}>Cost by Service</SectionHeader>
                <ResponsiveContainer width="100%" height={420}>
                  <PieChart>
                    <Pie
                      data={serviceCostData} cx="40%" cy="50%"
                      outerRadius={140} innerRadius={55} paddingAngle={2}
                      labelLine={false} dataKey="value"
                    >
                      {serviceCostData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Cost']} />
                    <Legend
                      layout="vertical" align="right" verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: '20px', fontSize: '13px' }}
                      formatter={(v: string) => v.length > 30 ? v.substring(0, 28) + '…' : v}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ── TAB 1: COST BY RESOURCE ── */}
      {tabValue === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<StorageIcon />}>Cost by Resource</SectionHeader>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Start Date" type="date" size="small"
                  value={resourceStartDate} onChange={e => setResourceStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }} variant="outlined" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="End Date" type="date" size="small"
                  value={resourceEndDate} onChange={e => setResourceEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }} variant="outlined" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button fullWidth onClick={fetchResourceCosts} disabled={loadingResources}
                  variant="contained" sx={{ height: '40px', ...gradButtonSx }}>
                  {loadingResources ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Load Data'}
                </Button>
              </Grid>
            </Grid>

            {loadingResources ? (
              <Box>
                {[...Array(6)].map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <Skeleton variant="rounded" width="26%" height={44} />
                    <Skeleton variant="rounded" width="18%" height={44} />
                    <Skeleton variant="rounded" width="22%" height={44} />
                    <Skeleton variant="rounded" width="18%" height={44} />
                    <Skeleton variant="rounded" width="12%" height={44} />
                    <Skeleton variant="rounded" width="4%"  height={44} />
                  </Box>
                ))}
              </Box>
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
                          <TextField
                            fullWidth
                            size="small" 
                            variant="outlined"
                            placeholder="Search name…"
                            value={searchTerm} 
                            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon sx={{ fontSize: 16 }} />
                                </InputAdornment>
                              ),
                            }}
                            sx={{ bgcolor: 'background.paper' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1 }}>
                          <FormControl fullWidth size="small">
                            <Select 
                              value={resourceSubFilter} 
                              displayEmpty
                              onChange={e => { setResourceSubFilter(e.target.value); setPage(0); }}
                              sx={{ bgcolor: 'background.paper' }}
                            >
                              {uniqueResourceSubs.map(sub => (
                                <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1 }}>
                          <FormControl fullWidth size="small">
                            <Select 
                              value={resourceTypeFilter} 
                              displayEmpty
                              onChange={e => { setResourceTypeFilter(e.target.value); setPage(0); }}
                              sx={{ bgcolor: 'background.paper' }}
                            >
                              {uniqueResourceTypes.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1 }}>
                          <FormControl fullWidth size="small">
                            <Select 
                              value={resourceGroupFilter} 
                              displayEmpty
                              onChange={e => { setResourceGroupFilter(e.target.value); setPage(0); }}
                              sx={{ bgcolor: 'background.paper' }}
                            >
                              {uniqueResourceGroups.map(group => (
                                <MenuItem key={group} value={group}>{group}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            {activeFilterCountTab1 > 0 && (
                              <IconButton size="small" onClick={clearFiltersTab1} title="Clear all filters">
                                <ClearIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                            {activeFilterCountTab1 > 0 && (
                              <Badge badgeContent={activeFilterCountTab1} color="primary">
                                <FilterListIcon sx={{ fontSize: 16 }} />
                              </Badge>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedResources.map((r, i) => (
                        <TableRow key={`${r.resourceId}-${i}`} sx={styledRowSx}>
                          <TableCell sx={{ py: 1.5, maxWidth: 0 }}>
                            <Typography variant="body2" sx={{
                              fontWeight: 600, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontStyle: r.resourceName ? 'normal' : 'italic',
                              color: r.resourceName ? 'text.primary' : 'text.disabled',
                            }}>
                              {r.resourceName || '(Unnamed Resource)'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5, maxWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary"
                              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getSubscriptionName(r.resourceId)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5, maxWidth: 0 }}>
                            <Chip label={r.resourceType || 'Unknown'} size="small" variant="outlined"
                              sx={{
                                maxWidth: '100%', fontSize: '0.68rem', height: 22,
                                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                              }} />
                          </TableCell>
                          <TableCell sx={{ py: 1.5, maxWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary"
                              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.resourceGroup || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={gradCostSx}>{fmtCost(r.totalCost)}</Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.5 }}>
                            <Chip label={r.currency || 'USD'} size="small" sx={{
                              background: DS.gradSubtle, border: DS.border,
                              fontWeight: 600, fontSize: '0.65rem', height: 20,
                            }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div" count={filteredResources.length} page={page}
                  onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[10, 25, 50, 100, 250, 500]}
                  sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                />

                <Box sx={{ mt: 4 }}>
                  <SectionHeader icon={<TrendingUpIcon />}>Top 10 Most Expensive Resources</SectionHeader>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={resourceCosts.slice(0, 10).map(r => ({
                        resourceName: r.resourceName || '(Unnamed)',
                        totalCost: Number(r.totalCost || 0),
                      }))}
                      layout="vertical"
                      margin={{ left: 16, right: 48, top: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="costBarGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={DS.accent} />
                          <stop offset="100%" stopColor={DS.accent2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `$${Number(v).toLocaleString()}`} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="resourceName" type="category" width={160} tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} />
                      <Tooltip
                        formatter={(v: number) => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Total Cost']}
                        cursor={{ fill: 'rgba(102,126,234,0.07)' }}
                      />
                      <Bar dataKey="totalCost" name="Total Cost" radius={[0, 4, 4, 0]} fill="url(#costBarGrad)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </>
            ) : (
              <EmptyState
                icon={<StorageIcon />}
                title="No resource cost data loaded"
                subtitle={`Select a date range above and click "Load Data" to view cost breakdown by resource.`}
              />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CostsTab;

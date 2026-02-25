import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, Alert,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tab, Tabs, Tooltip,
  Select, MenuItem, FormControl, InputLabel, TextField, Checkbox, IconButton,
  Snackbar
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import SavingsIcon from '@mui/icons-material/Savings';
import TimelineIcon from '@mui/icons-material/Timeline';
import LabelIcon from '@mui/icons-material/Label';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { AzureCredentials, FinOpsMetrics, WastedResource, AdvisorRecommendation, CostForecast, CostAnomaly, TagComplianceReport } from '../types';
import {
  getFinOpsMetrics, getWastedResources, getAdvisorRecommendations,
  getCostForecast, getCostAnomalies, getTagCompliance, getFinOpsAIInsights,
  applyBulkTags, exportTagViolationsCsv, getAITagSuggestions
} from '../services/api';
import {
  DS, SectionHeader, StyledHeadCell, styledRowSx, EmptyState,
  KpiCard, gradButtonSx, styledTabsSx, fmtCost,
} from '../theme/designSystem';

interface FinOpsDashboardProps {
  credentials: AzureCredentials;
}

const FinOpsDashboard: React.FC<FinOpsDashboardProps> = ({ credentials }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [metrics, setMetrics] = useState<FinOpsMetrics | null>(null);
  const [wastedResources, setWastedResources] = useState<WastedResource[]>([]);
  const [advisorRecs, setAdvisorRecs] = useState<AdvisorRecommendation[]>([]);
  const [forecast, setForecast] = useState<CostForecast[]>([]);
  const [anomalies, setAnomalies] = useState<CostAnomaly[]>([]);
  const [tagReport, setTagReport] = useState<TagComplianceReport | null>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsightType, setAiInsightType] = useState('General');

  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [tagOperationLoading, setTagOperationLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const [resourceTagEdits, setResourceTagEdits] = useState<{ [resourceId: string]: { [key: string]: string } }>({});
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editTagKey, setEditTagKey] = useState('');
  const [editTagValue, setEditTagValue] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: fetch metrics first — this warms the backend cost/resource cache so
      // the subsequent calls hit the cache instead of the Azure Cost Management API
      // simultaneously (which causes rate-limiting and $0 results).
      const metricsResult = await getFinOpsMetrics(credentials).catch(() => null);
      if (metricsResult) setMetrics(metricsResult);

      // Step 2: now fetch the rest — wasted resources and anomalies will use the
      // cached cost data; advisor and tag compliance don't need the cost cache.
      const [wasteData, advisorData, forecastData, anomalyData, tagData] = await Promise.allSettled([
        getWastedResources(credentials),
        getAdvisorRecommendations(credentials, 'Cost'),
        getCostForecast(credentials),
        getCostAnomalies(credentials),
        getTagCompliance(credentials)
      ]);

      const resolvedWaste = wasteData.status === 'fulfilled' ? wasteData.value : null;
      const resolvedAdvisor = advisorData.status === 'fulfilled' ? advisorData.value : null;

      if (resolvedWaste) setWastedResources(resolvedWaste);
      if (resolvedAdvisor) setAdvisorRecs(resolvedAdvisor);
      if (forecastData.status === 'fulfilled') setForecast(forecastData.value);
      if (anomalyData.status === 'fulfilled') setAnomalies(anomalyData.value);
      if (tagData.status === 'fulfilled') setTagReport(tagData.value);

      // Reconcile KPI totals: if getFinOpsMetrics returned $0 (cost cache was cold on
      // that first call), patch the metrics from the now-resolved wasted-resources data.
      const actualWaste = resolvedWaste
        ? resolvedWaste.reduce((sum, r) => sum + r.estimatedMonthlyCost, 0)
        : 0;
      const advisorMonthlySavings = resolvedAdvisor
        ? resolvedAdvisor.reduce((sum, a) => sum + (a.annualSavingsAmount ?? 0) / 12, 0)
        : 0;

      if (actualWaste > 0) {
        setMetrics(prev => prev
          ? {
              ...prev,
              totalWaste: actualWaste,
              wastedResourceCount: resolvedWaste!.length,
              potentialMonthlySavings: actualWaste + advisorMonthlySavings,
              advisorRecommendationCount: resolvedAdvisor?.length ?? prev.advisorRecommendationCount,
            }
          : prev
        );
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load FinOps data');
    } finally {
      setLoading(false);
    }
  };

  const handleGetAIInsights = async () => {
    setAiLoading(true);
    try {
      const insights = await getFinOpsAIInsights(credentials, aiInsightType);
      setAiInsights(insights);
    } catch (e: any) {
      setError(e.message || 'Failed to generate AI insights');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await exportTagViolationsCsv(credentials, tagReport?.requiredTags);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tag-violations-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSnackbarMessage('Export completed successfully!');
      setSnackbarOpen(true);
    } catch (e: any) {
      setError(e.message || 'Failed to export CSV');
    }
  };

  const handleGetAISuggestions = async () => {
    if (selectedResources.length === 0) { setError('Please select at least one resource'); return; }
    setAiSuggestionsLoading(true);
    try {
      const suggestions = await getAITagSuggestions(credentials, selectedResources);
      setAiSuggestions(suggestions);
      const edits: { [resourceId: string]: { [key: string]: string } } = {};
      suggestions.forEach((s: any) => { edits[s.resourceId] = { ...s.suggestedTags }; });
      setResourceTagEdits(edits);
      setSnackbarMessage(`Generated ${suggestions.length} AI tag suggestions. Review and apply!`);
      setSnackbarOpen(true);
    } catch (e: any) {
      setError(e.message || 'Failed to generate AI suggestions');
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  const handleApplyAllSuggestions = async () => {
    if (Object.keys(resourceTagEdits).length === 0) { setError('No tag edits to apply'); return; }
    setTagOperationLoading(true);
    try {
      let successCount = 0, failureCount = 0;
      for (const [resourceId, tags] of Object.entries(resourceTagEdits)) {
        try { await applyBulkTags(credentials, [resourceId], tags, false); successCount++; }
        catch { failureCount++; }
      }
      setSnackbarMessage(`Applied tags: ${successCount} succeeded, ${failureCount} failed`);
      setSnackbarOpen(true);
      setResourceTagEdits({});
      setAiSuggestions([]);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Failed to apply suggestions');
    } finally {
      setTagOperationLoading(false);
    }
  };

  const handleApplySingleResource = async (resourceId: string) => {
    const tags = resourceTagEdits[resourceId];
    if (!tags || Object.keys(tags).length === 0) { setError('No tags to apply for this resource'); return; }
    setTagOperationLoading(true);
    try {
      await applyBulkTags(credentials, [resourceId], tags, false);
      const newEdits = { ...resourceTagEdits };
      delete newEdits[resourceId];
      setResourceTagEdits(newEdits);
      setSnackbarMessage('Tags applied successfully!');
      setSnackbarOpen(true);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Failed to apply tags');
    } finally {
      setTagOperationLoading(false);
    }
  };

  const handleAddTagToResource = (resourceId: string) => {
    if (!editTagKey || !editTagValue) return;
    setResourceTagEdits({ ...resourceTagEdits, [resourceId]: { ...(resourceTagEdits[resourceId] || {}), [editTagKey]: editTagValue } });
    setEditTagKey(''); setEditTagValue(''); setEditingResourceId(null);
  };

  const handleRemoveTagFromResource = (resourceId: string, tagKey: string) => {
    const currentTags = { ...resourceTagEdits[resourceId] };
    delete currentTags[tagKey];
    if (Object.keys(currentTags).length === 0) {
      const newEdits = { ...resourceTagEdits }; delete newEdits[resourceId]; setResourceTagEdits(newEdits);
    } else {
      setResourceTagEdits({ ...resourceTagEdits, [resourceId]: currentTags });
    }
  };

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResources(prev => prev.includes(resourceId) ? prev.filter(id => id !== resourceId) : [...prev, resourceId]);
  };

  const toggleSelectAll = () => {
    if (!tagReport) return;
    setSelectedResources(selectedResources.length === tagReport.violations.length ? [] : tagReport.violations.map(v => v.resourceId));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  const severityColor = (sev: string) =>
    sev === 'High' ? '#d13438' : sev === 'Medium' ? '#ff8c00' : '#107c10';

  const formatCurrency = (val: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val || 0);

  const trendIcon = (dir: string) =>
    dir === 'Increasing' ? <TrendingUpIcon sx={{ color: '#d13438', fontSize: 18 }} /> :
    dir === 'Decreasing' ? <TrendingDownIcon sx={{ color: '#107c10', fontSize: 18 }} /> : null;

  const chartData = forecast.flatMap(f => f.forecastPoints).sort((a, b) => a.month.localeCompare(b.month));

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ pb: 4 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 1.5, fontSize: '0.65rem' }}>
            COST INTELLIGENCE
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>FinOps &amp; Cost Optimization</Typography>
        </Box>
        <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={loadAll} disabled={loading}
          sx={{ borderColor: DS.borderColor, color: DS.accent, '&:hover': { borderColor: DS.accent, background: DS.gradSubtle } }}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── KPI CARDS ── */}
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Estimated Monthly Waste" value={formatCurrency(metrics.totalWaste)}
              subtext={`${metrics.wastedResourceCount} wasted resources`}
              icon={<DeleteSweepIcon />} ringColor="#d13438"
              progress={Math.min((metrics.totalWaste / 5000) * 100, 100)} loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Savings Opportunity" value={`${formatCurrency(metrics.potentialMonthlySavings)}/mo`}
              subtext={`${metrics.advisorRecommendationCount} Advisor recs`}
              icon={<SavingsIcon />} ringColor="#107c10"
              progress={Math.min((metrics.potentialMonthlySavings / 3000) * 100, 100)} loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Tag Coverage"
              value={`${(tagReport?.tagCoveragePercent ?? 0).toFixed(0)}%`}
              subtext="of resources are tagged"
              icon={<LabelIcon />} ringColor="#0078d4"
              progress={tagReport?.tagCoveragePercent ?? 0} loading={loading} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Cost Anomalies" value={String(anomalies.length)}
              subtext="services with unusual spend"
              icon={<WarningAmberIcon />} ringColor="#ff8c00"
              progress={Math.min(anomalies.length * 10, 100)} loading={loading} />
          </Grid>
        </Grid>
      )}

      {/* ── TABS ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={styledTabsSx}>
          <Tab label="Waste Detection" />
          <Tab label="Azure Advisor" />
          <Tab label="Cost Forecast" />
          <Tab label="Anomalies" />
          <Tab label="Tag Compliance" />
          <Tab label="AI FinOps Insights" />
        </Tabs>
      </Box>

      {/* ── TAB 0: WASTE DETECTION ── */}
      {activeTab === 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<DeleteSweepIcon />}>Wasted Resources</SectionHeader>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <StyledHeadCell>Resource</StyledHeadCell>
                    <StyledHeadCell>Type</StyledHeadCell>
                    <StyledHeadCell>Waste Reason</StyledHeadCell>
                    <StyledHeadCell align="right">Est. Monthly Cost</StyledHeadCell>
                    <StyledHeadCell align="center">Severity</StyledHeadCell>
                    <StyledHeadCell>Recommendation</StyledHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wastedResources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        {loading ? 'Loading…' : 'No wasted resources detected'}
                      </TableCell>
                    </TableRow>
                  ) : wastedResources.map((r, i) => (
                    <TableRow key={`waste-${r.resourceId || i}`} sx={styledRowSx}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.resourceName}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{r.resourceType.split('/').pop()}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip label={r.wasteReason} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5, fontWeight: 700, color: '#d13438', fontFamily: 'monospace' }}>
                        {formatCurrency(r.estimatedMonthlyCost, r.currency)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Chip label={r.severity} size="small" sx={{ bgcolor: severityColor(r.severity), color: 'white', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{r.recommendation}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 1: AZURE ADVISOR ── */}
      {activeTab === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<SavingsIcon />}>Azure Advisor Recommendations</SectionHeader>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <StyledHeadCell width="35%">Recommendation</StyledHeadCell>
                    <StyledHeadCell width="20%">Resource</StyledHeadCell>
                    <StyledHeadCell align="center" width="12%">Impact</StyledHeadCell>
                    <StyledHeadCell align="right" width="15%">Annual Savings</StyledHeadCell>
                    <StyledHeadCell width="18%">Action</StyledHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {advisorRecs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        {loading ? 'Loading…' : 'No Advisor recommendations'}
                      </TableCell>
                    </TableRow>
                  ) : advisorRecs.map((r, i) => (
                    <TableRow key={`advisor-${r.resourceId}-${i}`} sx={styledRowSx}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{r.shortDescription}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.category}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {r.resourceName || r.resourceId.split('/').pop()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Chip label={r.impact} size="small" sx={{ bgcolor: severityColor(r.impact), color: 'white', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5, fontWeight: 700, color: '#107c10', fontFamily: 'monospace' }}>
                        {r.annualSavingsAmount ? formatCurrency(r.annualSavingsAmount, r.savingsCurrency) : '—'}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{r.recommendedAction}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 2: COST FORECAST ── */}
      {activeTab === 2 && (
        <Box>
          {forecast.length === 0 && !loading ? (
            <EmptyState icon={<TimelineIcon />} title="No forecast data available" />
          ) : forecast.map((f, i) => (
            <Card key={i} sx={{ mb: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.subscriptionName}</Typography>
                  {trendIcon(f.trendDirection)}
                  <Chip
                    label={`${f.trendPercentage > 0 ? '+' : ''}${f.trendPercentage.toFixed(1)}% trend`}
                    size="small"
                    color={f.trendDirection === 'Increasing' ? 'error' : f.trendDirection === 'Decreasing' ? 'success' : 'default'}
                  />
                </Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    { label: 'Current Month', value: formatCurrency(f.currentMonthActual, f.currency), color: 'text.primary' },
                    { label: 'Next Month Forecast', value: formatCurrency(f.nextMonthForecast, f.currency), color: f.nextMonthForecast > f.currentMonthActual ? 'error.main' : 'success.main' },
                    { label: '3-Month Forecast', value: formatCurrency(f.next3MonthForecast, f.currency), color: 'text.primary' },
                  ].map(stat => (
                    <Grid item xs={4} key={stat.label}>
                      <Box sx={{ p: 2, borderRadius: 2, background: DS.gradSubtle, border: DS.border }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{stat.label}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {f.forecastPoints.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={f.forecastPoints}>
                      <defs>
                        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DS.accent} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={DS.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                      <Area type="monotone" dataKey="amount" stroke={DS.accent} fill="url(#forecastGrad)" name="Cost" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── TAB 3: ANOMALIES ── */}
      {activeTab === 3 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<WarningAmberIcon />}>Cost Anomalies</SectionHeader>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <StyledHeadCell>Service</StyledHeadCell>
                    <StyledHeadCell>Subscription</StyledHeadCell>
                    <StyledHeadCell align="right">Expected</StyledHeadCell>
                    <StyledHeadCell align="right">Actual</StyledHeadCell>
                    <StyledHeadCell align="right">% Increase</StyledHeadCell>
                    <StyledHeadCell align="center">Severity</StyledHeadCell>
                    <StyledHeadCell>Possible Cause</StyledHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {anomalies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        {loading ? 'Loading…' : 'No anomalies detected — spend looks normal'}
                      </TableCell>
                    </TableRow>
                  ) : anomalies.map((a, i) => (
                    <TableRow key={`anomaly-${a.serviceName}-${i}`} sx={styledRowSx}>
                      <TableCell sx={{ py: 1.5, fontWeight: 600 }}>{a.serviceName}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{a.subscriptionName}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5, fontFamily: 'monospace' }}>
                        {formatCurrency(a.expectedCost, a.currency)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5, fontWeight: 700, color: '#d13438', fontFamily: 'monospace' }}>
                        {formatCurrency(a.actualCost, a.currency)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5, fontWeight: 700, color: '#d13438' }}>
                        +{a.percentageIncrease.toFixed(1)}%
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Chip label={a.severity} size="small" sx={{ bgcolor: severityColor(a.severity), color: 'white', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{a.possibleCause}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 4: TAG COMPLIANCE ── */}
      {activeTab === 4 && tagReport && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { value: `${tagReport.tagCoveragePercent.toFixed(1)}%`, label: 'Tag Coverage', color: DS.accent },
              { value: tagReport.taggedResources, label: 'Fully Tagged', color: '#107c10' },
              { value: tagReport.untaggedResources, label: 'Missing Required Tags', color: '#d13438' },
            ].map(stat => (
              <Grid item xs={4} key={stat.label}>
                <Box sx={{ textAlign: 'center', p: 2.5, borderRadius: 3, background: DS.gradSubtle, border: DS.border }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{stat.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Required: {tagReport.requiredTags.join(', ')}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
              onClick={handleExportCsv} disabled={tagReport.violations.length === 0}
              sx={{ borderColor: DS.borderColor, color: DS.accent }}>
              Export CSV
            </Button>
            <Button variant="outlined" size="small"
              startIcon={aiSuggestionsLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              onClick={handleGetAISuggestions} disabled={selectedResources.length === 0 || aiSuggestionsLoading}
              sx={{ borderColor: DS.borderColor, color: DS.accent }}>
              Get AI Suggestions
            </Button>
            {Object.keys(resourceTagEdits).length > 0 && (
              <Button variant="contained" size="small" color="success"
                startIcon={tagOperationLoading ? <CircularProgress size={16} color="inherit" /> : <LocalOfferIcon />}
                onClick={handleApplyAllSuggestions} disabled={tagOperationLoading}>
                Apply All ({Object.keys(resourceTagEdits).length})
              </Button>
            )}
          </Box>

          {aiSuggestions.length > 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600}>AI Suggestions Generated</Typography>
              <Typography variant="caption">Review below, edit if needed, then click "Apply All" or apply individually.</Typography>
            </Alert>
          )}

          <Card>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <StyledHeadCell padding="checkbox">
                      <Checkbox
                        checked={selectedResources.length === tagReport.violations.length && tagReport.violations.length > 0}
                        indeterminate={selectedResources.length > 0 && selectedResources.length < tagReport.violations.length}
                        onChange={toggleSelectAll} size="small"
                      />
                    </StyledHeadCell>
                    <StyledHeadCell>Resource</StyledHeadCell>
                    <StyledHeadCell>Type</StyledHeadCell>
                    <StyledHeadCell>Resource Group</StyledHeadCell>
                    <StyledHeadCell>Missing Tags</StyledHeadCell>
                    <StyledHeadCell>Tags to Apply</StyledHeadCell>
                    <StyledHeadCell>Actions</StyledHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tagReport.violations.slice(0, 50).map((v, i) => (
                    <TableRow key={`${v.resourceId}-${i}`} sx={styledRowSx}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedResources.includes(v.resourceId)}
                          onChange={() => toggleResourceSelection(v.resourceId)} size="small" />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.resourceName}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{v.resourceType.split('/').pop()}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">{v.resourceGroup}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {v.missingTags.map(t => (
                          <Chip key={t} label={t} size="small" color="warning" sx={{ mr: 0.5, mb: 0.25 }} />
                        ))}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {resourceTagEdits[v.resourceId] && Object.entries(resourceTagEdits[v.resourceId]).map(([key, value]) => (
                            <Chip key={key} label={`${key}: ${value}`} size="small" color="primary" variant="outlined"
                              onDelete={() => handleRemoveTagFromResource(v.resourceId, key)} />
                          ))}
                          {editingResourceId === v.resourceId ? (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <TextField size="small" placeholder="Key" value={editTagKey}
                                onChange={e => setEditTagKey(e.target.value)} sx={{ width: 80 }} />
                              <TextField size="small" placeholder="Value" value={editTagValue}
                                onChange={e => setEditTagValue(e.target.value)} sx={{ width: 100 }} />
                              <IconButton size="small" color="primary" onClick={() => handleAddTagToResource(v.resourceId)}>
                                <LocalOfferIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => setEditingResourceId(null)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Button size="small" variant="text" onClick={() => setEditingResourceId(v.resourceId)}
                              sx={{ color: DS.accent, minWidth: 0, px: 1 }}>+ Add</Button>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {resourceTagEdits[v.resourceId] && Object.keys(resourceTagEdits[v.resourceId]).length > 0 && (
                          <Button size="small" variant="contained" startIcon={<LocalOfferIcon />}
                            onClick={() => handleApplySingleResource(v.resourceId)}
                            disabled={tagOperationLoading} sx={gradButtonSx}>
                            Apply
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ── TAB 5: AI FINOPS INSIGHTS ── */}
      {activeTab === 5 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Insight Type</InputLabel>
              <Select value={aiInsightType} label="Insight Type" onChange={e => setAiInsightType(e.target.value)}>
                <MenuItem value="General">General FinOps</MenuItem>
                <MenuItem value="WasteAnalysis">Waste Analysis</MenuItem>
                <MenuItem value="Rightsizing">Rightsizing</MenuItem>
                <MenuItem value="Forecast">Cost Forecast</MenuItem>
                <MenuItem value="Anomaly">Anomaly Explanation</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained"
              startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleGetAIInsights} disabled={aiLoading} sx={gradButtonSx}>
              {aiLoading ? 'Analyzing…' : 'Generate AI Insights'}
            </Button>
          </Box>

          {aiInsights.length > 0 ? aiInsights.map((rec: any, i: number) => (
            <Card key={i} sx={{
              mb: 2,
              borderLeft: `4px solid ${severityColor(rec.priority)}`,
              background: DS.gradSubtle,
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={rec.category} size="small" sx={{ background: DS.gradSubtle, border: DS.border }} />
                    <Chip label={rec.priority} size="small" sx={{ bgcolor: severityColor(rec.priority), color: 'white', fontWeight: 600 }} />
                    <Chip label={`Effort: ${rec.effort}`} size="small" variant="outlined" />
                  </Box>
                  {rec.potentialSavings && (
                    <Typography sx={{ color: '#107c10', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {rec.potentialSavings}
                    </Typography>
                  )}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{rec.title}</Typography>
                <Typography variant="body2" color="text.secondary">{rec.description}</Typography>
              </CardContent>
            </Card>
          )) : !aiLoading && (
            <Alert severity="info">
              Select an insight type and click "Generate AI Insights" to get AI-powered FinOps recommendations for your Azure environment.
            </Alert>
          )}
        </Box>
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)} message={snackbarMessage} />
    </Box>
  );
};

export default FinOpsDashboard;

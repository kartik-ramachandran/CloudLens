import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, Alert,
  CircularProgress, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tab, Tabs, Tooltip,
  Select, MenuItem, FormControl, InputLabel
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { AzureCredentials, FinOpsMetrics, WastedResource, AdvisorRecommendation, CostForecast, CostAnomaly, TagComplianceReport } from '../types';
import {
  getFinOpsMetrics, getWastedResources, getAdvisorRecommendations,
  getCostForecast, getCostAnomalies, getTagCompliance, getFinOpsAIInsights
} from '../services/api';

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

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsData, wasteData, advisorData, forecastData, anomalyData, tagData] = await Promise.allSettled([
        getFinOpsMetrics(credentials),
        getWastedResources(credentials),
        getAdvisorRecommendations(credentials, 'Cost'),
        getCostForecast(credentials),
        getCostAnomalies(credentials),
        getTagCompliance(credentials)
      ]);

      if (metricsData.status === 'fulfilled') setMetrics(metricsData.value);
      if (wasteData.status === 'fulfilled') setWastedResources(wasteData.value);
      if (advisorData.status === 'fulfilled') setAdvisorRecs(advisorData.value);
      if (forecastData.status === 'fulfilled') setForecast(forecastData.value);
      if (anomalyData.status === 'fulfilled') setAnomalies(anomalyData.value);
      if (tagData.status === 'fulfilled') setTagReport(tagData.value);
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

  useEffect(() => { loadAll(); }, []);

  const severityColor = (sev: string) =>
    sev === 'High' ? '#d13438' : sev === 'Medium' ? '#ff8c00' : '#107c10';

  const formatCurrency = (val: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);

  const trendIcon = (dir: string) =>
    dir === 'Increasing' ? <TrendingUpIcon sx={{ color: '#d13438', fontSize: 18 }} /> :
    dir === 'Decreasing' ? <TrendingDownIcon sx={{ color: '#107c10', fontSize: 18 }} /> : null;

  // Build chart data from forecast
  const chartData = forecast.flatMap(f => f.forecastPoints).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>FinOps & Cost Optimization</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff4f4', borderLeft: '4px solid #d13438' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Estimated Monthly Waste</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#d13438' }}>
                  {formatCurrency(metrics.totalWaste)}
                </Typography>
                <Typography variant="caption">{metrics.wastedResourceCount} wasted resources</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f0fff0', borderLeft: '4px solid #107c10' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Total Savings Opportunity</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#107c10' }}>
                  {formatCurrency(metrics.potentialMonthlySavings)}/mo
                </Typography>
                <Typography variant="caption">{metrics.advisorRecommendationCount} Advisor recommendations</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f0f8ff', borderLeft: '4px solid #0078d4' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Tag Coverage</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0078d4' }}>
                  {tagReport?.tagCoveragePercent?.toFixed(1) ?? '—'}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={tagReport?.tagCoveragePercent ?? 0}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fffdf0', borderLeft: '4px solid #ff8c00' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Cost Anomalies</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff8c00' }}>
                  {anomalies.length}
                </Typography>
                <Typography variant="caption">services with unusual spend</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Waste Detection" />
          <Tab label="Azure Advisor" />
          <Tab label="Cost Forecast" />
          <Tab label="Anomalies" />
          <Tab label="Tag Compliance" />
          <Tab label="AI FinOps Insights" />
        </Tabs>
      </Box>

      {/* Tab 0: Waste Detection */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Resource</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Waste Reason</strong></TableCell>
                <TableCell><strong>Est. Monthly Cost</strong></TableCell>
                <TableCell><strong>Severity</strong></TableCell>
                <TableCell><strong>Recommendation</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wastedResources.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No wasted resources detected{loading ? '...' : ''}</TableCell></TableRow>
              ) : wastedResources.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell>{r.resourceName}</TableCell>
                  <TableCell><Typography variant="caption">{r.resourceType.split('/').pop()}</Typography></TableCell>
                  <TableCell><Chip label={r.wasteReason} size="small" /></TableCell>
                  <TableCell sx={{ color: '#d13438', fontWeight: 600 }}>{formatCurrency(r.estimatedMonthlyCost, r.currency)}</TableCell>
                  <TableCell>
                    <Chip label={r.severity} size="small" sx={{ bgcolor: severityColor(r.severity), color: 'white' }} />
                  </TableCell>
                  <TableCell><Typography variant="caption">{r.recommendation}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: Azure Advisor */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Recommendation</strong></TableCell>
                <TableCell><strong>Resource</strong></TableCell>
                <TableCell><strong>Impact</strong></TableCell>
                <TableCell><strong>Annual Savings</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {advisorRecs.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No Advisor recommendations{loading ? '...' : ''}</TableCell></TableRow>
              ) : advisorRecs.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.shortDescription}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.category}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption">{r.resourceName || r.resourceId.split('/').pop()}</Typography></TableCell>
                  <TableCell>
                    <Chip label={r.impact} size="small" sx={{ bgcolor: severityColor(r.impact), color: 'white' }} />
                  </TableCell>
                  <TableCell sx={{ color: '#107c10', fontWeight: 600 }}>
                    {r.annualSavingsAmount ? formatCurrency(r.annualSavingsAmount, r.savingsCurrency) : '—'}
                  </TableCell>
                  <TableCell><Typography variant="caption">{r.recommendedAction}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Cost Forecast */}
      {activeTab === 2 && (
        <Box>
          {forecast.map((f, i) => (
            <Card key={i} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6">{f.subscriptionName}</Typography>
                  {trendIcon(f.trendDirection)}
                  <Chip label={`${f.trendPercentage > 0 ? '+' : ''}${f.trendPercentage.toFixed(1)}% trend`}
                    size="small" color={f.trendDirection === 'Increasing' ? 'error' : f.trendDirection === 'Decreasing' ? 'success' : 'default'} />
                </Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Current Month</Typography>
                    <Typography variant="h6">{formatCurrency(f.currentMonthActual, f.currency)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Next Month Forecast</Typography>
                    <Typography variant="h6" color={f.nextMonthForecast > f.currentMonthActual ? 'error' : 'success'}>
                      {formatCurrency(f.nextMonthForecast, f.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">3-Month Forecast</Typography>
                    <Typography variant="h6">{formatCurrency(f.next3MonthForecast, f.currency)}</Typography>
                  </Grid>
                </Grid>
                {f.forecastPoints.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={f.forecastPoints}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                      <Area type="monotone" dataKey="amount" stroke="#0078d4" fill="#cce4f6" name="Cost" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ))}
          {forecast.length === 0 && !loading && (
            <Typography color="text.secondary">No forecast data available</Typography>
          )}
        </Box>
      )}

      {/* Tab 3: Anomalies */}
      {activeTab === 3 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Subscription</strong></TableCell>
                <TableCell><strong>Expected</strong></TableCell>
                <TableCell><strong>Actual</strong></TableCell>
                <TableCell><strong>% Increase</strong></TableCell>
                <TableCell><strong>Severity</strong></TableCell>
                <TableCell><strong>Possible Cause</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {anomalies.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">No anomalies detected{loading ? '...' : ' — spend looks normal'}</TableCell></TableRow>
              ) : anomalies.map((a, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{a.serviceName}</TableCell>
                  <TableCell><Typography variant="caption">{a.subscriptionName}</Typography></TableCell>
                  <TableCell>{formatCurrency(a.expectedCost, a.currency)}</TableCell>
                  <TableCell sx={{ color: '#d13438', fontWeight: 600 }}>{formatCurrency(a.actualCost, a.currency)}</TableCell>
                  <TableCell sx={{ color: '#d13438' }}>+{a.percentageIncrease.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Chip label={a.severity} size="small" sx={{ bgcolor: severityColor(a.severity), color: 'white' }} />
                  </TableCell>
                  <TableCell><Typography variant="caption">{a.possibleCause}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 4: Tag Compliance */}
      {activeTab === 4 && tagReport && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#0078d4' }}>{tagReport.tagCoveragePercent.toFixed(1)}%</Typography>
                <Typography variant="body2">Tag Coverage</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#107c10' }}>{tagReport.taggedResources}</Typography>
                <Typography variant="body2">Fully Tagged</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#d13438' }}>{tagReport.untaggedResources}</Typography>
                <Typography variant="body2">Missing Required Tags</Typography>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Required Tags: {tagReport.requiredTags.join(', ')}</Typography>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Resource</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Resource Group</strong></TableCell>
                  <TableCell><strong>Missing Tags</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tagReport.violations.slice(0, 50).map((v, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{v.resourceName}</TableCell>
                    <TableCell><Typography variant="caption">{v.resourceType.split('/').pop()}</Typography></TableCell>
                    <TableCell>{v.resourceGroup}</TableCell>
                    <TableCell>
                      {v.missingTags.map(t => (
                        <Chip key={t} label={t} size="small" color="warning" sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 5: AI FinOps Insights */}
      {activeTab === 5 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Insight Type</InputLabel>
              <Select value={aiInsightType} label="Insight Type" onChange={(e) => setAiInsightType(e.target.value)}>
                <MenuItem value="General">General FinOps</MenuItem>
                <MenuItem value="WasteAnalysis">Waste Analysis</MenuItem>
                <MenuItem value="Rightsizing">Rightsizing</MenuItem>
                <MenuItem value="Forecast">Cost Forecast</MenuItem>
                <MenuItem value="Anomaly">Anomaly Explanation</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleGetAIInsights}
              disabled={aiLoading}
            >
              {aiLoading ? 'Analyzing...' : 'Generate AI Insights'}
            </Button>
          </Box>

          {aiInsights.length > 0 && aiInsights.map((rec: any, i: number) => (
            <Card key={i} sx={{ mb: 2, borderLeft: `4px solid ${rec.priority === 'High' ? '#d13438' : rec.priority === 'Medium' ? '#ff8c00' : '#107c10'}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Chip label={rec.category} size="small" sx={{ mr: 1, bgcolor: '#e3f2fd' }} />
                    <Chip label={rec.priority} size="small" sx={{ bgcolor: severityColor(rec.priority), color: 'white', mr: 1 }} />
                    <Chip label={`Effort: ${rec.effort}`} size="small" variant="outlined" />
                  </Box>
                  {rec.potentialSavings && (
                    <Typography sx={{ color: '#107c10', fontWeight: 700 }}>{rec.potentialSavings}</Typography>
                  )}
                </Box>
                <Typography variant="h6" sx={{ mt: 1 }}>{rec.title}</Typography>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>{rec.description}</Typography>
              </CardContent>
            </Card>
          ))}

          {aiInsights.length === 0 && !aiLoading && (
            <Alert severity="info">
              Select an insight type and click "Generate AI Insights" to get AI-powered FinOps recommendations for your Azure environment.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FinOpsDashboard;

import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, Alert,
  CircularProgress, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tab, Tabs, Accordion,
  AccordionSummary, AccordionDetails, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { AzureCredentials, Soc2Control, ComplianceReport, ControlGap } from '../types';
import {
  getSoc2Controls, generateSoc2Report, getComplianceGaps, exportSoc2Report, generateSingleRemediationSuggestion
} from '../services/api';

interface Soc2ComplianceDashboardProps {
  credentials: AzureCredentials;
}

const STATUS_COLORS: Record<string, string> = {
  Compliant: '#107c10',
  NonCompliant: '#d13438',
  PartiallyCompliant: '#ff8c00',
  NotEvaluated: '#999'
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Compliant: <CheckCircleIcon sx={{ color: '#107c10', fontSize: 18 }} />,
  NonCompliant: <CancelIcon sx={{ color: '#d13438', fontSize: 18 }} />,
  PartiallyCompliant: <RemoveCircleIcon sx={{ color: '#ff8c00', fontSize: 18 }} />,
  NotEvaluated: <RemoveCircleIcon sx={{ color: '#999', fontSize: 18 }} />
};

const Soc2ComplianceDashboard: React.FC<Soc2ComplianceDashboardProps> = ({ credentials }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<{ excel: boolean; csv: boolean; html: boolean }>({
    excel: false,
    csv: false,
    html: false
  });
  const [error, setError] = useState('');

  const [controls, setControls] = useState<Soc2Control[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [gaps, setGaps] = useState<ControlGap[]>([]);
  const [selectedControl, setSelectedControl] = useState<Soc2Control | null>(null);
  const [gapAiInsights, setGapAiInsights] = useState<Record<string, any>>({});
  const [loadingGapAi, setLoadingGapAi] = useState<string | null>(null);
  const [aiGapOpen, setAiGapOpen] = useState<string | null>(null);

  const loadControls = async () => {
    setLoading(true);
    setError('');
    try {
      const [controlData, gapData] = await Promise.allSettled([
        getSoc2Controls(credentials),
        getComplianceGaps(credentials)
      ]);
      if (controlData.status === 'fulfilled') setControls(controlData.value);
      if (gapData.status === 'fulfilled') setGaps(gapData.value);
    } catch (e: any) {
      setError(e.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (includeAi: boolean) => {
    setReportLoading(true);
    setError('');
    try {
      const reportData = await generateSoc2Report(credentials, 'SOC2TypeI', includeAi);
      setReport(reportData);
      setActiveTab(2);
    } catch (e: any) {
      setError(e.message || 'Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'html' | 'csv') => {
    setExportLoading(prev => ({ ...prev, [format]: true }));
    try {
      console.log('[Export] Starting export with format:', format, 'credentials:', credentials);
      setError(''); // Clear previous errors
      const blob = await exportSoc2Report(credentials, format);
      console.log('[Export] Received blob:', blob?.size, 'bytes, type:', blob?.type);
      
      if (!blob || blob.size === 0) {
        throw new Error('Received empty file from server');
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'html';
      a.download = `SOC2_Report_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a); // Add to body for better browser support
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[Export] Download triggered successfully');
    } catch (e: any) {
      console.error('[Export] Error during export:', e);
      const errorMessage = e.response?.data?.error || e.message || 'Export failed. Please check the console for details.';
      setError(errorMessage);
    } finally {
      setExportLoading(prev => ({ ...prev, [format]: false }));
    }
  };

  const handleGapAiAnalysis = async (gap: ControlGap, index: number) => {
    const gapKey = `${gap.controlId}_${index}`;
    
    // If already loaded, toggle display
    if (gapAiInsights[gapKey]) {
      setAiGapOpen(aiGapOpen === gapKey ? null : gapKey);
      return;
    }

    setLoadingGapAi(gapKey);
    try {
      const response = await generateSingleRemediationSuggestion(
        credentials,
        gap.controlId,
        gap.controlId,
        gap.gapDescription,
        gap.severity,
        undefined,
        undefined,
        'SOC2'
      );

      if (response.success && response.suggestion) {
        setGapAiInsights(prev => ({ ...prev, [gapKey]: response.suggestion }));
        setAiGapOpen(gapKey);
      }
    } catch (error) {
      console.error('Error loading AI analysis for gap:', error);
    } finally {
      setLoadingGapAi(null);
    }
  };

  useEffect(() => { loadControls(); }, []);

  const compliant = controls.filter(c => c.status === 'Compliant').length;
  const nonCompliant = controls.filter(c => c.status === 'NonCompliant').length;
  const partial = controls.filter(c => c.status === 'PartiallyCompliant').length;
  const notEval = controls.filter(c => c.status === 'NotEvaluated').length;
  const totalChecks = controls.reduce((s, c) => s + c.totalChecks, 0);
  const passedChecks = controls.reduce((s, c) => s + c.passedChecks, 0);
  const overallPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  const pieData = [
    { name: 'Compliant', value: compliant, color: '#107c10' },
    { name: 'Non-Compliant', value: nonCompliant, color: '#d13438' },
    { name: 'Partial', value: partial, color: '#ff8c00' },
    { name: 'Not Evaluated', value: notEval, color: '#999' },
  ].filter(d => d.value > 0);

  const tscGroups = Array.from(new Set(controls.map(c => c.tscCategory)));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>SOC2 Compliance</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadControls} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={reportLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={() => handleGenerateReport(true)}
            disabled={reportLoading || loading}
          >
            Generate Report (AI)
          </Button>
          <Button variant="contained" 
            startIcon={exportLoading.excel ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={() => handleExport('excel')} 
            disabled={loading || exportLoading.excel}>
            {exportLoading.excel ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button variant="outlined" 
            startIcon={exportLoading.csv ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={() => handleExport('csv')} 
            disabled={loading || exportLoading.csv}>
            {exportLoading.csv ? 'Exporting...' : 'Export CSV'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary KPIs */}
      {controls.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
          <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <CardContent sx={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: overallPct >= 80 ? '#107c10' : overallPct >= 60 ? '#ff8c00' : '#d13438' }}>
                  {overallPct}%
                </Typography>
                <Typography variant="body1">Overall Compliance Score</Typography>
                <LinearProgress variant="determinate" value={overallPct}
                  sx={{ mt: 2, height: 10, borderRadius: 5,
                    '& .MuiLinearProgress-bar': { bgcolor: overallPct >= 80 ? '#107c10' : overallPct >= 60 ? '#ff8c00' : '#d13438' } }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ pb: '16px !important', height: '100%', boxSizing: 'border-box' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {[
                  { label: 'Compliant Controls',   value: compliant,     color: '#107c10' },
                  { label: 'Non-Compliant',         value: nonCompliant,  color: '#d13438' },
                  { label: 'Partially Compliant',   value: partial,       color: '#ff8c00' },
                  { label: 'Open Gaps',             value: gaps.length,   color: '#d13438' },
                ].map((row, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: i < 3 ? 1.5 : 0 }}>
                    <Typography variant="body2">{row.label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: row.color, fontFamily: 'monospace' }}>{row.value}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Controls by TSC" />
          <Tab label="Gap Analysis" />
          {report && <Tab label="Report" />}
        </Tabs>
      </Box>

      {/* Tab 0: Controls by TSC Category */}
      {activeTab === 0 && (
        <Box>
          {tscGroups.map(tsc => {
            const tscControls = controls.filter(c => c.tscCategory === tsc);
            return (
              <Accordion key={tsc} defaultExpanded={tscControls.some(c => c.status !== 'Compliant')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>{tsc}</Typography>
                    <Chip label={`${tscControls.filter(c => c.status === 'Compliant').length}/${tscControls.length} compliant`}
                      size="small"
                      color={tscControls.every(c => c.status === 'Compliant') ? 'success' : 'warning'} />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Table size="small">
                    <TableBody>
                      {tscControls.map((ctrl, i) => (
                        <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedControl(ctrl)}>
                          <TableCell sx={{ width: 80 }}><strong>{ctrl.controlId}</strong></TableCell>
                          <TableCell>{ctrl.name}</TableCell>
                          <TableCell sx={{ width: 40 }}>{STATUS_ICONS[ctrl.status]}</TableCell>
                          <TableCell sx={{ width: 140 }}>
                            <Chip label={ctrl.status.replace('PartiallyCompliant', 'Partial')} size="small"
                              sx={{ bgcolor: STATUS_COLORS[ctrl.status], color: 'white' }} />
                          </TableCell>
                          <TableCell sx={{ width: 160 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={ctrl.compliancePercent}
                                sx={{ flexGrow: 1, height: 6, borderRadius: 3,
                                  '& .MuiLinearProgress-bar': { bgcolor: STATUS_COLORS[ctrl.status] } }} />
                              <Typography variant="caption">{ctrl.compliancePercent.toFixed(0)}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ width: 80 }}>
                            <Typography variant="caption" color="text.secondary">
                              {ctrl.passedChecks}/{ctrl.totalChecks} checks
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            );
          })}
          {controls.length === 0 && !loading && (
            <Alert severity="info">Click Refresh to evaluate SOC2 controls for your Azure environment.</Alert>
          )}
        </Box>
      )}

      {/* Tab 1: Gap Analysis */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Control</strong></TableCell>
                <TableCell><strong>Gap Description</strong></TableCell>
                <TableCell><strong>Severity</strong></TableCell>
                <TableCell><strong>Remediation Steps</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>AI Analysis</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gaps.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">{loading ? 'Loading...' : 'No gaps found — all evaluated controls are compliant!'}</TableCell></TableRow>
              ) : gaps.map((g, i) => {
                const gapKey = `${g.controlId}_${i}`;
                return (
                  <React.Fragment key={i}>
                    <TableRow hover>
                      <TableCell><Chip label={g.controlId} size="small" /></TableCell>
                      <TableCell><Typography variant="body2">{g.gapDescription}</Typography></TableCell>
                      <TableCell>
                        <Chip label={g.severity} size="small" sx={{ bgcolor: STATUS_COLORS[g.severity === 'High' ? 'NonCompliant' : g.severity === 'Medium' ? 'PartiallyCompliant' : 'Compliant'], color: 'white' }} />
                      </TableCell>
                      <TableCell><Typography variant="caption">{g.remediationSteps}</Typography></TableCell>
                      <TableCell><Chip label={g.status} size="small" variant="outlined" /></TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant={gapAiInsights[gapKey] ? "contained" : "outlined"}
                          onClick={() => handleGapAiAnalysis(g, i)}
                          disabled={loadingGapAi === gapKey}
                          startIcon={loadingGapAi === gapKey ? (
                            <CircularProgress size={14} />
                          ) : gapAiInsights[gapKey] ? (
                            <LightbulbIcon fontSize="small" />
                          ) : (
                            <PsychologyIcon fontSize="small" />
                          )}
                          sx={{ minWidth: 100 }}
                        >
                          {loadingGapAi === gapKey ? 'Analyzing...' : gapAiInsights[gapKey] ? 'View AI' : 'Get AI'}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expandable AI Analysis Row */}
                    {aiGapOpen === gapKey && gapAiInsights[gapKey] && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ bgcolor: '#f8f9fa', borderLeft: '4px solid #0066CC', p: 0 }}>
                          <Box sx={{ p: 2 }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <LightbulbIcon sx={{ color: '#0066CC', fontSize: 28 }} />
                              <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                                {gapAiInsights[gapKey].title}
                              </Typography>
                              <Chip 
                                label={gapAiInsights[gapKey].automation} 
                                size="small"
                                color={
                                  gapAiInsights[gapKey].automation === 'Automated' ? 'success' :
                                  gapAiInsights[gapKey].automation === 'SemiAutomated' ? 'warning' : 'default'
                                }
                              />
                              <Chip label={`Effort: ${gapAiInsights[gapKey].effort}`} size="small" variant="outlined" />
                              <Chip label={`Time: ${gapAiInsights[gapKey].timeEstimate}`} size="small" variant="outlined" />
                            </Box>

                            <Grid container spacing={2}>
                              {/* Description */}
                              <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  {gapAiInsights[gapKey].description}
                                </Typography>
                              </Grid>

                              {/* Root Cause */}
                              {gapAiInsights[gapKey].rootCause && (
                                <Grid item xs={12}>
                                  <Alert severity="info" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Root Cause</Typography>
                                    <Typography variant="body2">{gapAiInsights[gapKey].rootCause}</Typography>
                                  </Alert>
                                </Grid>
                              )}

                              {/* Remediation Steps */}
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Remediation Steps</Typography>
                                <Box component="ol" sx={{ pl: 2, m: 0 }}>
                                  {gapAiInsights[gapKey].remediationSteps?.map((step: string, idx: number) => (
                                    <li key={idx}>
                                      <Typography variant="body2" sx={{ mb: 0.5 }}>{step}</Typography>
                                    </li>
                                  ))}
                                </Box>
                              </Grid>

                              {/* Quick Fix Commands */}
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Quick Fix Commands</Typography>
                                
                                {/* Azure CLI */}
                                {gapAiInsights[gapKey].azureCliCommands && gapAiInsights[gapKey].azureCliCommands.length > 0 && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#0078D4' }}>Azure CLI:</Typography>
                                    <Paper sx={{ p: 1.5, bgcolor: '#1e1e1e', mt: 0.5 }}>
                                      {gapAiInsights[gapKey].azureCliCommands.slice(0, 3).map((cmd: string, idx: number) => (
                                        <Typography
                                          key={idx}
                                          variant="caption"
                                          sx={{
                                            fontFamily: 'monospace',
                                            color: '#d4d4d4',
                                            display: 'block',
                                            mb: idx < 2 ? 0.5 : 0,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all'
                                          }}
                                        >
                                          {cmd}
                                        </Typography>
                                      ))}
                                    </Paper>
                                  </Box>
                                )}

                                {/* PowerShell */}
                                {gapAiInsights[gapKey].powerShellCommands && gapAiInsights[gapKey].powerShellCommands.length > 0 && (
                                  <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#0078D4' }}>PowerShell:</Typography>
                                    <Paper sx={{ p: 1.5, bgcolor: '#012456', mt: 0.5 }}>
                                      {gapAiInsights[gapKey].powerShellCommands.slice(0, 3).map((cmd: string, idx: number) => (
                                        <Typography
                                          key={idx}
                                          variant="caption"
                                          sx={{
                                            fontFamily: 'monospace',
                                            color: '#ffffff',
                                            display: 'block',
                                            mb: idx < 2 ? 0.5 : 0,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all'
                                          }}
                                        >
                                          {cmd}
                                        </Typography>
                                      ))}
                                    </Paper>
                                  </Box>
                                )}
                              </Grid>

                              {/* Compliance Impact */}
                              {gapAiInsights[gapKey].complianceImpact && (
                                <Grid item xs={12}>
                                  <Alert severity="warning">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Compliance Impact</Typography>
                                    <Typography variant="body2">{gapAiInsights[gapKey].complianceImpact}</Typography>
                                  </Alert>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Report */}
      {activeTab === 2 && report && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h6">SOC2 {report.reportType} Report</Typography>
                <Typography variant="caption" color="text.secondary">
                  Generated: {new Date(report.generatedAt).toLocaleString()} | Status: {report.overallStatus}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" 
                  startIcon={exportLoading.excel ? <CircularProgress size={16} /> : <DownloadIcon />} 
                  onClick={() => handleExport('excel')}
                  disabled={exportLoading.excel}>
                  {exportLoading.excel ? 'Exporting...' : 'Export Excel'}
                </Button>
                <Button size="small" variant="outlined" 
                  startIcon={exportLoading.csv ? <CircularProgress size={16} /> : <DownloadIcon />} 
                  onClick={() => handleExport('csv')}
                  disabled={exportLoading.csv}>
                  {exportLoading.csv ? 'Exporting...' : 'Export CSV'}
                </Button>
                <Button size="small" variant="outlined" 
                  startIcon={exportLoading.html ? <CircularProgress size={16} /> : <DownloadIcon />} 
                  onClick={() => handleExport('html')}
                  disabled={exportLoading.html}>
                  {exportLoading.html ? 'Exporting...' : 'Export HTML'}
                </Button>
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Overall Score', value: `${report.overallCompliancePercent.toFixed(1)}%`, color: '#0078d4' },
                { label: 'Compliant', value: report.compliantControls, color: '#107c10' },
                { label: 'Non-Compliant', value: report.nonCompliantControls, color: '#d13438' },
                { label: 'Partial', value: report.partialControls, color: '#ff8c00' },
              ].map((m, i) => (
                <Grid item xs={3} key={i}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#f8f9fa' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: m.color }}>{m.value}</Typography>
                      <Typography variant="caption">{m.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {report.executiveSummary && (
              <Card sx={{ bgcolor: '#f0f8ff', mb: 3, borderLeft: '4px solid #0078d4' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Executive Summary (AI-Generated)</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{report.executiveSummary}</Typography>
                </CardContent>
              </Card>
            )}

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Control Assessment</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1565c0' }}>
                    {['Control ID', 'TSC Category', 'Name', 'Status', 'Score', 'Checks'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.controls.sort((a, b) => a.controlId.localeCompare(b.controlId)).map((ctrl, i) => (
                    <TableRow key={i} sx={{ bgcolor: ctrl.status === 'Compliant' ? '#f0fff0' : ctrl.status === 'NonCompliant' ? '#fff0f0' : undefined }}>
                      <TableCell><strong>{ctrl.controlId}</strong></TableCell>
                      <TableCell><Typography variant="caption">{ctrl.tscCategory}</Typography></TableCell>
                      <TableCell>{ctrl.name}</TableCell>
                      <TableCell>
                        <Chip label={ctrl.status.replace('PartiallyCompliant', 'Partial')} size="small"
                          sx={{ bgcolor: STATUS_COLORS[ctrl.status], color: 'white' }} />
                      </TableCell>
                      <TableCell>{ctrl.compliancePercent.toFixed(1)}%</TableCell>
                      <TableCell>{ctrl.passedChecks}/{ctrl.totalChecks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Control Detail Dialog */}
      <Dialog open={!!selectedControl} onClose={() => setSelectedControl(null)} maxWidth="md" fullWidth>
        {selectedControl && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {STATUS_ICONS[selectedControl.status]}
                {selectedControl.controlId}: {selectedControl.name}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selectedControl.description}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Category:</strong> {selectedControl.tscCategory}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Compliance:</strong> {selectedControl.passedChecks}/{selectedControl.totalChecks} checks passed ({selectedControl.compliancePercent.toFixed(1)}%)
              </Typography>

              {selectedControl.evidence.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Evidence ({selectedControl.evidence.length})</Typography>
                  {selectedControl.evidence.map((ev, i) => (
                    <Card key={i} sx={{ mb: 1, bgcolor: ev.isPassing ? '#f0fff0' : '#fff0f0' }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {ev.isPassing ? <CheckCircleIcon sx={{ color: '#107c10', fontSize: 16 }} /> : <CancelIcon sx={{ color: '#d13438', fontSize: 16 }} />}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ev.title}</Typography>
                        </Box>
                        <Typography variant="caption">{ev.summary}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {selectedControl.gaps.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Gaps & Remediation</Typography>
                  {selectedControl.gaps.map((g, i) => (
                    <Card key={i} sx={{ mb: 1, borderLeft: '3px solid #d13438' }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Typography variant="body2">{g.gapDescription}</Typography>
                        <Typography variant="caption" sx={{ color: '#d13438' }}>
                          <strong>Remediation:</strong> {g.remediationSteps}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedControl(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Soc2ComplianceDashboard;

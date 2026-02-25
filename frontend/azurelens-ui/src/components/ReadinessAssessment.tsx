import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert,
  LinearProgress, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { AzureCredentials, ComplianceIssue } from '../types';
import { getReadinessAssessment } from '../services/api';
import { Soc2ReadinessReport, ReadinessCheckItem } from '../types';
import AIRemediationAgent from './AIRemediationAgent';

interface ReadinessAssessmentProps { credentials: AzureCredentials; }

const statusIcon = (s: string) => {
  if (s === 'Pass') return <CheckCircleIcon color="success" fontSize="small" />;
  if (s === 'Fail') return <CancelIcon color="error" fontSize="small" />;
  if (s === 'Partial') return <RemoveCircleIcon color="warning" fontSize="small" />;
  return <RemoveCircleIcon color="disabled" fontSize="small" />;
};

const statusColor = (s: string) => s === 'Pass' ? 'success' : s === 'Fail' ? 'error' : s === 'Partial' ? 'warning' : 'default';

const levelColor = (level: string) => {
  if (level === 'Audit Ready') return '#107c10';
  if (level === 'Substantially Ready') return '#0078d4';
  if (level === 'Partially Ready') return '#e67e00';
  return '#d13438';
};

const groupByCategory = (checks: ReadinessCheckItem[]) => {
  return checks.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, ReadinessCheckItem[]>);
};

const ScoreGauge: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const color = levelColor(level);
  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h1" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{Math.round(score)}</Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', mt: -0.5 }}>/ 100</Typography>
      </Box>
      <Box sx={{ mt: 1, px: 3 }}>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{ height: 12, borderRadius: 6, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: color } }}
        />
      </Box>
      <Chip label={level} sx={{ mt: 1.5, bgcolor: color, color: 'white', fontWeight: 700 }} />
    </Box>
  );
};

const ReadinessAssessment: React.FC<ReadinessAssessmentProps> = ({ credentials }) => {
  const [report, setReport] = useState<Soc2ReadinessReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { setReport(await getReadinessAssessment(credentials)); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (credentials.sessionId && credentials.subscriptionIds && credentials.subscriptionIds.length > 0) {
      load();
    }
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  if (loading) return <LoadingSpinner message="Assessing SOC2 readiness..." />;

  const noSubscription = !credentials.subscriptionIds || credentials.subscriptionIds.length === 0;
  const grouped = report ? groupByCategory(report.checks) : {};

  // Convert failed/partial checks to compliance issues for AI agent
  const failedIssues: ComplianceIssue[] = report?.checks
    .filter(c => c.status !== 'Pass')
    .map(check => ({
      controlId: check.controlReference || check.title,
      controlName: check.title,
      description: check.description + ' - ' + check.recommendation,
      severity: check.status === 'Fail' ? 'High' : 'Medium',
      status: 'Open',
      resourceId: '',
      resourceType: check.azureService || ''
    })) || [];

  return (
    <Box>
      {report && (
        <>
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 220 }}>
              <CardContent>
                <ScoreGauge score={report.readinessScore} level={report.readinessLevel} />
              </CardContent>
            </Card>

            <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {[
                  { label: 'Total Checks', value: report.totalChecks, color: '#0078d4' },
                  { label: 'Passed', value: report.passedChecks, color: '#107c10' },
                  { label: 'Partial', value: report.partialChecks, color: '#e67e00' },
                  { label: 'Failed', value: report.failedChecks, color: '#d13438' },
                ].map(kpi => (
                  <Card key={kpi.label} sx={{ flex: 1 }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color }}>{kpi.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              {report.criticalGaps.length > 0 && (
                <Card sx={{ bgcolor: '#fff5f5' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#d13438', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WarningAmberIcon fontSize="small" /> Critical Gaps ({report.criticalGaps.length})
                    </Typography>
                    {report.criticalGaps.slice(0, 4).map((g, i) => (
                      <Typography key={i} variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 0.5 }}>• {g}</Typography>
                    ))}
                  </CardContent>
                </Card>
              )}

              {report.quickWins.length > 0 && (
                <Card sx={{ bgcolor: '#f0fff4' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#107c10', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FlashOnIcon fontSize="small" /> Quick Wins ({report.quickWins.length})
                    </Typography>
                    {report.quickWins.slice(0, 4).map((w, i) => (
                      <Typography key={i} variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 0.5 }}>• {w}</Typography>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Box>
          </Box>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                SOC2 Readiness Checks by Category
              </Typography>
              {Object.entries(grouped).map(([category, checks]) => {
                const passed = checks.filter(c => c.status === 'Pass').length;
                const pct = Math.round((passed / checks.length) * 100);
                return (
                  <Accordion key={category} defaultExpanded={checks.some(c => c.status === 'Fail')}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, mr: 2 }}>
                        <Typography sx={{ fontWeight: 600 }}>{category}</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          color={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'}
                        />
                        <Typography variant="body2" sx={{ minWidth: 50 }}>{passed}/{checks.length}</Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              <TableCell width={36}></TableCell>
                              <TableCell><strong>Check</strong></TableCell>
                              <TableCell><strong>Control</strong></TableCell>
                              <TableCell><strong>Azure Service</strong></TableCell>
                              <TableCell><strong>Status</strong></TableCell>
                              <TableCell><strong>Recommendation</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {checks.map((c, i) => (
                              <TableRow key={i} hover sx={{ bgcolor: c.status === 'Fail' ? '#fff5f5' : 'inherit' }}>
                                <TableCell sx={{ textAlign: 'center' }}>{statusIcon(c.status)}</TableCell>
                                <TableCell sx={{ maxWidth: 200 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.title}</Typography>
                                  <Typography variant="caption" color="text.secondary">{c.description}</Typography>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.75rem' }}>{c.controlReference || '—'}</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem' }}>{c.azureService || '—'}</TableCell>
                                <TableCell>
                                  <Chip label={c.status} size="small" color={statusColor(c.status) as any} />
                                </TableCell>
                                <TableCell sx={{ maxWidth: 220, fontSize: '0.75rem', color: 'text.secondary' }}>
                                  {c.recommendation}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </CardContent>
          </Card>

          {/* AI Remediation Agent for Failed Checks */}
          {failedIssues.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <AIRemediationAgent
                credentials={credentials}
                complianceType="SOC2"
                issues={failedIssues}
              />
            </Box>
          )}
        </>
      )}
      {!loading && noSubscription && (
        <Alert severity="info">Select a subscription to run the SOC2 readiness assessment.</Alert>
      )}
      {!loading && !noSubscription && !report && (
        <Alert severity="warning">Unable to load readiness assessment. Please try refreshing the page or logging in again.</Alert>
      )}
    </Box>
  );
};

export default ReadinessAssessment;

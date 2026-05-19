import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, Tabs, Tab, IconButton, Tooltip, CircularProgress, Grid, Button,
} from '@mui/material';
import RouterIcon from '@mui/icons-material/Router';
import RefreshIcon from '@mui/icons-material/Refresh';
import PublicIcon from '@mui/icons-material/Public';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LoadingSpinner from './LoadingSpinner';
import { AzureCredentials } from '../types';
import { getNetworkSecurityReport, generateSingleRemediationSuggestion } from '../services/api';
import { NetworkSecurityReport as NetworkSecurityReportData } from '../types';

interface NetworkSecurityReportProps { credentials: AzureCredentials; }

const riskColor = (r: string) => r === 'Critical' ? 'error' : r === 'High' ? 'warning' : r === 'Medium' ? 'info' : 'default';

const NetworkSecurityReport: React.FC<NetworkSecurityReportProps> = ({ credentials }) => {
  const [report, setReport] = useState<NetworkSecurityReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [nsgAiInsights, setNsgAiInsights] = useState<Record<number, any>>({});
  const [loadingNsgAi, setLoadingNsgAi] = useState<number | null>(null);
  const [aiNsgOpen, setAiNsgOpen] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try { setReport(await getNetworkSecurityReport(credentials)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (credentials.sessionId) load();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  const handleNsgAiAnalysis = async (rule: any, index: number) => {
    // If already loaded, toggle display
    if (nsgAiInsights[index]) {
      setAiNsgOpen(aiNsgOpen === index ? null : index);
      return;
    }

    setLoadingNsgAi(index);
    try {
      const response = await generateSingleRemediationSuggestion(
        credentials,
        `NSG-${rule.ruleName}`,
        `Risky NSG Rule: ${rule.ruleName}`,
        rule.riskDescription,
        rule.riskLevel,
        rule.nsgName,
        'NetworkSecurityGroup',
        'Security'
      );

      if (response.success && response.suggestion) {
        setNsgAiInsights(prev => ({ ...prev, [index]: response.suggestion }));
        setAiNsgOpen(index);
      }
    } catch (error) {
      console.error('Error loading AI analysis for NSG rule:', error);
    } finally {
      setLoadingNsgAi(null);
    }
  };

  if (loading && !report) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {report && (
        <>
          {report.criticalRules > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {report.criticalRules} critical NSG rules expose resources to the internet (CC6.6). Review immediately.
            </Alert>
          )}
          {report.unattachedPublicIps > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {report.unattachedPublicIps} unattached public IP(s) are incurring cost with no purpose.
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {[
              { label: 'Critical Rules', value: report.criticalRules, color: '#d13438' },
              { label: 'High Risk Rules', value: report.highRiskRules, color: '#e67e00' },
              { label: 'Total Risky Rules', value: report.riskyNsgRules.length, color: '#5c2d91' },
              { label: 'Public IPs', value: report.publicIps.length, color: '#0078d4' },
              { label: 'Unattached IPs', value: report.unattachedPublicIps, color: '#d13438' },
              { label: 'Exposed Ports', value: report.internetExposedPorts, color: '#e67e00' },
            ].map(kpi => (
              <Card key={kpi.label} sx={{ flex: 1, minWidth: 120 }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: kpi.color }}>{kpi.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                  <Tab label={`Risky NSG Rules (${report.riskyNsgRules.length})`} icon={<RouterIcon />} iconPosition="start" />
                  <Tab label={`Public IPs (${report.publicIps.length})`} icon={<PublicIcon />} iconPosition="start" />
                </Tabs>
                <Button variant="outlined" size="small"
                  startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={load} disabled={loading}
                >
                  {loading ? 'Loading…' : 'Refresh'}
                </Button>
              </Box>

              {tab === 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>NSG</strong></TableCell>
                        <TableCell><strong>Rule</strong></TableCell>
                        <TableCell><strong>Source</strong></TableCell>
                        <TableCell><strong>Dest Port</strong></TableCell>
                        <TableCell><strong>Protocol</strong></TableCell>
                        <TableCell><strong>Priority</strong></TableCell>
                        <TableCell><strong>Risk</strong></TableCell>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell align="center"><strong>AI Analysis</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.riskyNsgRules.map((r, i) => (
                        <React.Fragment key={i}>
                          <TableRow hover>
                            <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nsgName}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{r.ruleName}</TableCell>
                            <TableCell><Chip label={r.sourceAddressPrefix} size="small" /></TableCell>
                            <TableCell><Chip label={r.destinationPortRange} size="small" variant="outlined" /></TableCell>
                            <TableCell>{r.protocol}</TableCell>
                            <TableCell>{r.priority}</TableCell>
                            <TableCell><Chip label={r.riskLevel} size="small" color={riskColor(r.riskLevel) as any} /></TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{r.riskDescription}</TableCell>
                            <TableCell align="center">
                              <Tooltip title={nsgAiInsights[i] ? "View AI Analysis" : "Get AI Analysis"}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleNsgAiAnalysis(r, i)}
                                  color={nsgAiInsights[i] ? "primary" : "default"}
                                >
                                  {loadingNsgAi === i ? (
                                    <CircularProgress size={16} />
                                  ) : nsgAiInsights[i] ? (
                                    <LightbulbIcon fontSize="small" />
                                  ) : (
                                    <PsychologyIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>

                          {/* Expandable AI Analysis Row */}
                          {aiNsgOpen === i && nsgAiInsights[i] && (
                            <TableRow>
                              <TableCell colSpan={9} sx={{ bgcolor: '#f8f9fa', borderLeft: '4px solid #0066CC', p: 0 }}>
                                <Box sx={{ p: 2 }}>
                                  {/* Header */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <LightbulbIcon sx={{ color: '#0066CC', fontSize: 28 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                                      {nsgAiInsights[i].title}
                                    </Typography>
                                    <Chip 
                                      label={nsgAiInsights[i].automation} 
                                      size="small"
                                      color={
                                        nsgAiInsights[i].automation === 'Automated' ? 'success' :
                                        nsgAiInsights[i].automation === 'SemiAutomated' ? 'warning' : 'default'
                                      }
                                    />
                                    <Chip label={`Effort: ${nsgAiInsights[i].effort}`} size="small" variant="outlined" />
                                    <Chip label={`Time: ${nsgAiInsights[i].timeEstimate}`} size="small" variant="outlined" />
                                  </Box>

                                  <Grid container spacing={2}>
                                    {/* Description */}
                                    <Grid item xs={12}>
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {nsgAiInsights[i].description}
                                      </Typography>
                                    </Grid>

                                    {/* Root Cause */}
                                    {nsgAiInsights[i].rootCause && (
                                      <Grid item xs={12}>
                                        <Alert severity="info" sx={{ mb: 1 }}>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Root Cause</Typography>
                                          <Typography variant="body2">{nsgAiInsights[i].rootCause}</Typography>
                                        </Alert>
                                      </Grid>
                                    )}

                                    {/* Remediation Steps */}
                                    <Grid item xs={12} md={6}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Remediation Steps</Typography>
                                      <Box component="ol" sx={{ pl: 2, m: 0 }}>
                                        {nsgAiInsights[i].remediationSteps?.map((step: string, idx: number) => (
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
                                      {nsgAiInsights[i].azureCliCommands && nsgAiInsights[i].azureCliCommands.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#0078D4' }}>Azure CLI:</Typography>
                                          <Paper sx={{ p: 1.5, bgcolor: '#1e1e1e', mt: 0.5 }}>
                                            {nsgAiInsights[i].azureCliCommands.slice(0, 3).map((cmd: string, idx: number) => (
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
                                      {nsgAiInsights[i].powerShellCommands && nsgAiInsights[i].powerShellCommands.length > 0 && (
                                        <Box>
                                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#0078D4' }}>PowerShell:</Typography>
                                          <Paper sx={{ p: 1.5, bgcolor: '#012456', mt: 0.5 }}>
                                            {nsgAiInsights[i].powerShellCommands.slice(0, 3).map((cmd: string, idx: number) => (
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
                                    {nsgAiInsights[i].complianceImpact && (
                                      <Grid item xs={12}>
                                        <Alert severity="warning">
                                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Security Impact</Typography>
                                          <Typography variant="body2">{nsgAiInsights[i].complianceImpact}</Typography>
                                        </Alert>
                                      </Grid>
                                    )}
                                  </Grid>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                      {report.riskyNsgRules.length === 0 && (
                        <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>No risky NSG rules found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {tab === 1 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>IP Address</strong></TableCell>
                        <TableCell><strong>Resource Group</strong></TableCell>
                        <TableCell><strong>Allocation</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Associated To</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.publicIps.map((ip, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ip.resourceName}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{ip.ipAddress || '—'}</TableCell>
                          <TableCell>{ip.resourceGroup}</TableCell>
                          <TableCell><Chip label={ip.allocationMethod} size="small" variant="outlined" /></TableCell>
                          <TableCell>
                            <Chip
                              label={ip.isAttached ? 'In Use' : 'Unattached'}
                              size="small"
                              color={ip.isAttached ? 'success' : 'warning'}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                            {ip.associatedTo || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {report.publicIps.length === 0 && (
                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No public IPs found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {!loading && !report && <Alert severity="info">Select a subscription to view network security data.</Alert>}
    </Box>
  );
};

export default NetworkSecurityReport;

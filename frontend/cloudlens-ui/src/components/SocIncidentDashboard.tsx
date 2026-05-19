import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Badge,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  AutoFixHigh as AutoFixIcon,
  Escalator as EscalatorIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { AzureCredentials, SocIncident, SocDashboardStats, RemediationAttempt } from '../types';
import {
  getSocDashboardStats,
  getSocIncidents,
  createSocIncident,
  processSoc1Remediation,
  escalateSocIncident,
  closeSocIncident,
  recordManualRemediation,
  generateSingleRemediationSuggestion,
} from '../services/api';

interface SocIncidentDashboardProps {
  credentials: AzureCredentials;
}

const SocIncidentDashboard: React.FC<SocIncidentDashboardProps> = ({ credentials }) => {
  const [stats, setStats] = useState<SocDashboardStats | null>(null);
  const [incidents, setIncidents] = useState<SocIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<SocIncident | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [remediateDialogOpen, setRemediateDialogOpen] = useState(false);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<Record<number, any>>({});
  const [loadingAi, setLoadingAi] = useState<number | null>(null);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'Medium',
    resourceId: '',
    resourceType: '',
  });

  useEffect(() => {
    loadData();
  }, [credentials]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, incidentsData] = await Promise.all([
        getSocDashboardStats(credentials),
        getSocIncidents(credentials),
      ]);
      setStats(statsData);
      setIncidents(incidentsData);
    } catch (error) {
      console.error('Error loading SOC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    try {
      await createSocIncident({
        ...newIncident,
        subscriptionId: credentials.subscriptionIds?.[0] || '',
      });
      setCreateDialogOpen(false);
      setNewIncident({
        title: '',
        description: '',
        severity: 'Medium',
        resourceId: '',
        resourceType: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating incident:', error);
    }
  };

  const handleSoc1Remediation = async (incidentId: number) => {
    try {
      await processSoc1Remediation(credentials, incidentId);
      loadData();
    } catch (error) {
      console.error('Error processing SOC1 remediation:', error);
    }
  };

  const handleAiAnalysis = async (incident: SocIncident) => {
    if (aiInsights[incident.id]) {
      // Toggle if already loaded
      setAiAnalysisOpen(aiAnalysisOpen === incident.id ? null : incident.id);
      return;
    }

    setLoadingAi(incident.id);
    try {
      const response = await generateSingleRemediationSuggestion(
        credentials,
        incident.incidentId,
        incident.title,
        incident.description,
        incident.severity,
        incident.resourceId,
        incident.resourceType,
        'SOC2'
      );

      if (response.success && response.suggestion) {
        setAiInsights(prev => ({ ...prev, [incident.id]: response.suggestion }));
        setAiAnalysisOpen(incident.id);
      }
    } catch (error) {
      console.error('Error loading AI analysis:', error);
    } finally {
      setLoadingAi(null);
    }
  };

  const handleEscalate = async () => {
    if (!selectedIncident) return;
    try {
      await escalateSocIncident(selectedIncident.id, 'Manual escalation');
      setEscalateDialogOpen(false);
      setSelectedIncident(null);
      loadData();
    } catch (error) {
      console.error('Error escalating incident:', error);
    }
  };

  const handleClose = async (incidentId: number) => {
    try {
      await closeSocIncident(incidentId, 'Resolved');
      loadData();
    } catch (error) {
      console.error('Error closing incident:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'SOC1':
        return 'success';
      case 'SOC2':
        return 'warning';
      case 'SOC3':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'remediated':
      case 'closed':
        return 'success';
      case 'inprogress':
        return 'info';
      case 'escalated':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    if (selectedTab === 0) return true; // All
    if (selectedTab === 1) return incident.currentTier === 'SOC1';
    if (selectedTab === 2) return incident.currentTier === 'SOC2';
    if (selectedTab === 3) return incident.currentTier === 'SOC3';
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon fontSize="large" />
        SOC Incident Management
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Incidents
                  </Typography>
                  <Typography variant="h4">{stats?.totalIncidents || 0}</Typography>
                  <Typography variant="caption" color="warning.main">
                    {stats?.activeIncidents || 0} active
                  </Typography>
                </Box>
                <AssignmentIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Auto-Remediated Today
                  </Typography>
                  <Typography variant="h4">{stats?.autoRemediatedToday || 0}</Typography>
                  <Typography variant="caption" color="success.main">
                    {stats?.autoRemediationSuccessRate?.toFixed(1) || 0}% success rate
                  </Typography>
                </Box>
                <AutoFixIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Escalated Today
                  </Typography>
                  <Typography variant="h4">{stats?.escalatedToday || 0}</Typography>
                  <Typography variant="caption">
                    SOC1: {stats?.soc1Incidents} | SOC2: {stats?.soc2Incidents} | SOC3: {stats?.soc3Incidents}
                  </Typography>
                </Box>
                <EscalatorIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Avg Resolution Time
                  </Typography>
                  <Typography variant="h4">{stats?.avgResolutionTimeHours?.toFixed(1) || 0}h</Typography>
                  <Typography variant="caption" color="info.main">
                    Mean time to resolve
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Workflow Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>SOC Escalation Workflow:</strong>
        </Typography>
        <Typography variant="caption">
          <strong>SOC1:</strong> Auto-remediation agent attempts automated fixes → Success: Incident closed |
          Failure: Escalate to SOC2
        </Typography>
        <br />
        <Typography variant="caption">
          <strong>SOC2:</strong> Manual/assisted remediation by security team → Success: Incident closed | Failure:
          Escalate to SOC3
        </Typography>
        <br />
        <Typography variant="caption">
          <strong>SOC3:</strong> Critical escalation requiring immediate attention and advanced remediation
        </Typography>
      </Alert>

      {/* Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="contained" color="primary" onClick={() => setCreateDialogOpen(true)}>
          Create Incident
        </Button>
        <Button variant="outlined" onClick={loadData}>
          Refresh
        </Button>
        
        {/* Smart Insights Badge */}
        {filteredIncidents.length > 0 && (
          <Chip 
            icon={<PsychologyIcon />}
            label={`${Object.keys(aiInsights).length} AI Insights Available`}
            color="primary"
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        )}
      </Box>

      {/* Tabs */}
      <Card>
        <Tabs value={selectedTab} onChange={(_, val) => setSelectedTab(val)}>
          <Tab label={<Badge badgeContent={incidents.length} color="primary">All Incidents</Badge>} />
          <Tab label={<Badge badgeContent={stats?.soc1Incidents} color="success">SOC1</Badge>} />
          <Tab label={<Badge badgeContent={stats?.soc2Incidents} color="warning">SOC2</Badge>} />
          <Tab label={<Badge badgeContent={stats?.soc3Incidents} color="error">SOC3</Badge>} />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Incident ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Current Tier</TableCell>
                <TableCell>Detected</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredIncidents.map((incident) => (
                <React.Fragment key={incident.id}>
                  <TableRow>
                    <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {incident.incidentId.substring(0, 8)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{incident.title}</Typography>
                    {incident.jiraTicketKey && (
                      <Chip label={incident.jiraTicketKey} size="small" sx={{ mt: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={incident.severity} color={getSeverityColor(incident.severity) as any} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={incident.status} color={getStatusColor(incident.status) as any} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={incident.currentTier} color={getTierColor(incident.currentTier) as any} size="small" />
                    {incident.escalationCount > 0 && (
                      <Tooltip title={`Escalated ${incident.escalationCount} time(s)`}>
                        <Chip
                          label={`↑${incident.escalationCount}`}
                          size="small"
                          sx={{ ml: 0.5 }}
                          color="warning"
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(incident.detectedAt).toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {/* AI Analysis Button */}
                      <Tooltip title={aiInsights[incident.id] ? "View AI Analysis" : "Get AI Analysis"}>
                        <IconButton
                          size="small"
                          color={aiInsights[incident.id] ? "primary" : "default"}
                          onClick={() => handleAiAnalysis(incident)}
                          disabled={loadingAi === incident.id}
                        >
                          {loadingAi === incident.id ? (
                            <CircularProgress size={16} />
                          ) : aiInsights[incident.id] ? (
                            <LightbulbIcon />
                          ) : (
                            <PsychologyIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      
                      {incident.currentTier === 'SOC1' && incident.status === 'New' && (
                        <Tooltip title="Attempt SOC1 Auto-Remediation">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleSoc1Remediation(incident.id)}
                          >
                            <AutoFixIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {incident.status !== 'Closed' && incident.status !== 'Remediated' && (
                        <Tooltip title="Escalate">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setEscalateDialogOpen(true);
                            }}
                          >
                            <EscalatorIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {incident.status !== 'Closed' && (
                        <Tooltip title="Close Incident">
                          <IconButton size="small" color="primary" onClick={() => handleClose(incident.id)}>
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => setSelectedIncident(incident)}>
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
                
                {/* AI Analysis Expandable Row */}
                {aiAnalysisOpen === incident.id && aiInsights[incident.id] && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ bgcolor: '#f8f9fa', borderLeft: '4px solid #0066CC' }}>
                      <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <LightbulbIcon color="primary" />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            AI-Powered Remediation Analysis
                          </Typography>
                          <Chip 
                            label={aiInsights[incident.id].automation} 
                            size="small" 
                            color={aiInsights[incident.id].automation === 'Automated' ? 'success' : 'warning'} 
                          />
                          <Chip label={`${aiInsights[incident.id].effort} Effort`} size="small" variant="outlined" />
                          <Chip label={aiInsights[incident.id].timeEstimate} size="small" icon={<InfoIcon />} />
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              🎯 {aiInsights[incident.id].title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {aiInsights[incident.id].description}
                            </Typography>
                          </Grid>

                          {aiInsights[incident.id].rootCause && (
                            <Grid item xs={12}>
                              <Alert severity="info" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  🔍 Root Cause
                                </Typography>
                                <Typography variant="body2">{aiInsights[incident.id].rootCause}</Typography>
                              </Alert>
                            </Grid>
                          )}

                          {aiInsights[incident.id].remediationSteps?.length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                ✅ Remediation Steps
                              </Typography>
                              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                                {aiInsights[incident.id].remediationSteps.map((step: string, i: number) => (
                                  <li key={i}>
                                    <Typography variant="body2">{step}</Typography>
                                  </li>
                                ))}
                              </ol>
                            </Grid>
                          )}

                          {(aiInsights[incident.id].azureCliCommands?.length > 0 || 
                            aiInsights[incident.id].powerShellCommands?.length > 0) && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                💻 Quick Fix Commands
                              </Typography>
                              {aiInsights[incident.id].azureCliCommands?.slice(0, 2).map((cmd: string, i: number) => (
                                <Paper 
                                  key={i} 
                                  sx={{ 
                                    p: 1, 
                                    mb: 0.5, 
                                    bgcolor: '#1e1e1e', 
                                    color: '#d4d4d4',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  <code>{cmd}</code>
                                </Paper>
                              ))}
                              {aiInsights[incident.id].powerShellCommands?.slice(0, 1).map((cmd: string, i: number) => (
                                <Paper 
                                  key={i} 
                                  sx={{ 
                                    p: 1, 
                                    mb: 0.5, 
                                    bgcolor: '#012456', 
                                    color: '#eee',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  <code>{cmd}</code>
                                </Paper>
                              ))}
                            </Grid>
                          )}

                          {aiInsights[incident.id].complianceImpact && (
                            <Grid item xs={12}>
                              <Alert severity="warning">
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  ⚠️ Compliance Impact
                                </Typography>
                                <Typography variant="body2">{aiInsights[incident.id].complianceImpact}</Typography>
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
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Incident Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New SOC Incident</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={newIncident.title}
              onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newIncident.description}
              onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={newIncident.severity}
                onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                label="Severity"
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Resource ID"
              fullWidth
              value={newIncident.resourceId}
              onChange={(e) => setNewIncident({ ...newIncident, resourceId: e.target.value })}
            />
            <TextField
              label="Resource Type"
              fullWidth
              value={newIncident.resourceType}
              onChange={(e) => setNewIncident({ ...newIncident, resourceType: e.target.value })}
              placeholder="e.g., Microsoft.Storage/storageAccounts"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateIncident} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onClose={() => setEscalateDialogOpen(false)}>
        <DialogTitle>Escalate Incident</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Escalate incident "{selectedIncident?.title}" to the next tier?
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Current tier: {selectedIncident?.currentTier}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEscalate} variant="contained" color="warning">
            Escalate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SocIncidentDashboard;

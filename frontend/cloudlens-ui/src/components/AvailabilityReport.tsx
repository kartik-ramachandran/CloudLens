import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert, LinearProgress, CircularProgress, Button,
} from '@mui/material';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BackupIcon from '@mui/icons-material/Backup';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoadingSpinner from './LoadingSpinner';
import { AzureCredentials } from '../types';
import { getAvailabilityReport } from '../services/api';
import { AvailabilityReport as AvailabilityReportData } from '../types';

interface AvailabilityReportProps { credentials: AzureCredentials; }

const levelColor = (l: string) => l === 'Critical' ? 'error' : l === 'Warning' ? 'warning' : l === 'Informational' ? 'info' : 'default';
const eventTypeColor = (t: string) => t === 'Incident' ? 'error' : t === 'Maintenance' ? 'warning' : 'info';

const AvailabilityReportComponent: React.FC<AvailabilityReportProps> = ({ credentials }) => {
  const [report, setReport] = useState<AvailabilityReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setReport(await getAvailabilityReport(credentials)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (credentials.sessionId) load();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  if (loading && !report) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={load} disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </Box>
      {report && (
        <>
          {report.activeIncidents > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {report.activeIncidents} active service health incident(s) detected. Review immediately.
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {[
              { label: 'With Backup', value: report.resourcesWithBackup, color: '#107c10' },
              { label: 'Without Backup', value: report.resourcesWithoutBackup, color: '#d13438' },
              { label: 'Active Incidents', value: report.activeIncidents, color: '#e67e00' },
              { label: 'Health Events', value: report.serviceHealthEvents.length, color: '#0078d4' },
            ].map(kpi => (
              <Card key={kpi.label} sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: kpi.color }}>{kpi.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </CardContent>
              </Card>
            ))}
            <Card sx={{ flex: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>Backup Coverage</Typography>
                <LinearProgress
                  variant="determinate"
                  value={report.backupCoveragePercent}
                  sx={{ height: 10, borderRadius: 5, mb: 1 }}
                  color={report.backupCoveragePercent >= 80 ? 'success' : report.backupCoveragePercent >= 50 ? 'warning' : 'error'}
                />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{report.backupCoveragePercent}% Coverage</Typography>
              </CardContent>
            </Card>
          </Box>

          {report.serviceHealthEvents.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  <HealthAndSafetyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Service Health Events
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Title</strong></TableCell>
                        <TableCell><strong>Service</strong></TableCell>
                        <TableCell><strong>Region</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Start</strong></TableCell>
                        <TableCell><strong>Level</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.serviceHealthEvents.map((ev, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</TableCell>
                          <TableCell>{ev.serviceName}</TableCell>
                          <TableCell>{ev.region}</TableCell>
                          <TableCell><Chip label={ev.eventType} size="small" color={eventTypeColor(ev.eventType) as any} /></TableCell>
                          <TableCell>{ev.status}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                            {ev.startTime ? new Date(ev.startTime).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell><Chip label={ev.level} size="small" color={levelColor(ev.level) as any} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                <BackupIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Backup Status (A1 — Availability)
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Resource</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Resource Group</strong></TableCell>
                      <TableCell><strong>Backup</strong></TableCell>
                      <TableCell><strong>Last Backup</strong></TableCell>
                      <TableCell><strong>Vault</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.backupStatuses.slice(0, 100).map((b, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.resourceName}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{b.resourceType.split('/').slice(-1)[0]}</TableCell>
                        <TableCell>{b.resourceGroup}</TableCell>
                        <TableCell>
                          <Chip
                            label={b.hasBackup ? 'Protected' : 'Unprotected'}
                            size="small"
                            color={b.hasBackup ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {b.lastBackupTime ? new Date(b.lastBackupTime).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{b.vaultName ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {report.backupStatuses.length === 0 && (
                      <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No backup data found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {report.backupStatuses.length > 100 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing 100 of {report.backupStatuses.length} resources
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {!loading && !report && <Alert severity="info">Select a subscription to view availability data.</Alert>}
    </Box>
  );
};

export default AvailabilityReportComponent;

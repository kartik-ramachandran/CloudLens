import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert,
  Tabs, Tab, TextField, InputAdornment, Button, CircularProgress,
} from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoadingSpinner from './LoadingSpinner';
import { AzureCredentials } from '../types';
import { getAccessReviewSummary } from '../services/api';
import { AccessReviewSummary } from '../types';

interface AccessReviewDashboardProps { credentials: AzureCredentials; }

const roleColor = (role: string) => {
  if (role === 'Owner') return 'error';
  if (role === 'Contributor') return 'warning';
  if (role === 'User Access Administrator') return 'error';
  return 'default';
};

const AccessReviewDashboard: React.FC<AccessReviewDashboardProps> = ({ credentials }) => {
  const [summary, setSummary] = useState<AccessReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setSummary(await getAccessReviewSummary(credentials)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (credentials.sessionId) load();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  if (loading && !summary) return <LoadingSpinner message="Loading access reviews..." />;

  const filter = (name: string) => !search || name.toLowerCase().includes(search.toLowerCase());

  const KpiCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <Card sx={{ flex: 1 }}>
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {summary && (
        <>
          {summary.privilegedCount > 5 && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              {summary.privilegedCount} privileged users (Owner/Contributor) detected — review regularly for CC6.1 compliance.
            </Alert>
          )}
          {summary.guestCount > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {summary.guestCount} guest/external users have access. Ensure each is approved and documented.
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <KpiCard label="Total Assignments" value={summary.totalAssignments} color="#0078d4" />
            <KpiCard label="Owners" value={summary.ownerCount} color="#d13438" />
            <KpiCard label="Contributors" value={summary.contributorCount} color="#e67e00" />
            <KpiCard label="Readers" value={summary.readerCount} color="#107c10" />
            <KpiCard label="Guest Users" value={summary.guestCount} color="#8764b8" />
          </Box>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  <ManageAccountsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Access Review
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField size="small" placeholder="Search by name or role..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                  />
                  <Button variant="outlined" size="small"
                    startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                    onClick={load} disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Refresh'}
                  </Button>
                </Box>
              </Box>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label={`All Assignments (${summary.totalAssignments})`} />
                <Tab label={`Privileged (${summary.privilegedCount})`} />
                <Tab label={`Guest Users (${summary.guestCount})`} />
              </Tabs>

              {[summary.assignments, summary.privilegedUsers, summary.guestUsers][tab] && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Principal</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Role</strong></TableCell>
                        <TableCell><strong>Scope</strong></TableCell>
                        <TableCell><strong>Flags</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {([summary.assignments, summary.privilegedUsers, summary.guestUsers][tab] ?? [])
                        .filter(a => filter(a.principalName) || filter(a.roleDefinitionName))
                        .slice(0, 200)
                        .map((a, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.principalName}
                            </TableCell>
                            <TableCell><Chip label={a.principalType || 'User'} size="small" /></TableCell>
                            <TableCell>
                              <Chip label={a.roleDefinitionName} size="small"
                                color={roleColor(a.roleDefinitionName) as any} />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                              {a.scope}
                            </TableCell>
                            <TableCell>
                              {a.isGuest && <Chip label="Guest" size="small" color="warning" sx={{ mr: 0.5 }} />}
                              {a.isPrivileged && <Chip label="Privileged" size="small" color="error" />}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {!loading && !summary && (
        <Alert severity="info">Select a subscription and allow data to load.</Alert>
      )}
    </Box>
  );
};

export default AccessReviewDashboard;

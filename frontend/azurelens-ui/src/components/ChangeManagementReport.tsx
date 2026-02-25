import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Alert,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel, CircularProgress
} from '@mui/material';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import LoadingSpinner from './LoadingSpinner';
import { AzureCredentials } from '../types';
import { getChangeManagementReport } from '../services/api';
import { ChangeManagementReportData } from '../types';

interface ChangeManagementReportProps { credentials: AzureCredentials; }

const ChangeManagementReport: React.FC<ChangeManagementReportProps> = ({ credentials }) => {
  const [report, setReport] = useState<ChangeManagementReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(30);
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { setReport(await getChangeManagementReport(credentials, days)); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (credentials.sessionId) load();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(','), days]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  const filtered = (report?.events ?? []).filter(e => {
    const matchSearch = !search || e.caller.toLowerCase().includes(search.toLowerCase())
      || e.resourceName.toLowerCase().includes(search.toLowerCase())
      || e.operationName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || (typeFilter === 'Write' && e.isWrite && !e.isDelete) || (typeFilter === 'Delete' && e.isDelete);
    return matchSearch && matchType;
  });

  return (
    <Box>
      {report && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {[
              { label: 'Total Changes', value: report.totalChanges, color: '#0078d4' },
              { label: 'Write/Create', value: report.writeOperations, color: '#107c10' },
              { label: 'Delete', value: report.deleteOperations, color: '#d13438' },
              { label: 'Unique Actors', value: report.topActors.length, color: '#8764b8' },
            ].map(kpi => (
              <Card key={kpi.label} sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: kpi.color }}>{kpi.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {report.topActors.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Top Change Actors</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {report.topActors.map((a, i) => <Chip key={i} label={a} size="small" variant="outlined" />)}
                </Box>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  <ChangeCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Activity Log
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Days</InputLabel>
                    <Select value={days} label="Days" onChange={e => setDays(Number(e.target.value))}>
                      {[7, 14, 30, 60, 90].map(d => <MenuItem key={d} value={d}>{d} days</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                      <MenuItem value="All">All</MenuItem>
                      <MenuItem value="Write">Write</MenuItem>
                      <MenuItem value="Delete">Delete</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Timestamp</strong></TableCell>
                      <TableCell><strong>Operation</strong></TableCell>
                      <TableCell><strong>Resource</strong></TableCell>
                      <TableCell><strong>Resource Group</strong></TableCell>
                      <TableCell><strong>Caller</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 200).map((e, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                          {e.eventTimestamp ? new Date(e.eventTimestamp).toLocaleString() : ''}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                          {e.operationName.split('/').slice(-2).join('/')}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.resourceName}
                        </TableCell>
                        <TableCell>{e.resourceGroup}</TableCell>
                        <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                          {e.caller}
                        </TableCell>
                        <TableCell>
                          <Chip label={e.isDelete ? 'Delete' : 'Write'} size="small"
                            color={e.isDelete ? 'error' : 'success'}
                            icon={e.isDelete ? <DeleteIcon /> : <EditIcon />} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {filtered.length > 200 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing 200 of {filtered.length} events
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {!loading && !report && <Alert severity="info">Select a subscription to view the change log.</Alert>}
    </Box>
  );
};

export default ChangeManagementReport;

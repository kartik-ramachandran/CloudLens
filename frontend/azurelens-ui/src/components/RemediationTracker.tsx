import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Alert, CircularProgress, IconButton, Tooltip, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import BuildIcon from '@mui/icons-material/Build';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AzureCredentials, RemediationItem, RemediationItemDto, ComplianceIssue } from '../types';
import { getRemediationItems, createRemediationItem, updateRemediationItem, deleteRemediationItem, createJiraTicketForRemediation } from '../services/api';
import AIRemediationAgent from './AIRemediationAgent';

interface RemediationTrackerProps { credentials: AzureCredentials; }

const severityColor = (s: string) => s === 'Critical' ? 'error' : s === 'High' ? 'warning' : s === 'Medium' ? 'info' : 'default';
const statusColor = (s: string) => s === 'Resolved' ? 'success' : s === 'InProgress' ? 'warning' : 'default';

const emptyDto: RemediationItemDto = {
  controlId: '', gapDescription: '', severity: 'Medium', owner: '',
  targetDate: '', status: 'Open', subscriptionId: '', resourceId: '',
  remediationSteps: '', notes: ''
};

const RemediationTracker: React.FC<RemediationTrackerProps> = ({ credentials }) => {
  const [items, setItems] = useState<RemediationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<RemediationItem | null>(null);
  const [form, setForm] = useState<RemediationItemDto>(emptyDto);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const subId = credentials.subscriptionIds?.[0];

  const load = async () => {
    setLoading(true);
    try { setItems(await getRemediationItems(credentials)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [credentials]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...emptyDto, subscriptionId: subId ?? '' });
    setDialogOpen(true);
  };

  const openEdit = (item: RemediationItem) => {
    setEditItem(item);
    setForm({ controlId: item.controlId, gapDescription: item.gapDescription, severity: item.severity, owner: item.owner, targetDate: item.targetDate, status: item.status, subscriptionId: item.subscriptionId, resourceId: item.resourceId, remediationSteps: item.remediationSteps, notes: item.notes });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) await updateRemediationItem(editItem.id, form);
      else await createRemediationItem(form);
      setDialogOpen(false);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this remediation item?')) return;
    await deleteRemediationItem(id);
    await load();
  };

  const handleJira = async (id: number) => {
    try {
      await createJiraTicketForRemediation(id);
      setMessage('Jira ticket created!');
      await load();
      setTimeout(() => setMessage(''), 4000);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    }
  };

  const open = items.filter(i => i.status === 'Open').length;
  const inProgress = items.filter(i => i.status === 'InProgress').length;
  const resolved = items.filter(i => i.status === 'Resolved').length;
  const total = items.length;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Convert remediation items to compliance issues for AI agent
  const complianceIssues: ComplianceIssue[] = items
    .filter(item => item.status !== 'Resolved')
    .map(item => ({
      controlId: item.controlId,
      controlName: item.controlId,
      description: item.gapDescription,
      severity: item.severity,
      status: item.status,
      resourceId: item.resourceId,
      resourceType: ''
    }));

  return (
    <Box>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[{ l: 'Open', v: open, c: '#d13438' }, { l: 'In Progress', v: inProgress, c: '#e67e00' }, { l: 'Resolved', v: resolved, c: '#107c10' }].map(k => (
          <Card key={k.l} sx={{ flex: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: k.c }}>{k.v}</Typography>
      {/* AI Remediation Agent */}
      {complianceIssues.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <AIRemediationAgent
            credentials={credentials}
            complianceType="SOC2"
            issues={complianceIssues}
          />
        </Box>
      )}

              <Typography variant="body2" color="text.secondary">{k.l}</Typography>
            </CardContent>
          </Card>
        ))}
        <Card sx={{ flex: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Remediation Progress</Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5, mb: 1 }} color={progress >= 75 ? 'success' : progress >= 50 ? 'warning' : 'error'} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{progress}% Complete</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <BuildIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Remediation Items
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small"
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={load} disabled={loading}
              >
                {loading ? 'Loading…' : 'Refresh'}
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} size="small">
                Add Item
              </Button>
            </Box>
          </Box>

          {loading ? <CircularProgress /> : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Control</strong></TableCell>
                    <TableCell><strong>Gap</strong></TableCell>
                    <TableCell><strong>Severity</strong></TableCell>
                    <TableCell><strong>Owner</strong></TableCell>
                    <TableCell><strong>Target Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Jira</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} hover>
                      <TableCell><Chip label={item.controlId} size="small" /></TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.gapDescription}</TableCell>
                      <TableCell><Chip label={item.severity} size="small" color={severityColor(item.severity) as any} /></TableCell>
                      <TableCell>{item.owner || '—'}</TableCell>
                      <TableCell>{item.targetDate ? new Date(item.targetDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell><Chip label={item.status} size="small" color={statusColor(item.status) as any} /></TableCell>
                      <TableCell>
                        {item.jiraTicketKey ? (
                          <Chip label={item.jiraTicketKey} size="small" color="primary" component="a" href={item.jiraTicketUrl ?? '#'} target="_blank" clickable />
                        ) : (
                          <Tooltip title="Create Jira ticket">
                            <IconButton size="small" onClick={() => handleJira(item.id)}><LinkIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>No remediation items yet. Add items from the Gap Analysis tab in SOC2 Controls.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? 'Edit Remediation Item' : 'Add Remediation Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Control ID" value={form.controlId} onChange={e => setForm({ ...form, controlId: e.target.value })} size="small" placeholder="e.g. CC6.1" />
            <TextField label="Gap Description" value={form.gapDescription} onChange={e => setForm({ ...form, gapDescription: e.target.value })} size="small" multiline rows={2} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Severity</InputLabel>
                <Select value={form.severity} label="Severity" onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {['Critical', 'High', 'Medium', 'Low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['Open', 'InProgress', 'Resolved'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <TextField label="Owner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} size="small" />
            <TextField label="Target Date" type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} size="small" InputLabelProps={{ shrink: true }} />
            <TextField label="Remediation Steps" value={form.remediationSteps} onChange={e => setForm({ ...form, remediationSteps: e.target.value })} size="small" multiline rows={3} />
            <TextField label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} size="small" multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={16} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RemediationTracker;

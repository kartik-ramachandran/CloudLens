import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip,
  TextField, InputAdornment, Accordion, AccordionSummary,
  AccordionDetails, TablePagination, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, Select, MenuItem, FormControl, Badge, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AzureCredentials, SecurityRecommendation } from '../types';
import { getSecurityRecommendations } from '../services/api';
import { DS, SectionHeader, StyledHeadCell, styledRowSx, EmptyState } from '../theme/designSystem';

interface RecommendationsTabProps {
  credentials: AzureCredentials;
  compact?: boolean;
}

const SEVERITY_COLOR: Record<string, string> = { high: '#d13438', medium: '#ff8c00', low: '#107c10' };

const RecommendationsTab: React.FC<RecommendationsTabProps> = ({
  credentials, compact = false,
}) => {
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSecurityRecommendations(credentialsRef.current);
      setRecommendations(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load security recommendations.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchRecommendations();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  // Compute unique values for filters
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    recommendations.forEach(rec => {
      if (rec.category) cats.add(rec.category);
    });
    return Array.from(cats);
  }, [recommendations]);

  const uniqueSeverities = useMemo(() => {
    const sevs = new Set<string>();
    sevs.add('All');
    recommendations.forEach(rec => {
      if (rec.severity) sevs.add(rec.severity);
    });
    return Array.from(sevs);
  }, [recommendations]);

  const uniqueStatuses = useMemo(() => {
    const stats = new Set<string>();
    stats.add('All');
    recommendations.forEach(rec => {
      if (rec.status) stats.add(rec.status);
    });
    return Array.from(stats);
  }, [recommendations]);

  // Compute active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'All') count++;
    if (severityFilter !== 'All') count++;
    if (statusFilter !== 'All') count++;
    return count;
  }, [categoryFilter, severityFilter, statusFilter]);

  // Clear all filters
  const clearFilters = () => {
    setCategoryFilter('All');
    setSeverityFilter('All');
    setStatusFilter('All');
    setSearchTerm('');
  };

  const filteredRecommendations = recommendations.filter(rec => {
    const searchMatch = rec.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || rec.category === categoryFilter;
    const matchesSeverity = severityFilter === 'All' || rec.severity === severityFilter;
    const matchesStatus = statusFilter === 'All' || rec.status === statusFilter;
    
    return searchMatch && matchesCategory && matchesSeverity && matchesStatus;
  });

  const displayRecommendations = filteredRecommendations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':   return <ErrorIcon sx={{ color: SEVERITY_COLOR.high }} />;
      case 'medium': return <WarningIcon sx={{ color: SEVERITY_COLOR.medium }} />;
      default:       return <InfoIcon sx={{ color: SEVERITY_COLOR.low }} />;
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <SectionHeader icon={<SecurityIcon />}>
            Recommendations
          </SectionHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!compact && (
              <TextField
                size="small" variant="outlined" placeholder="Search recommendations…"
                value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                sx={{ width: 280 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={fetchRecommendations}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {displayRecommendations.length === 0 ? (
          <EmptyState
            icon={<SecurityIcon />}
            title={loading ? 'Loading recommendations…' : recommendations.length === 0 ? 'No security recommendations found' : 'No recommendations match your search'}
            subtitle={!loading && recommendations.length === 0 ? 'Your resources may be secure, or Security Center is still analyzing your environment.' : undefined}
          />
        ) : compact ? (
          /* Compact mode: MUI Table */
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <StyledHeadCell>Recommendation</StyledHeadCell>
                  <StyledHeadCell>Category</StyledHeadCell>
                  <StyledHeadCell align="center">Severity</StyledHeadCell>
                  <StyledHeadCell align="center">Status</StyledHeadCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ py: 1, px: 1 }}>
                    <TextField
                      fullWidth
                      size="small" 
                      variant="outlined"
                      placeholder="Search…"
                      value={searchTerm} 
                      onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 16 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ bgcolor: 'background.paper' }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1 }}>
                    <FormControl fullWidth size="small">
                      <Select 
                        value={categoryFilter} 
                        displayEmpty
                        onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        {uniqueCategories.map(cat => (
                          <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1 }}>
                    <FormControl fullWidth size="small">
                      <Select 
                        value={severityFilter} 
                        displayEmpty
                        onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        {uniqueSeverities.map(sev => (
                          <MenuItem key={sev} value={sev}>{sev}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                        <Select 
                          value={statusFilter} 
                          displayEmpty
                          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                          sx={{ bgcolor: 'background.paper' }}
                        >
                          {uniqueStatuses.map(stat => (
                            <MenuItem key={stat} value={stat}>{stat}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {activeFilterCount > 0 && (
                        <IconButton size="small" onClick={clearFilters} title="Clear all filters">
                          <ClearIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      {activeFilterCount > 0 && (
                        <Badge badgeContent={activeFilterCount} color="primary">
                          <FilterListIcon sx={{ fontSize: 16 }} />
                        </Badge>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRecommendations.map((rec) => (
                  <TableRow key={rec.id} sx={styledRowSx}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{rec.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rec.description.length > 80 ? rec.description.substring(0, 80) + '…' : rec.description}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip label={rec.category} size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip
                        label={rec.severity} size="small"
                        sx={{ bgcolor: SEVERITY_COLOR[rec.severity.toLowerCase()] || DS.accent, color: 'white', fontWeight: 600, fontSize: '0.68rem' }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Chip label={rec.status} size="small" sx={{ background: DS.gradSubtle, border: DS.border, fontSize: '0.68rem' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          /* Full mode: Accordions */
          <Box>
            {/* Filter Controls for Full Mode */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select 
                  value={categoryFilter} 
                  displayEmpty
                  onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
                >
                  {uniqueCategories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select 
                  value={severityFilter} 
                  displayEmpty
                  onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
                >
                  {uniqueSeverities.map(sev => (
                    <MenuItem key={sev} value={sev}>{sev}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select 
                  value={statusFilter} 
                  displayEmpty
                  onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                >
                  {uniqueStatuses.map(stat => (
                    <MenuItem key={stat} value={stat}>{stat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {activeFilterCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Badge badgeContent={activeFilterCount} color="primary">
                    <FilterListIcon sx={{ fontSize: 18 }} />
                  </Badge>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </Box>
              )}
            </Box>
            {displayRecommendations.map(rec => (
              <Accordion key={rec.id} sx={{
                mb: 1, border: DS.border, borderRadius: '8px !important',
                background: DS.gradSubtle,
                '&:before': { display: 'none' },
                '&.Mui-expanded': { boxShadow: DS.shadow },
              }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: DS.accent }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    {getSeverityIcon(rec.severity)}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{rec.displayName}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={rec.severity} size="small"
                          sx={{ bgcolor: SEVERITY_COLOR[rec.severity.toLowerCase()] || DS.accent, color: 'white', fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                        />
                        <Chip label={rec.category} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                        <Chip label={rec.status} size="small" sx={{ background: DS.gradSubtle, border: DS.border, fontSize: '0.65rem', height: 20 }} />
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(0,0,0,0.03)', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      <strong>Description:</strong> {rec.description}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', display: 'block', mb: rec.remediationSteps ? 1.5 : 0 }}>
                      <strong>Resource:</strong> {rec.resourceId}
                    </Typography>
                    {rec.remediationSteps && (
                      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(102,126,234,0.06)', borderRadius: 2, borderLeft: `3px solid ${DS.accent}` }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: DS.accent }}>
                          REMEDIATION STEPS
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{rec.remediationSteps}</Typography>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {filteredRecommendations.length > 0 && (
          <TablePagination
            component="div" count={filteredRecommendations.length} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100, 250, 500]}
            sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1 }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationsTab;

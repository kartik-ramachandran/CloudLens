import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Chip,
  TextField, InputAdornment, Accordion, AccordionSummary,
  AccordionDetails, TablePagination, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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

  const filteredRecommendations = recommendations.filter(rec =>
    rec.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          /* Full mode: Accordions */
          <Box>
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

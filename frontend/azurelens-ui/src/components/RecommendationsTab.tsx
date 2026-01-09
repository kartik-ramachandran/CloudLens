import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TablePagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { SecurityRecommendation } from '../types';

interface RecommendationsTabProps {
  recommendations: SecurityRecommendation[];
  compact?: boolean;
  loading?: boolean;
  error?: string;
}

const RecommendationsTab: React.FC<RecommendationsTabProps> = ({ recommendations, compact = false, loading = false, error = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredRecommendations = recommendations.filter((rec) =>
    rec.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayRecommendations = filteredRecommendations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <ErrorIcon color="error" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityColor = (severity: string): "error" | "warning" | "info" | "default" => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Card sx={{ height: compact ? 'auto' : 'auto' }}>
      <CardContent>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Recommendations
            {loading && (
              <CircularProgress size={16} sx={{ ml: 2, verticalAlign: 'middle' }} />
            )}
          </Typography>
          {!compact && (
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search recommendations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {displayRecommendations.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            {loading 
              ? 'Loading recommendations...'
              : recommendations.length === 0 
                ? 'No security recommendations found. This could mean your resources are secure, or the Security Center is still analyzing your environment.'
                : 'No recommendations match your search criteria.'
            }
          </Typography>
        ) : compact ? (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Recommendation</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Impact</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Resources</th>
                </tr>
              </thead>
              <tbody>
                {displayRecommendations.map((rec, index) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{rec.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {rec.description.substring(0, 80)}{rec.description.length > 80 ? '...' : ''}
                      </Typography>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <Chip label={rec.category} size="small" sx={{ fontSize: '0.75rem' }} />
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <Chip 
                        label={rec.severity} 
                        size="small" 
                        color={getSeverityColor(rec.severity)}
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>1</Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        ) : (
          <Box>
            {displayRecommendations.map((rec) => (
              <Accordion key={rec.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    {getSeverityIcon(rec.severity)}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">{rec.displayName}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={rec.severity} 
                          size="small" 
                          color={getSeverityColor(rec.severity)}
                        />
                        <Chip label={rec.category} size="small" variant="outlined" />
                        <Chip label={rec.status} size="small" />
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    <strong>Description:</strong> {rec.description}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Resource:</strong> {rec.resourceId}
                  </Typography>

                  {rec.remediationSteps && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Remediation Steps:</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {rec.remediationSteps}
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
        {filteredRecommendations.length > 0 && (
          <TablePagination
            component="div"
            count={filteredRecommendations.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            sx={{ borderTop: '1px solid #e0e0e0', mt: 2 }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationsTab;

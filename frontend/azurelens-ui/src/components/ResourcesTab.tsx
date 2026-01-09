import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Grid,
  TablePagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { AzureResource, AzureCredentials } from '../types';
import { getAzureResources } from '../services/api';

interface ResourcesTabProps {
  credentials: AzureCredentials;
  compact?: boolean;
}

const ResourcesTab: React.FC<ResourcesTabProps> = ({ credentials, compact = false }) => {
  const [resources, setResources] = useState<AzureResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAzureResources(credentials);
        setResources(data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch resources');
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [credentials]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Helper to get subscription name from ID
  const getSubscriptionName = (subscriptionId: string): string => {
    const sub = credentials?.subscriptions?.find(s => s.subscriptionId === subscriptionId);
    return sub?.displayName || subscriptionId.substring(0, 8) + '...';
  };

  const filteredResources = resources.filter((resource) => {
    const subName = getSubscriptionName(resource.subscriptionId);
    return resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.resourceGroup.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const displayResources = filteredResources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Card sx={{ height: compact ? 'auto' : 'auto' }}>
      <CardContent>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Resources
            {loading && (
              <CircularProgress size={16} sx={{ ml: 2, verticalAlign: 'middle' }} />
            )}
          </Typography>
          {!compact && (
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search Resource, Type..."
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

        {displayResources.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            {loading ? 'Loading resources...' : 'No resources found'}
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Resource Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Subscription</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Location</th>
                  {!compact && <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Resource Group</th>}
                  {!compact && <th style={{ textAlign: 'left', padding: '12px 8px', color: '#7f8c8d', fontWeight: 600, fontSize: '0.875rem' }}>Resource ID</th>}
                </tr>
              </thead>
              <tbody>
                {displayResources.map((resource, index) => (
                  <tr key={resource.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{resource.name}</Typography>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {getSubscriptionName(resource.subscriptionId)}
                      </Typography>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <Chip label={resource.type.split('/').pop()} size="small" sx={{ fontSize: '0.75rem' }} />
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{resource.location}</Typography>
                    </td>
                    {!compact && (
                      <td style={{ padding: '12px 8px' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {resource.resourceGroup}
                        </Typography>
                      </td>
                    )}
                    {!compact && (
                      <td style={{ padding: '12px 8px' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {resource.id}
                        </Typography>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
        {filteredResources.length > 0 && (
          <TablePagination
            component="div"
            count={filteredResources.length}
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

export default ResourcesTab;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  InputAdornment,
  Alert,
  Grid,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import { CostData, MonthlyCost, ResourceCostData, AzureCredentials } from '../types';
import { getResourceCosts, getAzureCosts } from '../services/api';

interface CostsTabProps {
  credentials: AzureCredentials;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

const CostsTab: React.FC<CostsTabProps> = ({ credentials }) => {
  const [costs, setCosts] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [resourceCosts, setResourceCosts] = useState<ResourceCostData[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date range filters
  const [resourceStartDate, setResourceStartDate] = useState('');
  const [resourceEndDate, setResourceEndDate] = useState('');

  // Fetch costs based on selected subscription(s)
  useEffect(() => {
    const fetchCosts = async () => {
      setLoading(true);
      setError('');
      try {
        // Use credentials with filtered subscriptionIds from parent
        const data = await getAzureCosts(credentials);
        setCosts(data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch costs');
      } finally {
        setLoading(false);
      }
    };
    fetchCosts();
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  // Initialize default date ranges
  useEffect(() => {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    
    setResourceStartDate(threeMonthsAgo.toISOString().split('T')[0]);
    setResourceEndDate(today.toISOString().split('T')[0]);
  }, []);

  const totalCost = costs.reduce((sum, cost) => sum + cost.totalCost, 0);

  // Helper function to get subscription name from resource ID
  const getSubscriptionName = (resourceId: string): string => {
    // Extract subscription ID from resource ID format: /subscriptions/{guid}/...
    const match = resourceId.match(/\/subscriptions\/([^\/]+)/);
    if (match && match[1]) {
      const subscriptionId = match[1];
      // Find matching subscription in credentials
      const subscription = credentials.subscriptions?.find(s => s.subscriptionId === subscriptionId);
      return subscription?.displayName || subscriptionId.substring(0, 8) + '...';
    }
    return 'Unknown';
  };

  const fetchResourceCosts = async () => {
    if (!resourceStartDate || !resourceEndDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoadingResources(true);
    setError('');

    try {
      const data = await getResourceCosts(credentials, resourceStartDate, resourceEndDate);
      setResourceCosts(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Session expired. Please reconnect.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load resource cost data');
      }
    } finally {
      setLoadingResources(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredResources = resourceCosts.filter(resource =>
    (resource.resourceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.resourceType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.resourceGroup || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedResources = filteredResources.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Prepare pie chart data from costs by service
  const serviceCostData = costs.length > 0 && costs[0].costsByService
    ? costs[0].costsByService.map(service => ({
        name: service.serviceName,
        value: service.cost,
      }))
    : [];

  return (
    <Box>
      {/* External error from parent */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Cost Overview Card */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TrendingUpIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Cost Overview
                {loading && (
                  <CircularProgress size={20} sx={{ ml: 2, color: 'white', verticalAlign: 'middle' }} />
                )}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {credentials.subscriptionIds && credentials.subscriptionIds.length > 0
                  ? `${credentials.subscriptionIds.length} subscription${credentials.subscriptionIds.length > 1 ? 's' : ''} selected`
                  : 'All subscriptions'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h2" sx={{ fontWeight: 700 }}>
              ${totalCost.toFixed(2)}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Last 30 Days
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Current Costs" />
          <Tab label="Cost by Resource" />
        </Tabs>
      </Box>

      {/* Tab 0: Current Costs */}
      {tabValue === 0 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Cost by Subscription
              </Typography>
              {costs.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No cost data available. Cost data may take 24-48 hours to appear after resource creation.
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Subscription</strong></TableCell>
                        <TableCell><strong>Period</strong></TableCell>
                        <TableCell align="right"><strong>Total Cost</strong></TableCell>
                        <TableCell align="center"><strong>Currency</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {costs.map((cost) => (
                        <TableRow key={cost.subscriptionId}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {cost.subscriptionName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {cost.subscriptionId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(cost.startDate).toLocaleDateString()} - {new Date(cost.endDate).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              ${cost.totalCost.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={cost.currency} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Cost by Service Pie Chart */}
          {serviceCostData.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Cost by Service
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={serviceCostData}
                      cx="40%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {serviceCostData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Tab 1: Cost by Resource */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Cost by Resource
              </Typography>
            </Box>

            {/* Date Range Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={resourceStartDate}
                  onChange={(e) => setResourceStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={resourceEndDate}
                  onChange={(e) => setResourceEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button 
                  fullWidth 
                  onClick={fetchResourceCosts} 
                  disabled={loadingResources} 
                  variant="contained"
                  sx={{ height: '56px' }}
                >
                  {loadingResources ? <CircularProgress size={24} /> : 'Load Data'}
                </Button>
              </Grid>
            </Grid>

            {loadingResources ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : resourceCosts.length > 0 ? (
              <>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Resource Name</strong></TableCell>
                        <TableCell><strong>Subscription</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Resource Group</strong></TableCell>
                        <TableCell align="right"><strong>Total Cost (6mo)</strong></TableCell>
                        <TableCell align="center"><strong>Currency</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedResources.map((resource) => (
                        <TableRow key={resource.resourceId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontStyle: resource.resourceName ? 'normal' : 'italic', color: resource.resourceName ? 'inherit' : 'text.secondary' }}>
                              {resource.resourceName || '(Unnamed Resource)'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {getSubscriptionName(resource.resourceId)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={resource.resourceType} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {resource.resourceGroup}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              ${resource.totalCost.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={resource.currency} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={filteredResources.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />

                {/* Top 10 Most Expensive Resources Chart */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Top 10 Most Expensive Resources
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={resourceCosts.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="resourceName" type="category" width={150} />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Bar dataKey="totalCost" fill="#82ca9d" name="Total Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
                Select a date range and click "Load Data" to view cost breakdown by resource
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CostsTab;

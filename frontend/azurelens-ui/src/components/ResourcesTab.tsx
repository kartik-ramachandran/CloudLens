import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip,
  TextField, InputAdornment, TablePagination,
  CircularProgress, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Skeleton, Button,
  Select, MenuItem, FormControl, Badge, IconButton, Grid,
  Menu, Checkbox, ListItemText,
} from '@mui/material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Tooltip as MuiTooltip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import PieChartIcon from '@mui/icons-material/PieChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { AzureResource, AzureCredentials } from '../types';
import { getAzureResources } from '../services/api';
import { SectionHeader, StyledHeadCell, styledRowSx, EmptyState } from '../theme/designSystem';

interface ResourcesTabProps {
  credentials: AzureCredentials;
  compact?: boolean;
}

const CHART_COLORS = ['#6C63FF', '#00D2FF', '#FF6B6B', '#FFA500', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ResourcesTab: React.FC<ResourcesTabProps> = ({ credentials, compact = false }) => {
  const [resources, setResources] = useState<AzureResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [resourceGroupFilter, setResourceGroupFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');

  // Column customization
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('resourcesTabColumns');
    return saved ? JSON.parse(saved) : {
      name: true,
      subscription: true,
      type: true,
      location: true,
      resourceGroup: true,
      tags: true,
      resourceId: false,
    };
  });

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('resourcesTabColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Keep a ref to the latest credentials so the refresh button always uses current values
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAzureResources(credentialsRef.current);
      setResources(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever the selected subscription changes
  useEffect(() => {
    fetchResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  const getSubscriptionInfo = useCallback((subscriptionId: string) => {
    const sub = credentials?.subscriptions?.find(s => s.subscriptionId === subscriptionId);
    return {
      name: sub?.displayName || 'Unknown Subscription',
      id: subscriptionId
    };
  }, [credentials.subscriptions]);

  // Extract unique values for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set(resources.map(r => r.type.split('/').pop() || r.type));
    return ['All', ...Array.from(types).sort()];
  }, [resources]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set(resources.map(r => r.location));
    return ['All', ...Array.from(locations).sort()];
  }, [resources]);

  const uniqueResourceGroups = useMemo(() => {
    const groups = new Set(resources.map(r => r.resourceGroup));
    return ['All', ...Array.from(groups).sort()];
  }, [resources]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    resources.forEach(r => {
      if (r.tags) {
        Object.keys(r.tags).forEach(key => tags.add(key));
      }
    });
    return ['All', ...Array.from(tags).sort()];
  }, [resources]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'All') count++;
    if (locationFilter !== 'All') count++;
    if (resourceGroupFilter !== 'All') count++;
    if (tagFilter !== 'All') count++;
    if (searchTerm) count++;
    return count;
  }, [typeFilter, locationFilter, resourceGroupFilter, tagFilter, searchTerm]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setTypeFilter('All');
    setLocationFilter('All');
    setResourceGroupFilter('All');
    setTagFilter('All');
    setSearchTerm('');
    setPage(0);
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const subInfo = getSubscriptionInfo(r.subscriptionId);
      const q = debouncedSearchTerm.toLowerCase();
      
      // Text search
      const matchesSearch = !debouncedSearchTerm || 
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        subInfo.name.toLowerCase().includes(q) ||
        subInfo.id.toLowerCase().includes(q) ||
        r.resourceGroup.toLowerCase().includes(q);
      
      // Type filter
      const matchesType = typeFilter === 'All' || 
        (r.type.split('/').pop() || r.type) === typeFilter;
      
      // Location filter
      const matchesLocation = locationFilter === 'All' || 
        r.location === locationFilter;
      
      // Resource Group filter
      const matchesResourceGroup = resourceGroupFilter === 'All' || 
        r.resourceGroup === resourceGroupFilter;
      
      // Tag filter
      const matchesTag = tagFilter === 'All' || 
        (r.tags && Object.keys(r.tags).includes(tagFilter));
      
      return matchesSearch && matchesType && matchesLocation && 
             matchesResourceGroup && matchesTag;
    });
  }, [resources, debouncedSearchTerm, typeFilter, locationFilter, resourceGroupFilter, tagFilter, getSubscriptionInfo]);

  const displayResources = useMemo(() => {
    return filteredResources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredResources, page, rowsPerPage]);

  // Compute distribution data for pie charts
  const typeDistribution = useMemo(() => {
    const typeMap = new Map<string, number>();
    filteredResources.forEach(r => {
      const typeName = r.type.split('/').pop() || r.type;
      typeMap.set(typeName, (typeMap.get(typeName) || 0) + 1);
    });
    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 types
  }, [filteredResources]);

  const locationDistribution = useMemo(() => {
    const locationMap = new Map<string, number>();
    filteredResources.forEach(r => {
      locationMap.set(r.location, (locationMap.get(r.location) || 0) + 1);
    });
    return Array.from(locationMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 locations
  }, [filteredResources]);

  return (
    <Box>
      <Card>
        <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <SectionHeader icon={<StorageIcon />}>Resources</SectionHeader>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!compact && (
              <IconButton
                size="small"
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                title="Customize columns"
              >
                <SettingsIcon />
              </IconButton>
            )}
            <Button
              variant="outlined" size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={fetchResources} disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </Box>
        </Box>

        {/* Column Customization Menu */}
        {!compact && (
          <Menu
            anchorEl={columnMenuAnchor}
            open={Boolean(columnMenuAnchor)}
            onClose={() => setColumnMenuAnchor(null)}
          >
            {Object.entries({
              name: 'Resource Name',
              subscription: 'Subscription',
              type: 'Type',
              location: 'Location',
              resourceGroup: 'Resource Group',
              tags: 'Tags',
              resourceId: 'Resource ID',
            }).map(([key, label]) => (
              <MenuItem
                key={key}
                onClick={() => setVisibleColumns((prev: any) => ({ ...prev, [key]: !prev[key] }))}
                dense
              >
                <Checkbox checked={visibleColumns[key as keyof typeof visibleColumns]} size="small" />
                <ListItemText primary={label} />
              </MenuItem>
            ))}
          </Menu>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Box>
            {[...Array(5)].map((_, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                <Skeleton variant="rounded" width="25%" height={44} />
                <Skeleton variant="rounded" width="20%" height={44} />
                <Skeleton variant="rounded" width="20%" height={44} />
                <Skeleton variant="rounded" width="15%" height={44} />
                {!compact && <Skeleton variant="rounded" width="20%" height={44} />}
              </Box>
            ))}
          </Box>
        ) : displayResources.length === 0 ? (
          <EmptyState
            icon={<StorageIcon />}
            title="No resources found"
            subtitle={searchTerm ? 'Try adjusting your search term.' : 'No Azure resources found for this subscription.'}
          />
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table sx={{ minWidth: compact ? 400 : 700 }}>
              <TableHead>
                <TableRow>
                  {(compact || visibleColumns.name) && <StyledHeadCell>Resource Name</StyledHeadCell>}
                  {(compact || visibleColumns.subscription) && <StyledHeadCell>Subscription</StyledHeadCell>}
                  {(compact || visibleColumns.type) && <StyledHeadCell>Type</StyledHeadCell>}
                  {(compact || visibleColumns.location) && <StyledHeadCell>Location</StyledHeadCell>}
                  {!compact && visibleColumns.resourceGroup && <StyledHeadCell>Resource Group</StyledHeadCell>}
                  {!compact && visibleColumns.tags && <StyledHeadCell>Tags</StyledHeadCell>}
                  {!compact && visibleColumns.resourceId && <StyledHeadCell>Resource ID</StyledHeadCell>}
                  <StyledHeadCell align="center" width={48}>Portal</StyledHeadCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  {(compact || visibleColumns.name) && (
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <TextField
                        fullWidth
                        size="small" 
                        variant="outlined"
                        placeholder="Search name…"
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
                  )}
                  {(compact || visibleColumns.subscription) && (
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                  )}
                  {(compact || visibleColumns.type) && (
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={typeFilter} 
                          displayEmpty
                          onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
                          sx={{ bgcolor: 'background.paper' }}
                        >
                          {uniqueTypes.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  {(compact || visibleColumns.location) && (
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={locationFilter} 
                          displayEmpty
                          onChange={e => { setLocationFilter(e.target.value); setPage(0); }}
                          sx={{ bgcolor: 'background.paper' }}
                        >
                          {uniqueLocations.map(loc => (
                            <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  {!compact && visibleColumns.resourceGroup && (
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={resourceGroupFilter} 
                          displayEmpty
                          onChange={e => { setResourceGroupFilter(e.target.value); setPage(0); }}
                          sx={{ bgcolor: 'background.paper' }}
                        >
                          {uniqueResourceGroups.map(rg => (
                            <MenuItem key={rg} value={rg}>{rg}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  {!compact && visibleColumns.tags && (
                    <TableCell sx={{ py: 1, px: 1 }}>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={tagFilter} 
                          displayEmpty
                          onChange={e => { setTagFilter(e.target.value); setPage(0); }}
                          sx={{ bgcolor: 'background.paper' }}
                        >
                          {uniqueTags.map(tag => (
                            <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  {!compact && <TableCell sx={{ py: 1, px: 1 }} />}
                  <TableCell sx={{ py: 1, px: 1 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {displayResources.map((r, i) => (
                  <TableRow key={`${r.id}-${i}`} sx={styledRowSx}>
                    {(compact || visibleColumns.name) && (
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                      </TableCell>
                    )}
                    {(compact || visibleColumns.subscription) && (
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25, fontSize: '0.82rem' }}>
                          {getSubscriptionInfo(r.subscriptionId).name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled"
                          sx={{ fontFamily: 'monospace', fontSize: '0.68rem', display: 'block' }}>
                          {getSubscriptionInfo(r.subscriptionId).id}
                        </Typography>
                      </TableCell>
                    )}
                    {(compact || visibleColumns.type) && (
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={r.type.split('/').pop()}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.68rem', height: 22,
                            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                            maxWidth: 180 }}
                        />
                      </TableCell>
                    )}
                    {(compact || visibleColumns.location) && (
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{r.location}</Typography>
                      </TableCell>
                    )}
                    {!compact && visibleColumns.resourceGroup && (
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                          {r.resourceGroup}
                        </Typography>
                      </TableCell>
                    )}
                    {!compact && visibleColumns.tags && (
                      <TableCell sx={{ py: 1.5, maxWidth: 300 }}>
                        {r.tags && Object.keys(r.tags).length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Object.entries(r.tags).map(([key, value]) => (
                              <Chip
                                key={key}
                                label={`${key}: ${value}`}
                                size="small"
                                sx={{ 
                                  fontSize: '0.65rem', 
                                  height: 20,
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  '& .MuiChip-label': { px: 1 }
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                            No tags
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    {!compact && visibleColumns.resourceId && (
                      <TableCell sx={{ py: 1.5, maxWidth: 260 }}>
                        <Typography variant="caption" color="text.disabled"
                          sx={{ fontFamily: 'monospace', fontSize: '0.68rem', display: 'block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.id}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ py: 1.5, width: 48 }}>
                      <MuiTooltip title="Open in Azure Portal">
                        <IconButton
                          size="small"
                          component="a"
                          href={`https://portal.azure.com/#resource${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: '#0078d4' }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </MuiTooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {filteredResources.length > 0 && (
          <TablePagination
            component="div" count={filteredResources.length} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100, 250, 500]}
            sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0 }}
          />
        )}
        </CardContent>
      </Card>

      {/* ── RESOURCE DISTRIBUTION CHARTS ── */}
      {!loading && !compact && filteredResources.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<PieChartIcon />}>Distribution by Type</SectionHeader>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#666', strokeWidth: 1 }}
                    >
                      {typeDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<PieChartIcon />}>Distribution by Location</SectionHeader>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={locationDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#666', strokeWidth: 1 }}
                    >
                      {locationDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ResourcesTab;

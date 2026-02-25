import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip,
  TextField, InputAdornment, TablePagination,
  CircularProgress, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Skeleton, Button,
  Select, MenuItem, FormControl, Badge, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { AzureResource, AzureCredentials } from '../types';
import { getAzureResources } from '../services/api';
import { SectionHeader, StyledHeadCell, styledRowSx, EmptyState } from '../theme/designSystem';

interface ResourcesTabProps {
  credentials: AzureCredentials;
  compact?: boolean;
}

const ResourcesTab: React.FC<ResourcesTabProps> = ({ credentials, compact = false }) => {
  const [resources, setResources] = useState<AzureResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [resourceGroupFilter, setResourceGroupFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');

  // Keep a ref to the latest credentials so the refresh button always uses current values
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  const fetchResources = async () => {
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
  };

  // Re-fetch whenever the selected subscription changes
  useEffect(() => {
    fetchResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.sessionId, credentials.subscriptionIds?.join(',')]);

  const getSubscriptionInfo = (subscriptionId: string) => {
    const sub = credentials?.subscriptions?.find(s => s.subscriptionId === subscriptionId);
    return {
      name: sub?.displayName || 'Unknown Subscription',
      id: subscriptionId
    };
  };

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
  const clearFilters = () => {
    setTypeFilter('All');
    setLocationFilter('All');
    setResourceGroupFilter('All');
    setTagFilter('All');
    setSearchTerm('');
    setPage(0);
  };

  const filteredResources = resources.filter(r => {
    const subInfo = getSubscriptionInfo(r.subscriptionId);
    const q = searchTerm.toLowerCase();
    
    // Text search
    const matchesSearch = !searchTerm || 
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

  const displayResources = filteredResources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <SectionHeader icon={<StorageIcon />}>Resources</SectionHeader>
          <Button
            variant="outlined" size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={fetchResources} disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </Box>

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
                  <StyledHeadCell>Resource Name</StyledHeadCell>
                  <StyledHeadCell>Subscription</StyledHeadCell>
                  <StyledHeadCell>Type</StyledHeadCell>
                  <StyledHeadCell>Location</StyledHeadCell>
                  {!compact && <StyledHeadCell>Resource Group</StyledHeadCell>}
                  {!compact && <StyledHeadCell>Tags</StyledHeadCell>}
                  {!compact && <StyledHeadCell>Resource ID</StyledHeadCell>}
                </TableRow>
                <TableRow sx={{ bgcolor: 'background.default' }}>
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
                  {!compact && (
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
                  {!compact && (
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
                </TableRow>
              </TableHead>
              <TableBody>
                {displayResources.map((r, i) => (
                  <TableRow key={`${r.id}-${i}`} sx={styledRowSx}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25, fontSize: '0.82rem' }}>
                        {getSubscriptionInfo(r.subscriptionId).name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled"
                        sx={{ fontFamily: 'monospace', fontSize: '0.68rem', display: 'block' }}>
                        {getSubscriptionInfo(r.subscriptionId).id}
                      </Typography>
                    </TableCell>
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
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{r.location}</Typography>
                    </TableCell>
                    {!compact && (
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                          {r.resourceGroup}
                        </Typography>
                      </TableCell>
                    )}
                    {!compact && (
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
                    {!compact && (
                      <TableCell sx={{ py: 1.5, maxWidth: 260 }}>
                        <Typography variant="caption" color="text.disabled"
                          sx={{ fontFamily: 'monospace', fontSize: '0.68rem', display: 'block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.id}
                        </Typography>
                      </TableCell>
                    )}
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
  );
};

export default ResourcesTab;

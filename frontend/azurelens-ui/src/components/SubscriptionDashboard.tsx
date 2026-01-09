import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  LinearProgress,
  IconButton,
  Collapse,
  Button,
  Alert,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldIcon from '@mui/icons-material/Shield';
import { AzureCredentials, AzureResource, CostData, SecurityRecommendation, SecureScore } from '../types';
import { getAzureResources, getAzureCosts, getSecurityRecommendations, getAIRecommendations, getSecureScores } from '../services/api';

interface SubscriptionDashboardProps {
  credentials: AzureCredentials;
}

interface SubscriptionData {
  subscriptionId: string;
  displayName: string;
  resources: AzureResource[];
  costs: CostData | null;
  recommendations: SecurityRecommendation[];
  aiInsights: any[];
  secureScore: SecureScore | null;
  loading: boolean;
  loadingAI: boolean;
  expanded: boolean;
  error: string | null;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ credentials }) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Initialize subscription data
    const initialSubs: SubscriptionData[] = (credentials.subscriptions || []).map(sub => ({
      subscriptionId: sub.subscriptionId,
      displayName: sub.displayName,
      resources: [],
      costs: null,
      recommendations: [],
      aiInsights: [],
      secureScore: null,
      loading: false,
      loadingAI: false,
      expanded: false,
      error: null,
    }));
    setSubscriptions(initialSubs);
  }, [credentials.subscriptions]);

  const fetchSubscriptionData = async (subscriptionId: string) => {
    // Mark as loading
    setSubscriptions(prev => prev.map(sub => 
      sub.subscriptionId === subscriptionId 
        ? { ...sub, loading: true, error: null }
        : sub
    ));

    try {
      // Fetch resources, costs, recommendations, and secure scores in parallel
      // Use cached data when available (forceRefresh = false)
      const [resources, costsArray, recommendations, secureScores] = await Promise.all([
        getAzureResources({
          ...credentials,
          subscriptionIds: [subscriptionId]
        }, false), // Use cache if available
        getAzureCosts({
          ...credentials,
          subscriptionIds: [subscriptionId]
        }, false), // Use cache if available
        getSecurityRecommendations({
          ...credentials,
          subscriptionIds: [subscriptionId]
        }),
        getSecureScores({
          ...credentials,
          subscriptionIds: [subscriptionId]
        })
      ]);

      // Update subscription with data
      setSubscriptions(prev => prev.map(sub => 
        sub.subscriptionId === subscriptionId 
          ? { 
              ...sub, 
              resources, 
              costs: costsArray.find(c => c.subscriptionId === subscriptionId) || null,
              recommendations,
              secureScore: secureScores.find(s => s.subscriptionId === subscriptionId) || null,
              loading: false 
            }
          : sub
      ));
    } catch (err: any) {
      console.error(`Failed to fetch data for subscription ${subscriptionId}:`, err);
      const errorMessage = err.response?.data?.error || err.message;
      setSubscriptions(prev => prev.map(sub => 
        sub.subscriptionId === subscriptionId 
          ? { ...sub, loading: false, error: errorMessage }
          : sub
      ));
    }
  };

  const fetchAIInsights = async (subscriptionId: string) => {
    // Mark AI loading
    setSubscriptions(prev => prev.map(sub => 
      sub.subscriptionId === subscriptionId 
        ? { ...sub, loadingAI: true }
        : sub
    ));

    try {
      const insights = await getAIRecommendations({
        sessionId: credentials.sessionId,
        subscriptionIds: [subscriptionId]
      });

      setSubscriptions(prev => prev.map(sub => 
        sub.subscriptionId === subscriptionId 
          ? { ...sub, aiInsights: insights, loadingAI: false }
          : sub
      ));
    } catch (err: any) {
      console.error(`Failed to fetch AI insights for subscription ${subscriptionId}:`, err);
      setSubscriptions(prev => prev.map(sub => 
        sub.subscriptionId === subscriptionId 
          ? { ...sub, loadingAI: false }
          : sub
      ));
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      // Re-fetch data for all expanded subscriptions with forceRefresh=true
      const expandedSubscriptions = subscriptions.filter(sub => sub.expanded);
      
      for (const sub of expandedSubscriptions) {
        await fetchSubscriptionDataWithRefresh(sub.subscriptionId);
      }

      console.log('Fresh data fetched from Azure');
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSubscriptionDataWithRefresh = async (subscriptionId: string) => {
    // Mark as loading
    setSubscriptions(prev => prev.map(sub => 
      sub.subscriptionId === subscriptionId 
        ? { ...sub, loading: true, error: null }
        : sub
    ));

    try {
      // Fetch resources, costs, and recommendations with forceRefresh=true
      const [resources, costsArray, recommendations] = await Promise.all([
        getAzureResources({
          ...credentials,
          subscriptionIds: [subscriptionId]
        }, true), // forceRefresh = true
        getAzureCosts({
          ...credentials,
          subscriptionIds: [subscriptionId]
        }, true), // forceRefresh = true
        getSecurityRecommendations({
          ...credentials,
          subscriptionIds: [subscriptionId]
        })
      ]);

      // Update subscription with fresh data
      setSubscriptions(prev => prev.map(sub => 
        sub.subscriptionId === subscriptionId 
          ? { 
              ...sub, 
              resources, 
              costs: costsArray.find(c => c.subscriptionId === subscriptionId) || null,
              recommendations,
              loading: false 
            }
          : sub
      ));
    } catch (err: any) {
      console.error(`Failed to refresh data for subscription ${subscriptionId}:`, err);
      const errorMessage = err.response?.data?.error || err.message;
      setSubscriptions(prev => prev.map(sub => 
        sub.subscriptionId === subscriptionId 
          ? { ...sub, loading: false, error: errorMessage }
          : sub
      ));
    }
  };

  const toggleSubscription = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.subscriptionId === subscriptionId);
    if (!sub) return;

    const willExpand = !sub.expanded;
    
    // If expanding and no data loaded yet
    if (willExpand && sub.resources.length === 0) {
      // Step 1: Set loading and expanded immediately
      setSubscriptions(prev => prev.map(s => 
        s.subscriptionId === subscriptionId 
          ? { ...s, expanded: true, loading: true }
          : s
      ));
      
      // Step 2: Fetch data
      fetchSubscriptionData(subscriptionId);
    } else {
      // Just toggle expanded state
      setSubscriptions(prev => prev.map(s => 
        s.subscriptionId === subscriptionId 
          ? { ...s, expanded: willExpand }
          : s
      ));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Azure Subscriptions Overview
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefreshAll}
          disabled={refreshing}
          variant="outlined"
          size="small"
        >
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {subscriptions.map((sub) => (
          <Grid item xs={12} key={sub.subscriptionId}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e0e0e0',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }
              }}
            >
              <CardContent>
                {/* Subscription Header */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSubscription(sub.subscriptionId)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        bgcolor: '#0066CC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <CloudIcon />
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {sub.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {sub.subscriptionId}
                      </Typography>
                    </Box>

                    {/* Summary Stats (when collapsed) */}
                    {!sub.expanded && !sub.loading && sub.resources.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 3, mr: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#0066CC' }}>
                            {sub.resources.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Resources
                          </Typography>
                        </Box>
                        {sub.costs && (
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                              ${sub.costs.totalCost.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Total Cost
                            </Typography>
                          </Box>
                        )}
                        {sub.secureScore && (
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: sub.secureScore.percentage >= 80 ? '#4CAF50' : sub.secureScore.percentage >= 50 ? '#FF9800' : '#F44336' }}>
                              {sub.secureScore.percentage.toFixed(0)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Secure Score
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {sub.loading && (
                      <CircularProgress size={24} sx={{ mr: 2 }} />
                    )}
                  </Box>

                  <IconButton>
                    {sub.expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>

                {/* Loading Bar */}
                {sub.loading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Loading subscription data...
                    </Typography>
                  </Box>
                )}

                {/* Error Message */}
                {sub.error && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                    <Typography variant="body2" color="error">
                      Error: {sub.error}
                    </Typography>
                  </Box>
                )}

                {/* Expanded Details */}
                <Collapse in={sub.expanded} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                    {sub.loading ? (
                      // Show loading state when fetching data
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                        <CircularProgress size={60} thickness={4} />
                        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
                          Loading subscription data...
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          Fetching resources, costs, and security recommendations
                        </Typography>
                      </Box>
                    ) : sub.resources.length > 0 ? (
                      <>
                        <Grid container spacing={3}>
                        {/* Cost Overview */}
                        {sub.costs && (
                          <Grid item xs={12} md={6}>
                            <Box 
                              sx={{ 
                                p: 2, 
                                bgcolor: '#f5f5f5', 
                                borderRadius: 2,
                                border: '1px solid #e0e0e0',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <AttachMoneyIcon color="primary" />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  Cost Summary
                                </Typography>
                              </Box>
                              
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                                  ${sub.costs.totalCost.toFixed(2)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {sub.costs.currency} • Last 30 Days
                                </Typography>
                              </Box>

                              {sub.costs.costsByService && sub.costs.costsByService.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Top Services:
                                  </Typography>
                                  {sub.costs.costsByService.slice(0, 5).map((service, idx) => (
                                    <Box key={idx} sx={{ mb: 1 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" noWrap sx={{ maxWidth: '60%' }}>
                                          {service.serviceName}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          ${service.cost.toFixed(2)}
                                        </Typography>
                                      </Box>
                                      <LinearProgress 
                                        variant="determinate" 
                                        value={(service.cost / sub.costs!.totalCost) * 100}
                                        sx={{ height: 6, borderRadius: 1 }}
                                      />
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          </Grid>
                        )}

                        {/* Resources Overview */}
                        <Grid item xs={12} md={sub.costs ? 6 : 12}>
                          <Box 
                            sx={{ 
                              p: 2, 
                              bgcolor: '#f5f5f5', 
                              borderRadius: 2,
                              border: '1px solid #e0e0e0',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <StorageIcon color="primary" />
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Resources
                              </Typography>
                            </Box>
                            
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0066CC', mb: 2 }}>
                              {sub.resources.length}
                            </Typography>

                            {/* Resource Types */}
                            <Box>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                By Type:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {Object.entries(
                                  sub.resources.reduce((acc, r) => {
                                    const type = r.type.split('/').pop() || r.type;
                                    acc[type] = (acc[type] || 0) + 1;
                                    return acc;
                                  }, {} as Record<string, number>)
                                )
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 8)
                                  .map(([type, count]) => (
                                    <Chip 
                                      key={type}
                                      label={`${type} (${count})`}
                                      size="small"
                                      sx={{ bgcolor: 'white' }}
                                    />
                                  ))}
                              </Box>
                            </Box>

                            {/* Locations */}
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                By Location:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {Object.entries(
                                  sub.resources.reduce((acc, r) => {
                                    acc[r.location] = (acc[r.location] || 0) + 1;
                                    return acc;
                                  }, {} as Record<string, number>)
                                )
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 5)
                                  .map(([location, count]) => (
                                    <Chip 
                                      key={location}
                                      label={`${location} (${count})`}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  ))}
                              </Box>
                            </Box>
                          </Box>
                        </Grid>

                        {/* Secure Score */}
                        {sub.secureScore && (
                          <Grid item xs={12}>
                            <Box 
                              sx={{ 
                                p: 2, 
                                bgcolor: '#e8f5e9', 
                                borderRadius: 2,
                                border: '1px solid #66bb6a',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <ShieldIcon sx={{ color: '#388e3c' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  Secure Score
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ width: '100%', mr: 2 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={sub.secureScore.percentage}
                                    sx={{ height: 12, borderRadius: 6 }}
                                    color={sub.secureScore.percentage >= 80 ? 'success' : sub.secureScore.percentage >= 50 ? 'warning' : 'error'}
                                  />
                                </Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, minWidth: 80, textAlign: 'right' }}>
                                  {sub.secureScore.percentage.toFixed(0)}%
                                </Typography>
                              </Box>

                              <Grid container spacing={2}>
                                <Grid item xs={4}>
                                  <Typography variant="caption" color="text.secondary">Score</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {sub.secureScore.currentScore.toFixed(0)} / {sub.secureScore.maxScore.toFixed(0)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                  <Typography variant="caption" color="text.secondary">Healthy</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50' }}>
                                    {sub.secureScore.healthyResourcesCount}
                                  </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                  <Typography variant="caption" color="text.secondary">Unhealthy</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#f44336' }}>
                                    {sub.secureScore.unhealthyResourcesCount}
                                  </Typography>
                                </Grid>
                              </Grid>

                              {sub.secureScore.controls.length > 0 && (
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #a5d6a7' }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Top Security Controls:
                                  </Typography>
                                  {sub.secureScore.controls.slice(0, 3).map((control, idx) => (
                                    <Box key={idx} sx={{ mb: 1.5 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {control.displayName}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                          {control.percentage.toFixed(0)}%
                                        </Typography>
                                      </Box>
                                      <LinearProgress
                                        variant="determinate"
                                        value={control.percentage}
                                        sx={{ height: 6, borderRadius: 3 }}
                                        color={control.percentage >= 80 ? 'success' : control.percentage >= 50 ? 'warning' : 'error'}
                                      />
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          </Grid>
                        )}

                        {/* Security Recommendations */}
                        {sub.recommendations.length > 0 && (
                          <Grid item xs={12}>
                            <Box 
                              sx={{ 
                                p: 2, 
                                bgcolor: '#fff3e0', 
                                borderRadius: 2,
                                border: '1px solid #ffb74d',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <SecurityIcon sx={{ color: '#f57c00' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  Security Recommendations ({sub.recommendations.length})
                                </Typography>
                              </Box>
                              
                              {sub.recommendations.slice(0, 5).map((rec, idx) => (
                                <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < 4 ? '1px solid #ffe0b2' : 'none' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Chip 
                                      label={rec.severity} 
                                      size="small"
                                      color={rec.severity === 'High' ? 'error' : rec.severity === 'Medium' ? 'warning' : 'info'}
                                    />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {rec.displayName}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {rec.description}
                                  </Typography>
                                </Box>
                              ))}

                              {sub.recommendations.length > 5 && (
                                <Typography variant="caption" color="text.secondary">
                                  + {sub.recommendations.length - 5} more recommendations
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                        )}

                        {/* AI Insights Section */}
                        <Grid item xs={12}>
                          <Box 
                            sx={{ 
                              p: 2, 
                              bgcolor: '#f3e5f5', 
                              borderRadius: 2,
                              border: '1px solid #ce93d8',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AutoAwesomeIcon sx={{ color: '#9c27b0' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  AI-Powered Insights
                                </Typography>
                              </Box>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={sub.loadingAI ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchAIInsights(sub.subscriptionId);
                                }}
                                disabled={sub.loadingAI}
                                sx={{ 
                                  bgcolor: '#9c27b0',
                                  '&:hover': { bgcolor: '#7b1fa2' }
                                }}
                              >
                                {sub.loadingAI ? 'Analyzing...' : sub.aiInsights.length > 0 ? 'Refresh AI Insights' : 'Generate AI Insights'}
                              </Button>
                            </Box>

                            {sub.aiInsights.length > 0 ? (
                              <Box>
                                {sub.aiInsights.slice(0, 3).map((insight, idx) => (
                                  <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < 2 ? '1px solid #e1bee7' : 'none' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                      {insight.title || 'AI Recommendation'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {insight.description || insight.recommendation || JSON.stringify(insight)}
                                    </Typography>
                                    {insight.estimatedSavings && (
                                      <Chip 
                                        label={`Potential Savings: $${insight.estimatedSavings}`}
                                        size="small"
                                        color="success"
                                        sx={{ mt: 1 }}
                                      />
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Alert severity="info" sx={{ bgcolor: 'white' }}>
                                Click "Generate AI Insights" to get intelligent recommendations for cost optimization, 
                                security improvements, and SKU recommendations powered by AI.
                              </Alert>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                      </>
                    ) : (
                      // Show message when no data and not loading
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No data loaded yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Close and reopen this subscription to load data
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SubscriptionDashboard;

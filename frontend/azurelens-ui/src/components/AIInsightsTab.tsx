import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Alert,
  Paper,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { AzureCredentials, AzureResource, CostData } from '../types';
import api from '../services/api';

interface AIInsightsTabProps {
  credentials: AzureCredentials;
}

interface AIRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  potentialSavings?: string;
  effort: string;
}

const AIInsightsTab: React.FC<AIInsightsTabProps> = ({ credentials }) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [error, setError] = useState('');

  const handleGenerateInsights = async () => {
    setLoading(true);
    setError('');
    setRecommendations([]);

    try {
      // Only send subscription IDs - backend will use cached data
      const response = await api.post('/azure/ai-insights', { 
        sessionId: credentials.sessionId,
        subscriptionIds: credentials.subscriptionIds 
      });
      setRecommendations(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI insights. Please check your AI settings in the Settings tab.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string): "error" | "warning" | "info" | "default" => {
    switch (priority) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AutoAwesomeIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                AI-Powered Insights
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Get intelligent recommendations to optimize your Azure infrastructure
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={handleGenerateInsights}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TipsAndUpdatesIcon />}
            sx={{ 
              bgcolor: 'white', 
              color: '#667eea',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          >
            {loading ? 'Analyzing...' : 'Generate AI Recommendations'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                Analyzing your Azure environment and generating recommendations...
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Recommendations ({recommendations.length})
          </Typography>
          
          {recommendations.map((rec, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {rec.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip label={rec.category} size="small" color="primary" />
                      <Chip label={rec.priority} size="small" color={getPriorityColor(rec.priority)} />
                      <Chip label={`Effort: ${rec.effort}`} size="small" variant="outlined" />
                      {rec.potentialSavings && (
                        <Chip 
                          label={`💰 ${rec.potentialSavings}`} 
                          size="small" 
                          sx={{ bgcolor: '#66bb6a', color: 'white' }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
                
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {rec.description}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {!loading && recommendations.length === 0 && !error && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AutoAwesomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No AI Insights Generated Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Click the button above to analyze your Azure environment and get AI-powered recommendations
              for cost optimization, performance improvements, and best practices.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong>What you'll get:</strong><br />
              • Cost optimization opportunities<br />
              • SKU recommendations<br />
              • Architecture improvements<br />
              • Security enhancements<br />
              • Performance tuning suggestions
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AIInsightsTab;

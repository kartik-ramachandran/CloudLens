import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button,
  CircularProgress, Chip, Alert, Grid,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { AzureCredentials } from '../types';
import api from '../services/api';
import { DS, SectionHeader, gradButtonSx } from '../theme/designSystem';

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

const PRIORITY_COLOR: Record<string, string> = {
  High: '#d13438',
  Medium: '#ff8c00',
  Low: '#107c10',
};

const AIInsightsTab: React.FC<AIInsightsTabProps> = ({ credentials }) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [error, setError] = useState('');

  const handleGenerateInsights = async () => {
    setLoading(true);
    setError('');
    setRecommendations([]);
    try {
      const response = await api.post('/azure/ai-insights', {
        sessionId: credentials.sessionId,
        subscriptionIds: credentials.subscriptionIds,
      });
      setRecommendations(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI insights. Please check your AI settings in the Settings tab.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* ── HERO CARD ── */}
      <Card sx={{
        mb: 3, color: 'white', overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        minHeight: 160,
      }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <CardContent sx={{ position: 'relative', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
            <Box sx={{
              width: 54, height: 54, borderRadius: 3,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 2, fontSize: '0.62rem', display: 'block' }}>
                INTELLIGENT ANALYSIS
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>AI-Powered Insights</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
                Intelligent recommendations to optimize your Azure infrastructure
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={handleGenerateInsights}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <TipsAndUpdatesIcon />}
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' },
            }}
          >
            {loading ? 'Analyzing…' : 'Generate AI Recommendations'}
          </Button>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {loading && (
        <Card sx={{ background: DS.gradSubtle, border: DS.border }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <CircularProgress size={24} sx={{ color: DS.accent }} />
            <Typography variant="body2" color="text.secondary">
              Analyzing your Azure environment and generating recommendations…
            </Typography>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Box>
          <SectionHeader icon={<TipsAndUpdatesIcon />}>
            Recommendations ({recommendations.length})
          </SectionHeader>

          <Grid container spacing={2}>
            {recommendations.map((rec, i) => (
              <Grid item xs={12} key={i}>
                <Card sx={{
                  borderLeft: `4px solid ${PRIORITY_COLOR[rec.priority] || DS.accent}`,
                  background: DS.gradSubtle,
                  border: DS.border,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-1px)', boxShadow: DS.shadowHover },
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={rec.category} size="small" sx={{ background: DS.gradSubtle, border: DS.border, fontWeight: 600 }} />
                        <Chip label={rec.priority} size="small" sx={{ bgcolor: PRIORITY_COLOR[rec.priority] || DS.accent, color: 'white', fontWeight: 600 }} />
                        <Chip label={`Effort: ${rec.effort}`} size="small" variant="outlined" />
                      </Box>
                      {rec.potentialSavings && (
                        <Chip
                          label={rec.potentialSavings}
                          size="small"
                          sx={{ bgcolor: '#107c1014', color: '#107c10', border: '1px solid #107c1030', fontWeight: 700, fontFamily: 'monospace' }}
                        />
                      )}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>{rec.title}</Typography>
                    <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(0,0,0,0.03)', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {rec.description}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!loading && recommendations.length === 0 && !error && (
        <Card sx={{ background: DS.gradSubtle, border: DS.border }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: 4, background: DS.gradSubtle,
              border: DS.border, display: 'flex', alignItems: 'center',
              justifyContent: 'center', mx: 'auto', mb: 2,
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 36, color: DS.accent }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No AI Insights Generated Yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
              Click the button above to analyze your Azure environment and get AI-powered recommendations
              for cost optimization, performance improvements, and best practices.
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 2 }}>
              Cost optimization · SKU recommendations · Architecture · Security enhancements · Performance tuning
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AIInsightsTab;

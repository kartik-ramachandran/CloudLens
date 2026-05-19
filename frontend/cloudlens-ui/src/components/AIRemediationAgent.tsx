import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Accordion, AccordionSummary,
  AccordionDetails, Chip, Alert, CircularProgress, Stepper, Step, StepLabel,
  StepContent, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, Divider, Paper, Tab, Tabs
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import { AzureCredentials, RemediationSuggestion, ComplianceIssue } from '../types';
import { generateAIRemediationSuggestions, generateSingleRemediationSuggestion } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface AIRemediationAgentProps {
  credentials: AzureCredentials;
  complianceType?: string;
  issues?: ComplianceIssue[];
  singleIssue?: {
    controlId: string;
    controlName: string;
    description: string;
    severity: string;
    resourceId?: string;
    resourceType?: string;
  };
}

const AIRemediationAgent: React.FC<AIRemediationAgentProps> = ({
  credentials,
  complianceType = 'SOC2',
  issues = [],
  singleIssue
}) => {
  const [suggestions, setSuggestions] = useState<RemediationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copiedCommand, setCopiedCommand] = useState<string>('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<RemediationSuggestion | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const generateSuggestions = async () => {
    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      let response;
      
      if (singleIssue) {
        // Generate suggestion for a single issue
        response = await generateSingleRemediationSuggestion(
          credentials,
          singleIssue.controlId,
          singleIssue.controlName,
          singleIssue.description,
          singleIssue.severity,
          singleIssue.resourceId,
          singleIssue.resourceType,
          complianceType
        );
        
        if (response.success && response.suggestion) {
          setSuggestions([response.suggestion]);
        }
      } else if (issues.length > 0) {
        // Generate suggestions for multiple issues
        response = await generateAIRemediationSuggestions(credentials, issues, complianceType);
        
        if (response.success && response.suggestions) {
          setSuggestions(response.suggestions);
        }
      } else {
        setError('No issues provided for remediation analysis');
        return;
      }
      
      if (!response.success) {
        setError(response.error || 'Failed to generate suggestions');
      }
    } catch (err: any) {
      console.error('Error generating suggestions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate AI remediation suggestions');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(identifier);
    setTimeout(() => setCopiedCommand(''), 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getAutomationIcon = (automation: string) => {
    switch (automation.toLowerCase()) {
      case 'automated': return <CheckCircleIcon color="success" />;
      case 'semiautomated': return <WarningIcon color="warning" />;
      default: return <BuildIcon color="action" />;
    }
  };

  const renderSuggestionCard = (suggestion: RemediationSuggestion, index: number) => (
    <Accordion key={index} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
          {getAutomationIcon(suggestion.automation)}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {suggestion.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={suggestion.issueType} variant="outlined" />
              <Chip size="small" label={suggestion.priority} color={getPriorityColor(suggestion.priority) as any} />
              <Chip size="small" label={`${suggestion.automation} Remediation`} variant="outlined" />
              <Chip size="small" label={`${suggestion.effort} Effort`} variant="outlined" />
              <Chip size="small" label={suggestion.timeEstimate} icon={<InfoIcon />} />
            </Box>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSuggestion(suggestion);
            }}
          >
            View Details
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          {/* Description */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            📋 Description
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {suggestion.description}
          </Typography>

          {/* Root Cause */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            🔍 Root Cause
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {suggestion.rootCause}
          </Typography>

          {/* Remediation Steps */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            ✅ Remediation Steps
          </Typography>
          <Stepper orientation="vertical" sx={{ mb: 2 }}>
            {suggestion.remediationSteps.map((step, i) => (
              <Step key={i} active completed={false}>
                <StepLabel>{`Step ${i + 1}`}</StepLabel>
                <StepContent>
                  <Typography variant="body2">{step}</Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {/* Azure CLI Commands */}
          {suggestion.azureCliCommands?.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                💻 Azure CLI Commands
              </Typography>
              {suggestion.azureCliCommands.map((cmd, i) => (
                <Paper
                  key={i}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    bgcolor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    position: 'relative'
                  }}
                >
                  <code>{cmd}</code>
                  <Tooltip title={copiedCommand === `cli-${index}-${i}` ? 'Copied!' : 'Copy'}>
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
                      onClick={() => copyToClipboard(cmd, `cli-${index}-${i}`)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              ))}
            </>
          )}

          {/* PowerShell Commands */}
          {suggestion.powerShellCommands?.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                ⚡ PowerShell Commands
              </Typography>
              {suggestion.powerShellCommands.map((cmd, i) => (
                <Paper
                  key={i}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    bgcolor: '#012456',
                    color: '#eee',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    position: 'relative'
                  }}
                >
                  <code>{cmd}</code>
                  <Tooltip title={copiedCommand === `ps-${index}-${i}` ? 'Copied!' : 'Copy'}>
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
                      onClick={() => copyToClipboard(cmd, `ps-${index}-${i}`)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              ))}
            </>
          )}

          {/* Compliance Impact */}
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              ⚠️ Compliance Impact
            </Typography>
            <Typography variant="body2">{suggestion.complianceImpact}</Typography>
          </Alert>

          {/* Resources Affected */}
          {suggestion.resourcesAffected?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                🎯 Resources Affected
              </Typography>
              {suggestion.resourcesAffected.map((resource, i) => (
                <Chip key={i} label={resource} size="small" sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
          )}

          {/* References */}
          {suggestion.references?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                📚 References
              </Typography>
              <List dense>
                {suggestion.references.map((ref, i) => (
                  <ListItem key={i} disablePadding>
                    <ListItemText
                      primary={
                        <a href={ref} target="_blank" rel="noopener noreferrer" style={{ color: '#0066CC' }}>
                          {ref}
                        </a>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoFixHighIcon sx={{ fontSize: 32, color: '#0066CC' }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  AI Remediation Agent
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get intelligent, step-by-step remediation guidance powered by AI
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={generateSuggestions}
              disabled={loading || (!singleIssue && issues.length === 0)}
            >
              Generate Suggestions
            </Button>
          </Box>

          {(singleIssue || issues.length > 0) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Analyzing <strong>{singleIssue ? '1 issue' : `${issues.length} issues`}</strong> for {complianceType} compliance remediation
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading && <LoadingSpinner message="Generating AI-powered remediation suggestions..." fullPage={false} />}

          {!loading && suggestions.length > 0 && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  ✨ Generated <strong>{suggestions.length}</strong> AI-powered remediation suggestion(s)
                </Typography>
              </Alert>

              <Box sx={{ mb: 2 }}>
                {suggestions.map((suggestion, index) => renderSuggestionCard(suggestion, index))}
              </Box>
            </Box>
          )}

          {!loading && !error && suggestions.length === 0 && !singleIssue && issues.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AutoFixHighIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No issues selected for analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Provide compliance issues to get AI-powered remediation suggestions
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Detailed View Dialog */}
      <Dialog
        open={selectedSuggestion !== null}
        onClose={() => setSelectedSuggestion(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedSuggestion && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getAutomationIcon(selectedSuggestion.automation)}
                <Typography variant="h6">{selectedSuggestion.title}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="Overview" />
                <Tab label="Commands" />
                <Tab label="References" />
              </Tabs>

              {tabValue === 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedSuggestion.description}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Root Cause
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedSuggestion.rootCause}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Remediation Steps
                  </Typography>
                  <List>
                    {selectedSuggestion.remediationSteps.map((step, i) => (
                      <ListItem key={i}>
                        <ListItemText primary={`${i + 1}. ${step}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {tabValue === 1 && (
                <Box>
                  {selectedSuggestion.azureCliCommands?.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Azure CLI
                      </Typography>
                      {selectedSuggestion.azureCliCommands.map((cmd, i) => (
                        <Paper key={i} sx={{ p: 2, mb: 1, bgcolor: '#1e1e1e', color: '#d4d4d4' }}>
                          <code style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{cmd}</code>
                        </Paper>
                      ))}
                    </>
                  )}

                  {selectedSuggestion.powerShellCommands?.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                        PowerShell
                      </Typography>
                      {selectedSuggestion.powerShellCommands.map((cmd, i) => (
                        <Paper key={i} sx={{ p: 2, mb: 1, bgcolor: '#012456', color: '#eee' }}>
                          <code style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{cmd}</code>
                        </Paper>
                      ))}
                    </>
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <List>
                  {selectedSuggestion.references?.map((ref, i) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={
                          <a href={ref} target="_blank" rel="noopener noreferrer">
                            {ref}
                          </a>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedSuggestion(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AIRemediationAgent;

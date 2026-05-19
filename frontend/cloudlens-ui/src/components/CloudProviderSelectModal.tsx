import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Chip, Grid,
  TextField, Divider, IconButton, Stepper, Step, StepLabel,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { connectAws, connectGcp } from '../services/api';

export type CloudProvider = 'azure' | 'aws' | 'gcp';

export interface CloudCredentials {
  azure?: { tenantId: string; clientId: string; clientSecret: string };
  aws?: { accessKeyId: string; secretAccessKey: string; region: string };
  gcp?: { serviceAccountJson: string };
}

interface CloudProviderSelectModalProps {
  open: boolean;
  initialProviders?: CloudProvider[];
  initialCredentials?: CloudCredentials;
  onConfirm: (providers: CloudProvider[], credentials: CloudCredentials) => void;
}

const PROVIDERS = [
  {
    id: 'azure' as CloudProvider,
    name: 'Microsoft Azure',
    short: 'Azure',
    color: '#0078D4',
    bg: 'linear-gradient(135deg, #0078D4 0%, #004e8c 100%)',
    description: 'Connect via Service Principal — view resources, costs, compliance, and FinOps across all subscriptions.',
    logo: (
      <svg viewBox="0 0 96 96" width="52" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M33.3 4L11 73.6l23.4 14.7 28.5-49L33.3 4z" fill="white" fillOpacity="0.9"/>
        <path d="M42 8.4L62.2 62l-28 9.8L85 83.4 54.3 8.4H42z" fill="white" fillOpacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'aws' as CloudProvider,
    name: 'Amazon Web Services',
    short: 'AWS',
    color: '#FF9900',
    bg: 'linear-gradient(135deg, #FF9900 0%, #c67000 100%)',
    description: 'Connect via IAM Access Key — fetch cost breakdowns, resource spend, and savings insights across linked accounts.',
    logo: (
      <svg viewBox="0 0 80 50" width="72" height="45" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="38" fontFamily="Arial Black, sans-serif" fontSize="36" fontWeight="900" fill="white">aws</text>
      </svg>
    ),
  },
  {
    id: 'gcp' as CloudProvider,
    name: 'Google Cloud Platform',
    short: 'GCP',
    color: '#4285F4',
    bg: 'linear-gradient(135deg, #4285F4 0%, #1a56c4 100%)',
    description: 'Connect via Service Account JSON — explore billing by project, service breakdown, and monthly cost trends.',
    logo: (
      <svg viewBox="0 0 100 80" width="60" height="48" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="60" fontFamily="Arial Black, sans-serif" fontSize="32" fontWeight="900" fill="white">GCP</text>
      </svg>
    ),
  },
];

const CloudProviderSelectModal: React.FC<CloudProviderSelectModalProps> = ({
  open,
  initialProviders,
  initialCredentials,
  onConfirm,
}) => {
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<CloudProvider[]>(initialProviders ?? ['azure']);

  // Azure credential fields
  const [azureTenantId, setAzureTenantId] = useState(initialCredentials?.azure?.tenantId ?? '');
  const [azureClientId, setAzureClientId] = useState(initialCredentials?.azure?.clientId ?? '');
  const [azureClientSecret, setAzureClientSecret] = useState(initialCredentials?.azure?.clientSecret ?? '');

  // AWS credential fields
  const [awsKeyId, setAwsKeyId] = useState(initialCredentials?.aws?.accessKeyId ?? '');
  const [awsSecret, setAwsSecret] = useState(initialCredentials?.aws?.secretAccessKey ?? '');
  const [awsRegion, setAwsRegion] = useState(initialCredentials?.aws?.region ?? 'us-east-1');

  // GCP credential field
  const [gcpJson, setGcpJson] = useState(initialCredentials?.gcp?.serviceAccountJson ?? '');

  // Re-sync state whenever the modal is (re)opened so it reflects current selections
  useEffect(() => {
    if (open) {
      setStep(0);
      setSelected(initialProviders ?? ['azure']);
      setAzureTenantId(initialCredentials?.azure?.tenantId ?? '');
      setAzureClientId(initialCredentials?.azure?.clientId ?? '');
      setAzureClientSecret(initialCredentials?.azure?.clientSecret ?? '');
      setAwsKeyId(initialCredentials?.aws?.accessKeyId ?? '');
      setAwsSecret(initialCredentials?.aws?.secretAccessKey ?? '');
      setAwsRegion(initialCredentials?.aws?.region ?? 'us-east-1');
      setGcpJson(initialCredentials?.gcp?.serviceAccountJson ?? '');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: CloudProvider) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const credentials: CloudCredentials = {};
    if (selected.includes('azure') && (azureTenantId || azureClientId || azureClientSecret)) {
      credentials.azure = { tenantId: azureTenantId, clientId: azureClientId, clientSecret: azureClientSecret };
    }
    if (selected.includes('aws') && awsKeyId) {
      credentials.aws = { accessKeyId: awsKeyId, secretAccessKey: awsSecret, region: awsRegion || 'us-east-1' };
      // Persist to backend so the Azure Function can refresh AWS costs in the background
      connectAws({ accessKeyId: awsKeyId, secretAccessKey: awsSecret, region: awsRegion || 'us-east-1' })
        .catch(() => { /* non-blocking — user can still use live fetch */ });
    }
    if (selected.includes('gcp') && gcpJson) {
      credentials.gcp = { serviceAccountJson: gcpJson };
      // Persist to backend so the Azure Function can refresh GCP costs in the background
      connectGcp({ serviceAccountJson: gcpJson })
        .catch(() => { /* non-blocking */ });
    }
    onConfirm(selected, credentials);
    setStep(0);
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', px: 4, py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {step === 1 && (
            <IconButton size="small" onClick={() => setStep(0)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', mr: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 3, fontSize: '0.65rem' }}>
              CLOUDLENS · CLOUD SETUP
            </Typography>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, mt: 0.25 }}>
              {step === 0 ? 'Choose your cloud environment' : 'Enter credentials'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.25 }}>
              {step === 0
                ? 'Select one or more cloud providers — mix and match for hybrid.'
                : 'Provide credentials for the selected providers. You can skip any and add them later.'}
            </Typography>
          </Box>
        </Box>

        {/* Step indicator */}
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={step} sx={{
            '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' },
            '& .MuiStepLabel-label.Mui-active': { color: 'white', fontWeight: 700 },
            '& .MuiStepLabel-label.Mui-completed': { color: 'rgba(255,255,255,0.8)' },
            '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.3)' },
            '& .MuiStepIcon-root.Mui-active': { color: 'white' },
            '& .MuiStepIcon-root.Mui-completed': { color: 'rgba(255,255,255,0.7)' },
            '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.2)' },
          }}>
            <Step><StepLabel>Select Providers</StepLabel></Step>
            <Step><StepLabel>Enter Credentials</StepLabel></Step>
          </Stepper>
        </Box>
      </Box>

      <DialogContent sx={{ px: 4, py: 4, background: 'transparent' }}>

        {/* ── STEP 0: Provider Selection ── */}
        {step === 0 && (
          <>
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {PROVIDERS.map(p => {
                const isSelected = selected.includes(p.id);
                return (
                  <Grid item xs={12} sm={4} key={p.id}>
                    <Box
                      onClick={() => toggle(p.id)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: isSelected ? `2px solid ${p.color}` : '2px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.2s ease',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                        boxShadow: isSelected ? `0 8px 24px ${p.color}44` : 'none',
                        '&:hover': {
                          border: `2px solid ${p.color}`,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 6px 20px ${p.color}33`,
                        },
                      }}
                    >
                      <Box sx={{ background: p.bg, px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 80 }}>
                        <Box>{p.logo}</Box>
                        <Box sx={{ color: 'white' }}>
                          {isSelected
                            ? <CheckCircleIcon sx={{ fontSize: 28 }} />
                            : <RadioButtonUncheckedIcon sx={{ fontSize: 28, opacity: 0.6 }} />}
                        </Box>
                      </Box>
                      <Box sx={{ background: 'rgba(255,255,255,0.04)', px: 2.5, py: 2 }}>
                        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>{p.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, display: 'block' }}>{p.description}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mr: 0.5 }}>Selected:</Typography>
                {selected.length === 0
                  ? <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>None — pick at least one</Typography>
                  : selected.map(id => {
                    const p = PROVIDERS.find(x => x.id === id)!;
                    return <Chip key={id} label={p.short} size="small" sx={{ bgcolor: p.color, color: 'white', fontWeight: 700, fontSize: '0.75rem' }} />;
                  })
                }
                {selected.length > 1 && (
                  <Chip label="Hybrid" size="small" variant="outlined"
                    sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }} />
                )}
              </Box>

              <Button
                variant="contained"
                disabled={selected.length === 0}
                onClick={() => setStep(1)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white', fontWeight: 700, px: 4, py: 1.2, borderRadius: 2, fontSize: '0.95rem',
                  '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a3f92 100%)' },
                  '&.Mui-disabled': { opacity: 0.4 },
                }}
              >
                Next: Enter Credentials →
              </Button>
            </Box>
          </>
        )}

        {/* ── STEP 1: Credentials ── */}
        {step === 1 && (
          <Box>
            {selected.includes('azure') && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#0078D4' }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>Microsoft Azure</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Service Principal</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Tenant ID" value={azureTenantId}
                      onChange={e => setAzureTenantId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      helperText="Azure Active Directory / Entra ID tenant ID"
                      sx={{ '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiInputBase-input': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Client ID" value={azureClientId}
                      onChange={e => setAzureClientId(e.target.value)}
                      placeholder="Application (client) ID"
                      helperText="App registration client ID"
                      sx={{ '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiInputBase-input': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Client Secret" type="password" value={azureClientSecret}
                      onChange={e => setAzureClientSecret(e.target.value)}
                      placeholder="Secret value"
                      helperText="Service principal secret"
                      sx={{ '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiInputBase-input': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' } }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {selected.includes('azure') && selected.length > 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />}

            {selected.includes('aws') && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FF9900' }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>Amazon Web Services</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>IAM Access Key</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={5}>
                    <TextField fullWidth size="small" label="Access Key ID" value={awsKeyId}
                      onChange={e => setAwsKeyId(e.target.value)}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      helperText="IAM user access key ID"
                      sx={{ '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiInputBase-input': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField fullWidth size="small" label="Secret Access Key" type="password" value={awsSecret}
                      onChange={e => setAwsSecret(e.target.value)}
                      placeholder="••••••••••••••••"
                      helperText="Requires ce:GetCostAndUsage permission"
                      sx={{ '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiInputBase-input': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth size="small" label="Region" value={awsRegion}
                      onChange={e => setAwsRegion(e.target.value)}
                      placeholder="us-east-1"
                      helperText="Home region"
                      sx={{ '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiInputBase-input': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' } }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {selected.includes('aws') && selected.includes('gcp') && <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />}

            {selected.includes('gcp') && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4285F4' }} />
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>Google Cloud Platform</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Service Account JSON</Typography>
                </Box>
                <TextField
                  fullWidth multiline rows={5} size="small"
                  label="Service Account JSON Key"
                  value={gcpJson}
                  onChange={e => setGcpJson(e.target.value)}
                  placeholder={'{\n  "type": "service_account",\n  "project_id": "my-project",\n  ...\n}'}
                  helperText="Paste the full contents of your downloaded service account key file. Needs roles/billing.viewer."
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: 12, color: 'white' } }}
                  sx={{ '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.4)' } }}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button variant="text" onClick={handleConfirm}
                sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}>
                Skip for now
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirm}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white', fontWeight: 700, px: 4, py: 1.2, borderRadius: 2, fontSize: '0.95rem',
                  '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a3f92 100%)' },
                }}
              >
                Save & Connect →
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CloudProviderSelectModal;

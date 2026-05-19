import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Chip, Grid,
  TextField, Divider, IconButton, Stepper, Step, StepLabel,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { connectAws, connectGcp } from '../services/api';

export type CloudProvider = 'azure' | 'aws' | 'gcp';

export interface AzureCloudCredential {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  label?: string;
}

export interface AwsCloudCredential {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  label?: string;
}

export interface GcpCloudCredential {
  serviceAccountJson: string;
  label?: string;
}

export interface CloudCredentials {
  azure?: AzureCloudCredential;
  aws?: AwsCloudCredential;
  gcp?: GcpCloudCredential;
  azureAccounts?: AzureCloudCredential[];
  awsAccounts?: AwsCloudCredential[];
  gcpAccounts?: GcpCloudCredential[];
}

interface CloudProviderSelectModalProps {
  open: boolean;
  initialProviders?: CloudProvider[];
  initialCredentials?: CloudCredentials;
  onConfirm: (providers: CloudProvider[], credentials: CloudCredentials) => void;
  onClose?: () => void;
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

const fieldSx = {
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.62)' },
  '& .MuiInputBase-input': { color: 'white' },
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    background: 'rgba(15,23,42,0.40)',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.18)' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.42)' },
};

const isAzureFilled = (account: AzureCloudCredential) =>
  Boolean(account.tenantId || account.clientId || account.clientSecret);

const isAwsFilled = (account: AwsCloudCredential) =>
  Boolean(account.accessKeyId || account.secretAccessKey);

const isGcpFilled = (account: GcpCloudCredential) =>
  Boolean(account.serviceAccountJson);

const getAzureAccounts = (credentials?: CloudCredentials): AzureCloudCredential[] => {
  const accounts = credentials?.azureAccounts?.length
    ? credentials.azureAccounts
    : credentials?.azure
      ? [credentials.azure]
      : [];

  return accounts.length > 0
    ? accounts
    : [{ label: 'Azure account 1', tenantId: '', clientId: '', clientSecret: '' }];
};

const getAwsAccounts = (credentials?: CloudCredentials): AwsCloudCredential[] => {
  const accounts = credentials?.awsAccounts?.length
    ? credentials.awsAccounts
    : credentials?.aws
      ? [credentials.aws]
      : [];

  return accounts.length > 0
    ? accounts
    : [{ label: 'AWS account 1', accessKeyId: '', secretAccessKey: '', region: 'us-east-1' }];
};

const getGcpAccounts = (credentials?: CloudCredentials): GcpCloudCredential[] => {
  const accounts = credentials?.gcpAccounts?.length
    ? credentials.gcpAccounts
    : credentials?.gcp
      ? [credentials.gcp]
      : [];

  return accounts.length > 0
    ? accounts
    : [{ label: 'GCP project 1', serviceAccountJson: '' }];
};

const CloudProviderSelectModal: React.FC<CloudProviderSelectModalProps> = ({
  open,
  initialProviders,
  initialCredentials,
  onConfirm,
  onClose,
}) => {
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<CloudProvider[]>(initialProviders ?? ['azure']);

  const [azureAccounts, setAzureAccounts] = useState<AzureCloudCredential[]>(getAzureAccounts(initialCredentials));
  const [awsAccounts, setAwsAccounts] = useState<AwsCloudCredential[]>(getAwsAccounts(initialCredentials));
  const [gcpAccounts, setGcpAccounts] = useState<GcpCloudCredential[]>(getGcpAccounts(initialCredentials));

  // Re-sync state whenever the modal is (re)opened so it reflects current selections
  useEffect(() => {
    if (open) {
      setStep(0);
      setSelected(initialProviders ?? ['azure']);
      setAzureAccounts(getAzureAccounts(initialCredentials));
      setAwsAccounts(getAwsAccounts(initialCredentials));
      setGcpAccounts(getGcpAccounts(initialCredentials));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: CloudProvider) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const updateAzureAccount = (index: number, patch: Partial<AzureCloudCredential>) => {
    setAzureAccounts(prev => prev.map((account, i) => i === index ? { ...account, ...patch } : account));
  };

  const updateAwsAccount = (index: number, patch: Partial<AwsCloudCredential>) => {
    setAwsAccounts(prev => prev.map((account, i) => i === index ? { ...account, ...patch } : account));
  };

  const updateGcpAccount = (index: number, patch: Partial<GcpCloudCredential>) => {
    setGcpAccounts(prev => prev.map((account, i) => i === index ? { ...account, ...patch } : account));
  };

  const removeAzureAccount = (index: number) => {
    setAzureAccounts(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const removeAwsAccount = (index: number) => {
    setAwsAccounts(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const removeGcpAccount = (index: number) => {
    setGcpAccounts(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const credentials: CloudCredentials = {};
    const filledAzureAccounts = azureAccounts.filter(isAzureFilled);
    const filledAwsAccounts = awsAccounts.filter(isAwsFilled);
    const filledGcpAccounts = gcpAccounts.filter(isGcpFilled);

    if (selected.includes('azure') && filledAzureAccounts.length > 0) {
      credentials.azureAccounts = filledAzureAccounts;
      credentials.azure = filledAzureAccounts[0];
    }
    if (selected.includes('aws') && filledAwsAccounts.length > 0) {
      credentials.awsAccounts = filledAwsAccounts.map(account => ({ ...account, region: account.region || 'us-east-1' }));
      credentials.aws = credentials.awsAccounts[0];
      // Persist to backend so the Azure Function can refresh AWS costs in the background
      credentials.awsAccounts.forEach(account => {
        connectAws({ accessKeyId: account.accessKeyId, secretAccessKey: account.secretAccessKey, region: account.region || 'us-east-1' })
          .catch(() => { /* non-blocking — user can still use live fetch */ });
      });
    }
    if (selected.includes('gcp') && filledGcpAccounts.length > 0) {
      credentials.gcpAccounts = filledGcpAccounts;
      credentials.gcp = filledGcpAccounts[0];
      // Persist to backend so the Azure Function can refresh GCP costs in the background
      filledGcpAccounts.forEach(account => {
        connectGcp({ serviceAccountJson: account.serviceAccountJson })
          .catch(() => { /* non-blocking */ });
      });
    }
    onConfirm(selected, credentials);
    setStep(0);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <Box sx={{ position: 'relative', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', px: 4, py: 3 }}>
        {onClose && (
          <IconButton
            aria-label="Close cloud setup"
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 34,
              height: 34,
              bgcolor: '#ef4444',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.85)',
              boxShadow: '0 10px 24px rgba(127,29,29,0.35)',
              '&:hover': {
                bgcolor: '#dc2626',
                transform: 'scale(1.04)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 20, fontWeight: 900 }} />
          </IconButton>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: onClose ? 6 : 0 }}>
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
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#0078D4' }} />
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 800 }}>Microsoft Azure</Typography>
                    <Chip label={`${azureAccounts.length} ${azureAccounts.length === 1 ? 'account' : 'accounts'}`} size="small" sx={{ bgcolor: 'rgba(0,120,212,0.16)', color: '#7dd3fc', border: '1px solid rgba(125,211,252,0.24)' }} />
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAzureAccounts(prev => [...prev, { label: `Azure account ${prev.length + 1}`, tenantId: '', clientId: '', clientSecret: '' }])}
                    sx={{ color: '#7dd3fc', borderColor: 'rgba(125,211,252,0.36)' }}
                    variant="outlined"
                  >
                    Add Azure
                  </Button>
                </Box>
                {azureAccounts.map((account, index) => (
                  <Box key={`azure-${index}`} sx={{ p: 2, mb: 1.5, borderRadius: 2.5, background: 'linear-gradient(135deg, rgba(0,120,212,0.14), rgba(15,23,42,0.56))', border: '1px solid rgba(125,211,252,0.18)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 2 }}>
                      <TextField size="small" label="Account label" value={account.label ?? ''}
                        onChange={e => updateAzureAccount(index, { label: e.target.value })}
                        placeholder={`Azure account ${index + 1}`}
                        sx={{ ...fieldSx, maxWidth: 260 }}
                      />
                      <IconButton disabled={azureAccounts.length === 1} onClick={() => removeAzureAccount(index)}
                        sx={{ color: '#fecaca', opacity: azureAccounts.length === 1 ? 0.35 : 1 }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth size="small" label="Tenant ID" value={account.tenantId}
                          onChange={e => updateAzureAccount(index, { tenantId: e.target.value })}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          helperText="Azure Active Directory / Entra ID tenant ID"
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth size="small" label="Client ID" value={account.clientId}
                          onChange={e => updateAzureAccount(index, { clientId: e.target.value })}
                          placeholder="Application (client) ID"
                          helperText="App registration client ID"
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth size="small" label="Client Secret" type="password" value={account.clientSecret}
                          onChange={e => updateAzureAccount(index, { clientSecret: e.target.value })}
                          placeholder="Secret value"
                          helperText="Service principal secret"
                          sx={fieldSx}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Box>
            )}

            {selected.includes('azure') && selected.length > 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />}

            {selected.includes('aws') && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FF9900' }} />
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 800 }}>Amazon Web Services</Typography>
                    <Chip label={`${awsAccounts.length} ${awsAccounts.length === 1 ? 'account' : 'accounts'}`} size="small" sx={{ bgcolor: 'rgba(255,153,0,0.16)', color: '#fdba74', border: '1px solid rgba(253,186,116,0.28)' }} />
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAwsAccounts(prev => [...prev, { label: `AWS account ${prev.length + 1}`, accessKeyId: '', secretAccessKey: '', region: 'us-east-1' }])}
                    sx={{ color: '#fdba74', borderColor: 'rgba(253,186,116,0.36)' }}
                    variant="outlined"
                  >
                    Add AWS
                  </Button>
                </Box>
                {awsAccounts.map((account, index) => (
                  <Box key={`aws-${index}`} sx={{ p: 2, mb: 1.5, borderRadius: 2.5, background: 'linear-gradient(135deg, rgba(255,153,0,0.14), rgba(15,23,42,0.56))', border: '1px solid rgba(253,186,116,0.18)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 2 }}>
                      <TextField size="small" label="Account label" value={account.label ?? ''}
                        onChange={e => updateAwsAccount(index, { label: e.target.value })}
                        placeholder={`AWS account ${index + 1}`}
                        sx={{ ...fieldSx, maxWidth: 260 }}
                      />
                      <IconButton disabled={awsAccounts.length === 1} onClick={() => removeAwsAccount(index)}
                        sx={{ color: '#fecaca', opacity: awsAccounts.length === 1 ? 0.35 : 1 }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={5}>
                        <TextField fullWidth size="small" label="Access Key ID" value={account.accessKeyId}
                          onChange={e => updateAwsAccount(index, { accessKeyId: e.target.value })}
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                          helperText="IAM user access key ID"
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <TextField fullWidth size="small" label="Secret Access Key" type="password" value={account.secretAccessKey}
                          onChange={e => updateAwsAccount(index, { secretAccessKey: e.target.value })}
                          placeholder="Secret value"
                          helperText="Requires ce:GetCostAndUsage permission"
                          sx={fieldSx}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <TextField fullWidth size="small" label="Region" value={account.region}
                          onChange={e => updateAwsAccount(index, { region: e.target.value })}
                          placeholder="us-east-1"
                          helperText="Home region"
                          sx={fieldSx}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Box>
            )}

            {selected.includes('aws') && selected.includes('gcp') && <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />}

            {selected.includes('gcp') && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4285F4' }} />
                    <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 800 }}>Google Cloud Platform</Typography>
                    <Chip label={`${gcpAccounts.length} ${gcpAccounts.length === 1 ? 'project' : 'projects'}`} size="small" sx={{ bgcolor: 'rgba(66,133,244,0.16)', color: '#93c5fd', border: '1px solid rgba(147,197,253,0.28)' }} />
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setGcpAccounts(prev => [...prev, { label: `GCP project ${prev.length + 1}`, serviceAccountJson: '' }])}
                    sx={{ color: '#93c5fd', borderColor: 'rgba(147,197,253,0.36)' }}
                    variant="outlined"
                  >
                    Add GCP
                  </Button>
                </Box>
                {gcpAccounts.map((account, index) => (
                  <Box key={`gcp-${index}`} sx={{ p: 2, mb: 1.5, borderRadius: 2.5, background: 'linear-gradient(135deg, rgba(66,133,244,0.14), rgba(15,23,42,0.56))', border: '1px solid rgba(147,197,253,0.18)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 2 }}>
                      <TextField size="small" label="Project label" value={account.label ?? ''}
                        onChange={e => updateGcpAccount(index, { label: e.target.value })}
                        placeholder={`GCP project ${index + 1}`}
                        sx={{ ...fieldSx, maxWidth: 260 }}
                      />
                      <IconButton disabled={gcpAccounts.length === 1} onClick={() => removeGcpAccount(index)}
                        sx={{ color: '#fecaca', opacity: gcpAccounts.length === 1 ? 0.35 : 1 }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Box>
                    <TextField
                      fullWidth multiline rows={5} size="small"
                      label="Service Account JSON Key"
                      value={account.serviceAccountJson}
                      onChange={e => updateGcpAccount(index, { serviceAccountJson: e.target.value })}
                      placeholder={'{\n  "type": "service_account",\n  "project_id": "my-project",\n  ...\n}'}
                      helperText="Paste the full contents of your downloaded service account key file. Needs roles/billing.viewer."
                      inputProps={{ style: { fontFamily: 'monospace', fontSize: 12, color: 'white' } }}
                      sx={fieldSx}
                    />
                  </Box>
                ))}
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

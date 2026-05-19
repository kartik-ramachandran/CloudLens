import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Typography,
} from '@mui/material';
import { AzureCredentials, AKSService } from '../types';
import { getAKSServices } from '../services/api';

interface AKSServicesMicrofrontendProps {
  credentials: AzureCredentials;
}

const AKSServicesMicrofrontend: React.FC<AKSServicesMicrofrontendProps> = ({ credentials }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aksServices, setAKSServices] = useState<AKSService[]>([]);

  useEffect(() => {
    fetchData();
  }, [credentials.sessionId, credentials.subscriptionIds]);

  const fetchData = async () => {
    if (!credentials.sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const servicesData = await getAKSServices(credentials);
      setAKSServices(servicesData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch AKS services');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Cluster</TableCell>
            <TableCell>Subscription</TableCell>
            <TableCell>Namespace</TableCell>
            <TableCell>Service Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ingresses</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {aksServices.map((service, idx) => (
            <TableRow key={idx}>
              <TableCell>{service.clusterName}</TableCell>
              <TableCell>
                <Tooltip title={service.subscriptionId}>
                  <span>{service.subscriptionName}</span>
                </Tooltip>
              </TableCell>
              <TableCell>{service.namespace}</TableCell>
              <TableCell>{service.serviceName}</TableCell>
              <TableCell>{service.type}</TableCell>
              <TableCell>
                <Chip
                  label={service.status}
                  color={getStatusColor(service.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {service.ingresses && service.ingresses.length > 0 ? (
                  <Box>
                    {service.ingresses.map((ingress, idx) => (
                      <Box key={idx} sx={{ mb: 0.5 }}>
                        <Typography variant="caption" display="block">
                          <strong>{ingress.name}</strong>
                        </Typography>
                        {ingress.hosts.map((host, hostIdx) => (
                          <Typography key={hostIdx} variant="caption" color="text.secondary">
                            {host}
                          </Typography>
                        ))}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">No ingresses</Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
          {aksServices.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography variant="body2" color="text.secondary">
                  No AKS services found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AKSServicesMicrofrontend;

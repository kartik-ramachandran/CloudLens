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
import { AzureCredentials, AKSPod } from '../types';
import { getAKSPods } from '../services/api';

interface AKSPodsMicrofrontendProps {
  credentials: AzureCredentials;
}

const AKSPodsMicrofrontend: React.FC<AKSPodsMicrofrontendProps> = ({ credentials }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aksPods, setAKSPods] = useState<AKSPod[]>([]);

  useEffect(() => {
    fetchData();
  }, [credentials.sessionId, credentials.subscriptionIds]);

  const fetchData = async () => {
    if (!credentials.sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const podsData = await getAKSPods(credentials);
      setAKSPods(podsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch AKS pods');
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
            <TableCell>Pod Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Containers</TableCell>
            <TableCell>Restarts</TableCell>
            <TableCell>Node</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {aksPods.map((pod, idx) => (
            <TableRow key={idx}>
              <TableCell>{pod.clusterName}</TableCell>
              <TableCell>
                <Tooltip title={pod.subscriptionId}>
                  <span>{pod.subscriptionName}</span>
                </Tooltip>
              </TableCell>
              <TableCell>{pod.namespace}</TableCell>
              <TableCell>{pod.podName}</TableCell>
              <TableCell>
                <Chip
                  label={pod.status}
                  color={getStatusColor(pod.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {pod.readyContainers}/{pod.totalContainers}
              </TableCell>
              <TableCell>{pod.restartCount}</TableCell>
              <TableCell>{pod.nodeName}</TableCell>
            </TableRow>
          ))}
          {aksPods.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography variant="body2" color="text.secondary">
                  No AKS pods found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AKSPodsMicrofrontend;

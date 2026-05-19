import React from 'react';
import { Box, CircularProgress, Typography, keyframes } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  fullPage = false 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullPage ? '100vh' : '400px',
        p: 4,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          mb: 3,
        }}
      >
        {/* Outer pulsing circle */}
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            left: -12,
            right: -12,
            bottom: -12,
            borderRadius: '50%',
            border: '3px solid',
            borderColor: 'primary.main',
            opacity: 0.2,
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        />
        
        {/* Main spinner */}
        <CircularProgress
          size={60}
          thickness={4}
          sx={{
            color: 'primary.main',
          }}
        />
        
        {/* Center icon */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `${float} 3s ease-in-out infinite`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloudIcon
            sx={{
              fontSize: 28,
              color: 'primary.main',
              display: 'block',
            }}
          />
        </Box>
      </Box>

      <Typography
        variant="h6"
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {message}
      </Typography>
      
      <Typography
        variant="body2"
        sx={{
          color: 'text.disabled',
          mt: 1,
          textAlign: 'center',
        }}
      >
        Analyzing your Azure resources...
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;

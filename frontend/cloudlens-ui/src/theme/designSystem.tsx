/**
 * CloudLens Design System
 * Shared tokens, components, and sx helpers for consistent styling across the app.
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, TableCell, Skeleton } from '@mui/material';

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
export const DS = {
  grad:         'linear-gradient(135deg, #1455d9 0%, #0ea5e9 54%, #14b8a6 100%)',
  gradHero:     'linear-gradient(135deg, #08111f 0%, #0f2f7a 46%, #14b8a6 100%)',
  gradSubtle:   'linear-gradient(135deg, rgba(20,85,217,0.07) 0%, rgba(20,184,166,0.07) 100%)',
  gradCell:     'linear-gradient(135deg, rgba(20,85,217,0.10) 0%, rgba(20,184,166,0.10) 100%)',
  gradRow:      'rgba(20,85,217,0.03)',
  gradRowHover: 'rgba(20,184,166,0.08)',
  accent:       '#1455d9',
  accent2:      '#14b8a6',
  border:       '1px solid rgba(15,23,42,0.10)',
  borderColor:  'rgba(15,23,42,0.10)',
  borderStrong: 'rgba(20,85,217,0.26)',
  shadow:       '0 16px 36px rgba(20,85,217,0.18)',
  shadowHover:  '0 22px 52px rgba(20,85,217,0.24)',
} as const;

// ── SECTION HEADER ─────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ children, icon, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {icon && (
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px',
          background: DS.grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: DS.shadow,
          flexShrink: 0,
          '& svg': { color: 'white', fontSize: 18 },
        }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" sx={{
        fontWeight: 700,
        background: DS.grad,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1.3,
      }}>
        {children}
      </Typography>
    </Box>
    {action}
  </Box>
);

// ── GROUP LABEL (uppercase divider-style section label) ────────────────────────
interface GroupLabelProps { children: React.ReactNode }
export const GroupLabel: React.FC<GroupLabelProps> = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
    <Box sx={{ width: 3, height: 18, borderRadius: 2, background: DS.grad, flexShrink: 0 }} />
    <Typography variant="caption" sx={{
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2,
      fontSize: '0.7rem', color: 'text.secondary',
    }}>
      {children}
    </Typography>
    <Box sx={{ flex: 1, height: '1px', background: DS.gradCell }} />
  </Box>
);

// ── STYLED TABLE HEAD CELL ──────────────────────────────────────────────────────
interface StyledHeadCellProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  padding?: 'normal' | 'checkbox' | 'none';
}

export const StyledHeadCell: React.FC<StyledHeadCellProps> = ({
  children, align = 'left', width, padding = 'normal',
}) => (
  <TableCell
    align={align}
    padding={padding}
    sx={{
      background: DS.gradCell,
      fontWeight: 700,
      fontSize: '0.7rem',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: 'text.secondary',
      borderBottom: `2px solid ${DS.borderStrong}`,
      whiteSpace: 'nowrap',
      width,
      py: 1.5,
      px: padding === 'checkbox' ? 1 : 2,
    }}
  >
    {children}
  </TableCell>
);

// ── STYLED TABLE ROW sx object ──────────────────────────────────────────────────
export const styledRowSx = {
  '&:nth-of-type(even)': { background: 'rgba(20,85,217,0.03)' },
  '&:hover':             { background: 'rgba(20,184,166,0.08) !important' },
  transition:            'background 0.15s',
} as const;

// ── EMPTY STATE ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => (
  <Box sx={{
    py: 8, textAlign: 'center',
    background: DS.gradSubtle,
    borderRadius: 3,
    border: `1px dashed ${DS.borderStrong}`,
  }}>
    <Box sx={{ '& svg': { fontSize: 52, color: 'text.disabled', mb: 1.5, display: 'block', mx: 'auto' } }}>
      {icon}
    </Box>
    <Typography color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>{title}</Typography>
    {subtitle && (
      <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 380, mx: 'auto', px: 2 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

// ── KPI CARD WITH ANIMATED RING ────────────────────────────────────────────────
export interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  ringColor: string;
  progress?: number;  // 0–100
  loading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, subtext, icon, ringColor, progress = 70, loading,
}) => {
  const [ring, setRing] = useState(0);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setRing(Math.min(Math.max(progress, 0), 100)), 250);
      return () => clearTimeout(t);
    } else {
      setRing(0);
    }
  }, [progress, loading]);

  return (
    <Box sx={{
      p: 2.5, borderRadius: 3,
      background: DS.gradSubtle,
      border: DS.border,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: DS.shadowHover },
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{
          fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 0.8, fontSize: '0.62rem',
          color: 'text.secondary', display: 'block',
        }}>
          {label}
        </Typography>
        {loading ? (
          <>
            <Skeleton variant="text" width={110} height={38} />
            <Skeleton variant="text" width={72} height={18} />
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{
              fontWeight: 800, mt: 0.5, mb: 0.25,
              fontFamily: '"SF Mono","Fira Code",monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{subtext}</Typography>
          </>
        )}
      </Box>
      <Box sx={{ position: 'relative', display: 'inline-flex', ml: 2, flexShrink: 0 }}>
        <CircularProgress variant="determinate" value={100} size={58} thickness={3}
          sx={{ color: 'rgba(0,0,0,0.06)', position: 'absolute' }} />
        <CircularProgress variant="determinate" value={loading ? 0 : ring} size={58} thickness={3}
          sx={{ color: ringColor, transition: 'all 1.2s cubic-bezier(.4,0,.2,1)' }} />
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '& svg': { fontSize: 20, color: ringColor },
        }}>
          {icon}
        </Box>
      </Box>
    </Box>
  );
};

// ── GRADIENT COST TEXT sx ──────────────────────────────────────────────────────
export const gradCostSx = {
  fontWeight: 700,
  fontFamily: '"SF Mono","Fira Code",monospace',
  background: DS.grad,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  whiteSpace: 'nowrap' as const,
} as const;

// ── GRADIENT TEXT sx ───────────────────────────────────────────────────────────
export const gradTextSx = {
  background: DS.grad,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as const;

// ── GRADIENT BUTTON sx ─────────────────────────────────────────────────────────
export const gradButtonSx = {
  background: DS.grad,
  '&:hover': { background: DS.grad },
  '&:disabled': { background: 'rgba(0,0,0,0.12)' },
  boxShadow: DS.shadow,
  color: 'white',
} as const;

// ── TABS sx ────────────────────────────────────────────────────────────────────
export const styledTabsSx = {
  '& .MuiTab-root':       { fontWeight: 600, textTransform: 'none', fontSize: '0.875rem' },
  '& .Mui-selected':      { color: '#1455d9 !important' },
  '& .MuiTabs-indicator': { background: DS.grad, height: 3, borderRadius: '3px 3px 0 0' },
} as const;

// ── CURRENCY FORMATTER ─────────────────────────────────────────────────────────
export const fmtCost = (val: number | undefined | null): string =>
  `$${Number(val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── DATE FORMATTER ─────────────────────────────────────────────────────────────
export const fmtDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

import React from 'react';
import { Box, Typography, Button, Container, Chip, Link } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';

const GRAD = 'linear-gradient(135deg, #1455d9 0%, #0ea5e9 52%, #14b8a6 100%)';
const GRAD_TEXT = {
  background: GRAD,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// ── Cloud provider logos ──────────────────────────────────────────────────────

const AzureLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
    <path d="M27.5 4L14 36.5H4L16.5 15.5L27.5 4Z" fill="#0078D4"/>
    <path d="M29.5 7L44 44H18L30 30L29.5 7Z" fill="#0078D4" opacity="0.65"/>
  </svg>
);

const AwsLogo = () => (
  <svg width="28" height="17" viewBox="0 0 64 40" fill="none">
    <path d="M18 25c-3.3 1.8-6.8 2.8-10.4 2.8C3.4 27.8 0 24.4 0 20.1c0-4.8 3.8-8.2 9.4-8.2 1.8 0 3.7.3 5.4.8l.4-2.2C13 9.9 10.8 9.5 8.5 9.5 3.4 9.5 0 13 0 17.5c0 5 3.8 8.4 9.6 8.4 3.5 0 7-.9 10-2.6L18 25Z" fill="#FF9900"/>
    <path d="M64 20c0-6-4.5-10.5-10.5-10.5-2.5 0-4.8.9-6.6 2.4-1.8-1.5-4.1-2.4-6.6-2.4-6 0-10.5 4.5-10.5 10.5S34.3 30.5 40.3 30.5c2.5 0 4.8-.9 6.6-2.4 1.8 1.5 4.1 2.4 6.6 2.4C59.5 30.5 64 26 64 20Z" fill="#FF9900" opacity="0.55"/>
  </svg>
);

const GcpLogo = () => (
  <svg width="20" height="16" viewBox="0 0 64 52" fill="none">
    <path d="M32 8L20 28h24L32 8Z" fill="#4285F4"/>
    <path d="M20 28L12 42h40L44 28H20Z" fill="#34A853" opacity="0.85"/>
    <circle cx="32" cy="28" r="8" fill="#FBBC04"/>
  </svg>
);

// ── Mock Dashboard Preview ────────────────────────────────────────────────────

const MockDashboard: React.FC = () => (
  <Box sx={{
    width: '100%',
    maxWidth: 780,
    mx: 'auto',
    borderRadius: 3,
    border: '1px solid rgba(15,23,42,0.10)',
    bgcolor: '#ffffff',
    boxShadow: '0 40px 100px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.05)',
    overflow: 'hidden',
    transform: 'perspective(1400px) rotateX(6deg)',
    transformOrigin: 'top center',
  }}>
    {/* Window chrome */}
    <Box sx={{
      px: 2, py: 1.4,
      display: 'flex', alignItems: 'center', gap: 1.5,
      borderBottom: '1px solid rgba(15,23,42,0.07)',
      bgcolor: 'rgba(248,251,255,0.95)',
    }}>
      <Box sx={{ display: 'flex', gap: 0.7 }}>
        {['#ff5f57', '#ffbd2e', '#28c840'].map(c => (
          <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, opacity: 0.9 }} />
        ))}
      </Box>
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
        {['Overview', 'Costs', 'Security', 'AI Insights'].map((t, i) => (
          <Typography key={t} variant="caption" sx={{
            fontSize: '0.7rem', fontWeight: i === 0 ? 700 : 500,
            color: i === 0 ? '#0f172a' : '#94a3b8',
            borderBottom: i === 0 ? '2px solid #0ea5e9' : 'none',
            pb: 0.3,
          }}>{t}</Typography>
        ))}
      </Box>
    </Box>

    {/* Metric cards */}
    <Box sx={{ display: 'flex', gap: 1.5, p: 2 }}>
      {[
        { label: 'Monthly Cost', value: '$14,280', delta: '−8.3%', color: '#14b8a6' },
        { label: 'Resources', value: '1,247', delta: '+12 today', color: '#0ea5e9' },
        { label: 'Security Score', value: '94/100', delta: '↑ 2 pts', color: '#16a34a' },
        { label: 'Active Alerts', value: '3', delta: '−5 resolved', color: '#f97316' },
      ].map(m => (
        <Box key={m.label} sx={{
          flex: 1, p: 1.5, borderRadius: 2,
          bgcolor: '#f8fbff',
          border: '1px solid rgba(15,23,42,0.07)',
        }}>
          <Typography sx={{ fontSize: '0.6rem', color: '#94a3b8', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {m.label}
          </Typography>
          <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {m.value}
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: m.color, fontWeight: 700, mt: 0.5 }}>
            {m.delta}
          </Typography>
        </Box>
      ))}
    </Box>

    {/* Chart + resource list */}
    <Box sx={{ display: 'flex', gap: 1.5, px: 2, pb: 2 }}>
      {/* Bar chart */}
      <Box sx={{
        flex: 1.4, p: 1.5, borderRadius: 2,
        bgcolor: '#f8fbff', border: '1px solid rgba(15,23,42,0.07)',
      }}>
        <Typography sx={{ fontSize: '0.63rem', color: '#64748b', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Cost by Service · Last 30d
        </Typography>
        {[
          { label: 'Compute', value: '$8,240', pct: 82, color: '#1455d9' },
          { label: 'Storage', value: '$3,920', pct: 55, color: '#0ea5e9' },
          { label: 'Network', value: '$2,120', pct: 38, color: '#14b8a6' },
        ].map(b => (
          <Box key={b.label} sx={{ mb: 1.2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
              <Typography sx={{ fontSize: '0.63rem', color: '#475569', fontWeight: 600 }}>{b.label}</Typography>
              <Typography sx={{ fontSize: '0.63rem', color: '#94a3b8' }}>{b.value}</Typography>
            </Box>
            <Box sx={{ height: 5, borderRadius: 99, bgcolor: 'rgba(15,23,42,0.07)' }}>
              <Box sx={{ width: `${b.pct}%`, height: '100%', borderRadius: 99, bgcolor: b.color, opacity: 0.85 }} />
            </Box>
          </Box>
        ))}
      </Box>

      {/* Resource list */}
      <Box sx={{
        flex: 1, p: 1.5, borderRadius: 2,
        bgcolor: '#f8fbff', border: '1px solid rgba(15,23,42,0.07)',
      }}>
        <Typography sx={{ fontSize: '0.63rem', color: '#64748b', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Resources
        </Typography>
        {[
          { name: 'prod-aks-cluster', cloud: 'Azure', dot: '#16a34a' },
          { name: 'api-gateway-prod', cloud: 'AWS', dot: '#16a34a' },
          { name: 'staging-postgres', cloud: 'GCP', dot: '#f59e0b' },
          { name: 'ml-inference-svc', cloud: 'Azure', dot: '#16a34a' },
        ].map(r => (
          <Box key={r.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: r.dot, flexShrink: 0 }} />
            <Typography sx={{ flex: 1, fontSize: '0.62rem', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.name}
            </Typography>
            <Typography sx={{ fontSize: '0.58rem', color: '#94a3b8', flexShrink: 0 }}>{r.cloud}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

// ── Feature card ──────────────────────────────────────────────────────────────

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
}> = ({ icon, iconColor, title, description }) => (
  <Box sx={{
    p: 3.5, borderRadius: 3,
    border: '1px solid rgba(15,23,42,0.08)',
    bgcolor: 'rgba(255,255,255,0.90)',
    backdropFilter: 'blur(12px)',
    transition: 'all 0.22s ease',
    '&:hover': {
      bgcolor: '#ffffff',
      border: `1px solid ${iconColor}40`,
      transform: 'translateY(-4px)',
      boxShadow: `0 20px 50px rgba(15,23,42,0.10), 0 0 0 1px ${iconColor}18`,
    },
  }}>
    <Box sx={{
      width: 44, height: 44, borderRadius: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: `${iconColor}12`,
      border: `1px solid ${iconColor}25`,
      mb: 2.5, color: iconColor,
    }}>
      {icon}
    </Box>
    <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', mb: 1, fontSize: '1.02rem' }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.75 }}>
      {description}
    </Typography>
  </Box>
);

// ── Landing page ──────────────────────────────────────────────────────────────

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onGetStarted, onOpenTerms, onOpenPrivacy }) => (
  <Box sx={{
    minHeight: '100vh',
    bgcolor: '#ffffff',
    background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 40%, #f8fbff 100%)',
    color: '#0f172a',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  }}>

    {/* Ambient orbs */}
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <Box sx={{
        position: 'absolute', top: '-15%', left: '-8%',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,85,217,0.09) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <Box sx={{
        position: 'absolute', top: '0%', right: '-5%',
        width: 550, height: 550, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '15%', left: '35%',
        width: 500, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />
    </Box>

    {/* Grid overlay */}
    <Box sx={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      backgroundImage: 'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
      maskImage: 'linear-gradient(to bottom, black 0%, transparent 55%)',
    }} />

    {/* ── Navbar ── */}
    <Box sx={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      px: { xs: 2, md: 4 }, py: 1.5,
      display: 'flex', alignItems: 'center',
      bgcolor: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(15,23,42,0.08)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5,
          background: GRAD, display: 'grid', placeItems: 'center',
          boxShadow: '0 6px 18px rgba(20,85,217,0.28)',
        }}>
          <Box component="img" src="/logo.svg" alt="" sx={{ width: 20, height: 20, filter: 'brightness(0) invert(1)' }} />
        </Box>
        <Typography fontWeight={900} sx={{ fontSize: '1rem', color: '#0f172a', letterSpacing: '-0.3px' }}>
          CloudLens
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Button
          onClick={onSignIn}
          variant="contained"
          sx={{
            fontWeight: 700, fontSize: '0.85rem', textTransform: 'none',
            background: GRAD, px: 2.2, py: 0.85, borderRadius: 2,
            boxShadow: '0 6px 20px rgba(20,85,217,0.30)',
            '&:hover': { boxShadow: '0 10px 28px rgba(20,85,217,0.42)', transform: 'translateY(-1px)' },
          }}
        >
          Sign In
        </Button>
        <Button
          onClick={onGetStarted}
          variant="contained"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
          sx={{
            fontWeight: 700, fontSize: '0.85rem', textTransform: 'none',
            background: GRAD, px: 2.2, py: 0.85, borderRadius: 2,
            boxShadow: '0 6px 20px rgba(20,85,217,0.30)',
            '&:hover': { boxShadow: '0 10px 28px rgba(20,85,217,0.42)', transform: 'translateY(-1px)' },
          }}
        >
          Get Started
        </Button>
      </Box>
    </Box>

    {/* ── Hero ── */}
    <Box sx={{ position: 'relative', zIndex: 1, pt: { xs: 14, md: 18 }, pb: { xs: 6, md: 8 }, textAlign: 'center' }}>
      <Container maxWidth="lg">
        {/* Badge */}
        <Chip
          label="Multi-Cloud · FinOps · Security · AI-Powered"
          size="small"
          sx={{
            mb: 3.5,
            bgcolor: 'rgba(20,85,217,0.07)',
            border: '1px solid rgba(20,85,217,0.20)',
            color: '#1455d9',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: 0.5,
            height: 26,
          }}
        />

        {/* Headline */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.6rem', sm: '3.8rem', md: '5rem' },
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            mb: 2.5,
            color: '#0f172a',
          }}
        >
          Your cloud,{' '}
          <Box component="span" sx={GRAD_TEXT}>fully in focus.</Box>
        </Typography>

        {/* Subtext */}
        <Typography
          sx={{
            fontSize: { xs: '1rem', md: '1.18rem' },
            fontWeight: 400,
            color: '#64748b',
            maxWidth: 560,
            mx: 'auto',
            lineHeight: 1.7,
            mb: 4.5,
          }}
        >
          One platform to monitor costs, security, and resources across Azure, AWS, and GCP —
          with AI that tells you what to fix and how.
        </Typography>

        {/* CTAs */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={onGetStarted}
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{
              fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
              background: GRAD, px: 3.5, py: 1.4, borderRadius: 2.5,
              boxShadow: '0 14px 36px rgba(20,85,217,0.32)',
              '&:hover': { boxShadow: '0 18px 44px rgba(20,85,217,0.45)', transform: 'translateY(-2px)' },
            }}
          >
            Get Started Free
          </Button>
          <Button
            onClick={onSignIn}
            size="large"
            sx={{
              fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
              color: '#475569', px: 3.5, py: 1.4, borderRadius: 2.5,
              border: '1px solid rgba(15,23,42,0.14)',
              bgcolor: 'rgba(255,255,255,0.70)',
              '&:hover': {
                color: '#0f172a',
                bgcolor: '#ffffff',
                border: '1px solid rgba(15,23,42,0.24)',
                boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
              },
            }}
          >
            Sign In
          </Button>
        </Box>

        {/* Works with */}
        <Box sx={{ mt: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5, fontSize: '0.67rem', textTransform: 'uppercase' }}>
            Works with
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            {[
              { logo: <AzureLogo />, name: 'Azure' },
              { logo: <AwsLogo />, name: 'AWS' },
              { logo: <GcpLogo />, name: 'GCP' },
            ].map(p => (
              <Box key={p.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.7, opacity: 0.7 }}>
                {p.logo}
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{p.name}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Dashboard preview */}
        <Box sx={{ mt: 8, px: { xs: 0, md: 4 } }}>
          <MockDashboard />
        </Box>
      </Container>
    </Box>

    {/* ── Features ── */}
    <Box sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 7 }}>
          <Typography variant="overline" sx={{ color: '#0ea5e9', fontWeight: 700, letterSpacing: 1.5, fontSize: '0.72rem' }}>
            Everything you need
          </Typography>
          <Typography variant="h3" fontWeight={900} sx={{
            mt: 1, color: '#0f172a',
            fontSize: { xs: '1.9rem', md: '2.5rem' },
            letterSpacing: '-0.03em',
          }}>
            Cloud operations,{' '}
            <Box component="span" sx={GRAD_TEXT}>simplified.</Box>
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <FeatureCard
            icon={<MonetizationOnOutlinedIcon />}
            iconColor="#14b8a6"
            title="Cost Intelligence"
            description="FinOps dashboards, budget alerts, and per-service cost breakdowns across every cloud."
          />
          <FeatureCard
            icon={<SecurityOutlinedIcon />}
            iconColor="#1455d9"
            title="Security Posture"
            description="Continuous compliance tracking, secure scores, and vulnerability management in one view."
          />
          <FeatureCard
            icon={<CloudOutlinedIcon />}
            iconColor="#0ea5e9"
            title="Resource Visibility"
            description="Live inventory of every VM, container, database, and service — tagged and searchable."
          />
          <FeatureCard
            icon={<AutoAwesomeIcon />}
            iconColor="#f97316"
            title="AI Remediation"
            description="Claude-powered insights that detect anomalies and suggest actionable fixes instantly."
          />
        </Box>
      </Container>
    </Box>

    {/* ── Stats ── */}
    <Box sx={{
      position: 'relative', zIndex: 1,
      py: { xs: 6, md: 8 },
      borderTop: '1px solid rgba(15,23,42,0.07)',
      borderBottom: '1px solid rgba(15,23,42,0.07)',
      bgcolor: 'rgba(248,251,255,0.70)',
    }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 4 }}>
          {[
            { value: '3', label: 'Cloud Providers' },
            { value: 'Real-time', label: 'Monitoring' },
            { value: 'AI-native', label: 'Remediation' },
            { value: 'SOC 2', label: 'Compliance Ready' },
          ].map(s => (
            <Box key={s.label} sx={{ textAlign: 'center' }}>
              <Typography sx={{ ...GRAD_TEXT, fontSize: { xs: '1.9rem', md: '2.4rem' }, fontWeight: 900, lineHeight: 1 }}>
                {s.value}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>

    {/* ── Final CTA ── */}
    <Box sx={{ position: 'relative', zIndex: 1, py: { xs: 10, md: 14 }, textAlign: 'center' }}>
      <Container maxWidth="sm">
        <Typography variant="h3" fontWeight={900} sx={{
          color: '#0f172a',
          fontSize: { xs: '1.9rem', md: '2.5rem' },
          letterSpacing: '-0.03em',
          mb: 2,
        }}>
          Ready to see the{' '}
          <Box component="span" sx={GRAD_TEXT}>full picture?</Box>
        </Typography>
        <Typography sx={{ color: '#64748b', mb: 4.5, fontSize: '1rem', lineHeight: 1.7 }}>
          Start monitoring your cloud infrastructure in minutes. No credit card required.
        </Typography>
        <Button
          onClick={onGetStarted}
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          sx={{
            fontWeight: 700, fontSize: '1rem', textTransform: 'none',
            background: GRAD, px: 4, py: 1.5, borderRadius: 2.5,
            boxShadow: '0 16px 40px rgba(20,85,217,0.32)',
            '&:hover': { boxShadow: '0 22px 52px rgba(20,85,217,0.44)', transform: 'translateY(-2px)' },
          }}
        >
          Get Started Free
        </Button>
      </Container>
    </Box>

    {/* ── Footer ── */}
    <Box sx={{
      position: 'relative', zIndex: 1,
      borderTop: '1px solid rgba(15,23,42,0.08)',
      bgcolor: 'rgba(248,251,255,0.80)',
      px: { xs: 2, md: 6 }, py: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: 1, background: GRAD, display: 'grid', placeItems: 'center' }}>
          <Box component="img" src="/logo.svg" alt="" sx={{ width: 13, height: 13, filter: 'brightness(0) invert(1)' }} />
        </Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>CloudLens</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: '#cbd5e1', ml: 1 }}>© {new Date().getFullYear()}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 3 }}>
        {[
          { label: 'Terms of Service', onClick: onOpenTerms },
          { label: 'Privacy Policy', onClick: onOpenPrivacy },
        ].map(l => (
          <Link
            key={l.label}
            component="button"
            onClick={l.onClick}
            underline="hover"
            sx={{
              fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500,
              cursor: 'pointer', background: 'none', border: 'none',
              '&:hover': { color: '#475569' },
            }}
          >
            {l.label}
          </Link>
        ))}
      </Box>
    </Box>
  </Box>
);

export default LandingPage;

import React from 'react';
import { Box, Typography, Button, Divider, Container } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AUTH_GRAD = 'linear-gradient(135deg, #1455d9 0%, #0ea5e9 52%, #14b8a6 100%)';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mb: 3.5 }}>
    <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ color: 'text.primary' }}>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
      {children}
    </Typography>
  </Box>
);

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => (
  <Box sx={{
    minHeight: '100vh',
    background: 'linear-gradient(115deg, rgba(20,85,217,0.08), rgba(20,184,166,0.06) 46%, rgba(249,115,22,0.06)), #eef3f8',
  }}>
    {/* Header bar */}
    <Box sx={{
      position: 'sticky', top: 0, zIndex: 10,
      bgcolor: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(15,23,42,0.08)',
      px: { xs: 2, md: 4 }, py: 1.5,
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'none' }}
      >
        Back
      </Button>
      <Divider orientation="vertical" flexItem />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: 1.5, display: 'grid', placeItems: 'center',
          background: AUTH_GRAD, boxShadow: '0 6px 14px rgba(20,85,217,0.22)',
        }}>
          <Box component="img" src="/logo.svg" alt="CloudLens" sx={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#0f172a' }}>CloudLens</Typography>
      </Box>
    </Box>

    {/* Content */}
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{
        bgcolor: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        borderRadius: 4,
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.10)',
        p: { xs: 3, md: 5 },
      }}>
        <Typography variant="h4" fontWeight={900} gutterBottom>Privacy Policy</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: May 19, 2026
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Section title="1. Information We Collect">
          We collect information you provide directly (name, email, organization) when registering an account.
          We also collect usage data (features accessed, session duration, error logs) to improve the Service,
          and technical data (IP address, browser type, OS) for security and diagnostics. For self-hosted
          deployments, all data remains within your infrastructure and is not transmitted to CloudLens servers.
        </Section>

        <Section title="2. Cloud Infrastructure Data">
          To provide the Service, CloudLens reads metadata from your cloud environments: resource inventories,
          cost and billing data, security scores, compliance states, and logs. This data is processed to generate
          the dashboards and insights shown in the application. CloudLens does not store raw cloud infrastructure
          data beyond what is necessary to serve your current session or caching window (configurable).
          Your cloud credentials are encrypted at rest using AES-256.
        </Section>

        <Section title="3. How We Use Your Information">
          We use your information to: (a) provide, maintain, and improve the Service; (b) authenticate your identity
          and manage your account; (c) send service-related communications (security alerts, feature updates);
          (d) respond to support requests; and (e) detect and prevent fraud or security incidents. We do not use
          your data for advertising or sell it to third parties.
        </Section>

        <Section title="4. Data Sharing">
          We do not sell, trade, or rent your personal information. We may share data with: (a) service providers
          who assist in operating the Service (hosting, monitoring) under strict confidentiality agreements;
          (b) law enforcement when required by law; or (c) successors in the event of a merger or acquisition,
          with advance notice to users. Cloud infrastructure data is never shared with third parties.
        </Section>

        <Section title="5. Data Security">
          We implement industry-standard security measures including TLS 1.3 for data in transit, AES-256 encryption
          for data at rest, role-based access controls, and regular security audits. However, no method of transmission
          over the internet is 100% secure. We encourage you to use strong passwords and enable multi-factor
          authentication.
        </Section>

        <Section title="6. Data Retention">
          We retain account information for as long as your account is active. Usage logs are retained for up to 90
          days. Cloud infrastructure snapshots used for caching are retained per your configured cache TTL (default
          15 minutes). You may request deletion of your account and associated data at any time by contacting support.
        </Section>

        <Section title="7. Your Rights">
          Depending on your jurisdiction, you may have rights to: access your personal data; correct inaccurate data;
          request deletion of your data; restrict or object to processing; and data portability. To exercise these
          rights, contact us at privacy@cloudlens.io. We will respond within 30 days.
        </Section>

        <Section title="8. Cookies and Local Storage">
          CloudLens uses browser local storage to persist your session token, selected cloud providers, and UI
          preferences (theme, layout). We do not use third-party tracking cookies. You can clear local storage via
          your browser settings, which will sign you out of the application.
        </Section>

        <Section title="9. Third-Party Integrations">
          CloudLens may integrate with third-party services (e.g., Jira, Vanta, PagerDuty) at your direction.
          When you enable these integrations, data relevant to that integration is shared with the respective
          provider under their own privacy policies. CloudLens is not responsible for the privacy practices of
          third-party services.
        </Section>

        <Section title="10. Children's Privacy">
          The Service is not directed to individuals under the age of 16. We do not knowingly collect personal
          information from children. If you believe a child has provided us personal information, please contact us
          and we will delete it promptly.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this Privacy Policy periodically. We will notify you of significant changes by email or
          an in-app notification. Your continued use of the Service after changes take effect constitutes acceptance
          of the updated policy.
        </Section>

        <Section title="12. Contact Us">
          For privacy-related questions or to exercise your rights, contact us at privacy@cloudlens.io or write to
          our data protection team via the support portal within the application.
        </Section>

        <Divider sx={{ mt: 2, mb: 3 }} />

        <Button
          variant="contained" onClick={onBack}
          sx={{ background: AUTH_GRAD, fontWeight: 700, px: 4, py: 1.2 }}
        >
          Back to Sign In
        </Button>
      </Box>
    </Container>
  </Box>
);

export default PrivacyPolicyPage;

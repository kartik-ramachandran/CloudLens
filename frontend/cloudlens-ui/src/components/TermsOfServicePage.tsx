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

interface TermsOfServicePageProps {
  onBack: () => void;
}

const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => (
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
        <Typography variant="h4" fontWeight={900} gutterBottom>Terms of Service</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: May 19, 2026
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Section title="1. Acceptance of Terms">
          By accessing or using CloudLens ("the Service"), you agree to be bound by these Terms of Service ("Terms").
          If you do not agree to these Terms, you may not use the Service. These Terms apply to all users, including
          individual users and organizations that deploy CloudLens on their own infrastructure.
        </Section>

        <Section title="2. Description of Service">
          CloudLens is a cloud management and observability platform that provides visibility into your cloud infrastructure
          across Azure, AWS, and GCP environments. The Service includes cost analytics (FinOps), security posture management,
          compliance reporting, AI-assisted remediation, and related features. CloudLens may be deployed as a SaaS offering
          or self-hosted within your organization's infrastructure.
        </Section>

        <Section title="3. Account Registration and Security">
          You must provide accurate information when registering an account. You are responsible for maintaining the
          confidentiality of your credentials and for all activities that occur under your account. You must notify us
          immediately of any unauthorized use. For enterprise deployments, the organization administrator is responsible
          for managing user access and ensuring compliance with these Terms across their organization.
        </Section>

        <Section title="4. Acceptable Use">
          You agree not to: (a) use the Service to violate any applicable law or regulation; (b) attempt to gain
          unauthorized access to cloud accounts or resources not belonging to you; (c) interfere with or disrupt the
          Service or its infrastructure; (d) use the Service to transmit malware or engage in any harmful activity;
          (e) reverse-engineer or attempt to extract the source code of the Service (beyond what the AGPL-3.0 license
          permits); or (f) resell or sublicense access to the Service without written authorization.
        </Section>

        <Section title="5. Cloud Credentials and Data Access">
          CloudLens requires access to your cloud provider credentials (e.g., Azure service principals, AWS IAM roles,
          GCP service accounts) to provide its services. You grant CloudLens read access to your cloud infrastructure
          data solely for the purpose of delivering the Service. You retain ownership of all your cloud data.
          CloudLens will not use your cloud credentials or infrastructure data for any purpose other than providing
          and improving the Service to you.
        </Section>

        <Section title="6. Intellectual Property">
          The Service and its original content, features, and functionality are and will remain the exclusive property
          of CloudLens and its licensors. The Service is licensed under the AGPL-3.0 license (open-source) with a
          commercial license available for enterprise deployments. Refer to the LICENSE file in the repository for
          full details.
        </Section>

        <Section title="7. Limitation of Liability">
          To the maximum extent permitted by law, CloudLens shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of
          or inability to use the Service. In no event shall CloudLens's total liability exceed the amount you paid
          for the Service in the twelve months preceding the claim.
        </Section>

        <Section title="8. Disclaimer of Warranties">
          The Service is provided "as is" and "as available" without warranties of any kind, either express or implied,
          including but not limited to implied warranties of merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or completely secure.
        </Section>

        <Section title="9. Termination">
          We may terminate or suspend your access to the Service immediately, without prior notice, if you breach these
          Terms. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature
          should survive termination (including intellectual property, disclaimers, and limitations of liability) will
          survive.
        </Section>

        <Section title="10. Changes to Terms">
          We reserve the right to modify these Terms at any time. We will notify users of material changes via email
          or a prominent notice within the Service. Continued use of the Service after changes constitutes acceptance
          of the updated Terms.
        </Section>

        <Section title="11. Governing Law">
          These Terms are governed by and construed in accordance with applicable laws. Any disputes arising from these
          Terms shall be subject to the exclusive jurisdiction of the courts in the jurisdiction where CloudLens operates.
        </Section>

        <Section title="12. Contact">
          For questions about these Terms, please contact us at legal@cloudlens.io or open an issue at
          github.com/cloudlens/cloudlens.
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

export default TermsOfServicePage;

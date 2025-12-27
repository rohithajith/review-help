import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Paper } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import api from '../api';

export default function SignupSuccess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Get params from URL
        const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
        const sessionId = params.get('session_id');
        const confirmation = params.get('confirmation');
        const email = params.get('email');

        // Handle email confirmation pending state
        if (confirmation === 'pending') {
          setConfirmationPending(true);
          setUserEmail(email || '');
          setLoading(false);
          return;
        }

        if (!sessionId) {
          setError('No session ID found in URL');
          setLoading(false);
          return;
        }

        // Verify with backend
        const res = await api.get(`/payments/verify-session/${sessionId}`);
        const data = res?.data;

        if (data && data.status === 'paid') {
          setSessionData(data);
        } else if (data && data.status === 'unpaid') {
          setError('Payment is still processing. Please wait a moment and refresh.');
        } else {
          setError('Could not verify payment status.');
        }
      } catch (err) {
        console.error('Verify session error:', err);
        setError('Failed to verify payment. Please contact support if you were charged.');
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying...</Typography>
      </Box>
    );
  }

  // Email confirmation pending view
  if (confirmationPending) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 6, p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ color: '#10b981', mb: 2 }}>
            <MailOutlineIcon sx={{ fontSize: 64 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Check Your Email
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            We've sent a confirmation link to:
          </Typography>
          {userEmail && (
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'primary.main' }}>
              {userEmail}
            </Typography>
          )}
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Click the link in the email to confirm your account, then you can log in and access your dashboard.
          </Typography>
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <strong>Didn't receive the email?</strong>
            <br />• Check your spam/junk folder
            <br />• Make sure you entered the correct email
            <br />• Wait a few minutes and check again
          </Alert>
          <Button
            variant="contained"
            size="large"
            onClick={() => (window.location.hash = '#/login')}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 6, p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 6, p: 3 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ color: 'success.main', mb: 2 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Payment Successful!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Thank you for subscribing to the <strong>{sessionData?.plan || 'Pro'}</strong> plan.
          Your account has been upgraded.
        </Typography>
        {sessionData?.businessId && (
          <Button
            variant="contained"
            size="large"
            onClick={() => (window.location.hash = `#/business/${sessionData.businessId}/admin`)}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            Go to Dashboard
          </Button>
        )}
        {!sessionData?.businessId && (
          <Button
            variant="contained"
            size="large"
            onClick={() => (window.location.hash = '#/')}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            Go to Home
          </Button>
        )}
      </Paper>
    </Box>
  );
}

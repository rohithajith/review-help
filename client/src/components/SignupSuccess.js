import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import api from '../api';
import TemplateSharePanel from './TemplateSharePanel';
import { hasSeenShareQr, markShareQrSeen } from '../utils/templateShare';

export default function SignupSuccess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [pendingBusinessId, setPendingBusinessId] = useState(null);
  const [canRetryVerification, setCanRetryVerification] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Get session_id from URL
        const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
        const sessionId = params.get('session_id');

        if (!sessionId) {
          setError('No session ID found in URL');
          setLoading(false);
          return;
        }

        // Verify with backend
        const res = await api.get(`/payments/verify-session/${sessionId}`);
        const data = res?.data;

        const sessionPaid = data && (data.status === 'paid' || data.status === 'no_payment_required');
        const billingActive = String(data?.billingStatus || '').toLowerCase() === 'active';

        if (billingActive) {
          setSessionData(data);
        } else {
          setPendingBusinessId(data?.businessId || null);
          setCanRetryVerification(sessionPaid);
          setError(
            sessionPaid
              ? 'Payment was received and is being finalized. Please continue.'
              : 'Payment is not complete yet. Please finish checkout to continue.'
          );
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

  useEffect(() => {
    const businessId = Number(sessionData?.businessId);
    if (!Number.isInteger(businessId) || businessId <= 0) return;
    if (!hasSeenShareQr(businessId)) {
      setShowShareModal(true);
    }
  }, [sessionData?.businessId]);

  const closeShareModal = () => {
    if (sessionData?.businessId) {
      markShareQrSeen(sessionData.businessId);
    }
    setShowShareModal(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying your payment...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 6, p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {canRetryVerification && (
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Retry Verification
            </Button>
          )}
          {pendingBusinessId ? (
            <Button
              variant="contained"
              onClick={() => { window.location.hash = `#/payment-pending?businessId=${pendingBusinessId}`; }}
            >
              Continue
            </Button>
          ) : (
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Retry
            </Button>
          )}
        </Box>
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
            onClick={() => {
              markShareQrSeen(sessionData.businessId);
              window.location.hash = `#/business/${sessionData.businessId}/admin`;
            }}
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

      <Dialog
        open={showShareModal}
        onClose={closeShareModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Share Your Review Page
        </DialogTitle>
        <DialogContent dividers>
          <TemplateSharePanel businessId={sessionData?.businessId} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={closeShareModal}>
            Close
          </Button>
          {sessionData?.businessId && (
            <Button
              variant="contained"
              onClick={() => {
                markShareQrSeen(sessionData.businessId);
                setShowShareModal(false);
                window.location.hash = `#/business/${sessionData.businessId}/admin`;
              }}
            >
              Continue to Dashboard
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

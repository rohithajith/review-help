import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Alert, Button, Paper, CircularProgress, Stack } from '@mui/material';
import supabase from '../lib/supabaseClient';
import api from '../api';

function getQueryParams() {
  const hash = window.location.hash || '';
  const queryString = hash.includes('?') ? hash.split('?')[1] : (window.location.search || '').replace(/^\?/, '');
  return new URLSearchParams(queryString || '');
}

export default function PaymentPending() {
  const params = useMemo(() => getQueryParams(), []);
  const businessId = params.get('businessId');
  const canceled = params.get('canceled') === 'true';

  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState('');
  const [planData, setPlanData] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setError('Missing business ID. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token || null;
        if (!token) {
          window.location.hash = '#/login';
          return;
        }
        if (api && api.defaults) {
          api.defaults.headers.common = api.defaults.headers.common || {};
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
        }

        const res = await api.get(`/businesses/${businessId}/plan`);
        setPlanData(res?.data || null);
      } catch (err) {
        console.error('PaymentPending: failed to load billing status', err);
        if (err?.response?.status === 401) {
          window.location.hash = '#/login';
          return;
        }
        setError('Could not load billing status. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId]);

  const continuePayment = async () => {
    if (!businessId) return;
    setResuming(true);
    setError('');
    try {
      const res = await api.post('/payments/create-checkout-session-resume', { businessId: Number(businessId) });
      const url = res?.data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Could not start checkout. Please try again.');
    } catch (err) {
      console.error('PaymentPending: resume checkout failed', err);
      const message = err?.response?.data?.error || 'Could not start checkout. Please try again.';
      setError(message);
    } finally {
      setResuming(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Checking payment status...</Typography>
      </Box>
    );
  }

  const billingStatus = String(planData?.billingStatus || 'pending').toLowerCase();
  const pendingPlan = planData?.pendingPlan || planData?.plan || 'Starter';
  const isActive = billingStatus === 'active';

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', mt: 6, p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Complete Your Subscription
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Your account is created, but payment is required before accessing the app.
        </Typography>

        {canceled && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Checkout was canceled. Complete payment to continue.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Typography variant="body2">
            Plan: <strong>{pendingPlan}</strong>
          </Typography>
          <Typography variant="body2">
            Billing status: <strong>{billingStatus}</strong>
          </Typography>
          {planData?.trialEndsAt && (
            <Typography variant="body2">
              Trial ends: <strong>{new Date(planData.trialEndsAt).toLocaleString()}</strong>
            </Typography>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {!isActive ? (
            <Button variant="contained" onClick={continuePayment} disabled={resuming}>
              {resuming ? 'Redirecting…' : 'Continue Payment'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => { window.location.hash = `#/business/${businessId}/admin`; }}
            >
              Go to Dashboard
            </Button>
          )}
          <Button variant="outlined" onClick={() => { window.location.hash = '#/login'; }}>
            Back to Login
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}


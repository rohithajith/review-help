import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';
import api from '../api';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [error, setError] = useState(null);

  const routeAfterLogin = (businesses = [], defaultBusinessId = null) => {
    const list = Array.isArray(businesses) ? businesses : [];
    if (list.length === 0) return false;

    if (list.length === 1) {
      const onlyId = Number(list[0].id);
      window.location.hash = `#/business/${onlyId}/admin`;
      return true;
    }

    // Multi-business accounts go to consolidated admin; preserve preferred selection.
    const settings = (() => {
      try { return JSON.parse(localStorage.getItem('settings') || '{}') || {}; }
      catch { return {}; }
    })();
    const storedId = Number(settings.businessId);
    const selectedId = (
      Number.isInteger(storedId) && list.some((b) => Number(b.id) === storedId)
    )
      ? storedId
      : (Number(defaultBusinessId) || Number(list[0].id));
    try {
      localStorage.setItem('settings', JSON.stringify({ ...settings, businessId: selectedId }));
    } catch (e) { /* ignore storage failures */ }

    window.location.hash = '#/admin';
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Sign in with email/password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: String(email).trim(),
        password: String(password),
      });
      if (signInError) {
        setError(signInError.message || JSON.stringify(signInError));
        setLoading(false);
        return;
      }

      const session = data?.session || null;
      const accessToken = session?.access_token || null;
      if (!accessToken) {
        setError('Login succeeded but no access token was returned');
        setLoading(false);
        return;
      }

      // Set Authorization header for API client (axios)
      try { if (api && api.defaults) api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`; } catch (e) {}

      let redirected = false;
      let userContextFailed = false;

      // Preferred flow: fetch user context (owned businesses) and route accordingly
      try {
        const res = await api.get('/users/me');
        const body = res && res.data ? res.data : null;
        if (body && Array.isArray(body.businesses) && body.businesses.length > 0) {
          redirected = routeAfterLogin(body.businesses, body.defaultBusinessId);
          if (redirected) return;
        }
      } catch (e) {
        userContextFailed = true;
        console.warn('User context call failed, falling back to onboarding', e);
      }

      // If user-context call failed transiently, do not block successful auth.
      // Route to admin and let authenticated pages finish initialization.
      if (!redirected && userContextFailed) {
        window.location.hash = '#/admin';
        return;
      }

      // Fallback for first-time users with no business yet.
      if (!redirected) {
        try {
          const res = await api.post('/users/onboard');
          const body = res && res.data ? res.data : null;
          const routed = routeAfterLogin(body?.businesses || [], body?.defaultBusinessId || body?.businessId);
          if (routed) {
            redirected = true;
            return;
          }
          setError('Login succeeded but no business was returned. Please try again or contact support.');
        } catch (e) {
          console.warn('Onboarding call failed', e);
          // Do not block signed-in users if onboarding endpoint is transiently unavailable.
          window.location.hash = '#/admin';
          return;
        }
      }

      if (!redirected && typeof onLoginSuccess === 'function') onLoginSuccess(session);
      if (!redirected) setLoading(false);
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetMessage('');
    const trimmedEmail = String(email || '').trim();
    if (!trimmedEmail) {
      setError('Enter your email first, then click Forgot password.');
      return;
    }
    setResetLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (resetError) {
        setError(resetError.message || 'Could not send reset email.');
      } else {
        setResetMessage('Password reset link sent. Check your inbox.');
      }
    } catch (err) {
      setError(err && err.message ? err.message : 'Could not send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Business Owner Login</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {resetMessage && <Alert severity="success" sx={{ mb: 2 }}>{resetMessage}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField fullWidth label="Email" type="email" margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField fullWidth label="Password" type="password" margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 1 }}>
          <Button type="button" variant="text" onClick={handleForgotPassword} disabled={resetLoading || loading}>
            {resetLoading ? 'Sending reset link…' : 'Forgot password?'}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </Box>
      </form>
    </Box>
  );
}

import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';
import api from '../api';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Create account
      const { error: signUpErr } = await supabase.auth.signUp({ email: String(email).trim(), password: String(password) });
      if (signUpErr) {
        // If user already exists, try sign in
        if (signUpErr.status === 400) {
          // fall through to sign-in
        } else {
          setError(signUpErr.message || JSON.stringify(signUpErr));
          setLoading(false);
          return;
        }
      }

      // Sign in to obtain session
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: String(email).trim(), password: String(password) });
      if (signInErr) {
        setError(signInErr.message || JSON.stringify(signInErr));
        setLoading(false);
        return;
      }

      const session = signInData?.session || null;
      const accessToken = session?.access_token || null;
      if (!accessToken) {
        setError('Signup succeeded but no access token was returned');
        setLoading(false);
        return;
      }

      try { localStorage.setItem('supabase_access_token', accessToken); } catch (e) {}
      try { if (api && api.defaults) api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`; } catch (e) {}

      try {
        const res = await api.post('/users/onboard', { business_name: businessName || undefined });
        const body = res && res.data ? res.data : null;
        if (body && body.businessId) {
          window.location.hash = `#/business/${body.businessId}/admin`;
          return;
        }
        setError('Account created but no business was returned. Please refresh and try again.');
      } catch (e) {
        console.warn('Onboarding failed', e);
        setError('Could not finish account creation. Please try again.');
      }

      setLoading(false);
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Create an account</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField fullWidth label="Email" type="email" margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField fullWidth label="Password" type="password" margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
        <TextField fullWidth label="Business name (optional)" margin="normal" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
        </Box>
      </form>
    </Box>
  );
}

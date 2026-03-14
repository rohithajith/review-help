import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import supabase from '../lib/supabaseClient';

function readHashParams() {
  const raw = window.location.hash || '';
  const queryPart = raw.includes('?') ? raw.split('?')[1] : '';
  const fragments = raw.split('#').filter(Boolean);
  const tokenPart = fragments.length > 1 ? fragments[fragments.length - 1] : (fragments[0] || '');
  const merged = [queryPart, tokenPart].filter(Boolean).join('&');
  return new URLSearchParams(merged);
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const initRecoverySession = async () => {
      setError('');
      const params = readHashParams();
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (type !== 'recovery' || !accessToken || !refreshToken) {
        setRecoveryReady(false);
        setError('This reset link is invalid or expired. Please request a new password reset email.');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        setRecoveryReady(false);
        setError(sessionError.message || 'Could not validate reset link.');
        return;
      }

      setRecoveryReady(true);
    };

    initRecoverySession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!recoveryReady) {
      setError('Reset session is not ready. Request a new reset email.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Could not update password.');
        return;
      }
      setMessage('Password updated successfully. You can now sign in.');
    } catch (err) {
      setError(err && err.message ? err.message : 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Reset Password</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="New Password"
          type="password"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading || !recoveryReady}
          helperText="At least 8 characters"
        />
        <TextField
          fullWidth
          label="Confirm Password"
          type="password"
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading || !recoveryReady}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, gap: 1 }}>
          <Button type="button" variant="text" onClick={() => { window.location.hash = '#/login'; }}>
            Back to Login
          </Button>
          <Button type="submit" variant="contained" disabled={loading || !recoveryReady}>
            {loading ? 'Updating…' : 'Update Password'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}

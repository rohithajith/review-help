import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';
import api from '../api';
import { Box, Button, TextField, Typography, Alert, Link, CircularProgress, Paper } from '@mui/material';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
        if (signInError.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message?.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account first.');
        } else {
          setError(signInError.message || 'Login failed. Please try again.');
        }
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

      // Persist token locally
      try { localStorage.setItem('supabase_access_token', accessToken); } catch (e) {}

      // Set Authorization header for API client
      try { if (api && api.defaults) api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`; } catch (e) {}

      let redirected = false;
      // Call onboarding endpoint to get user's business
      try {
        const res = await api.post('/users/onboard');
        const body = res?.data;
        if (body && body.businessId) {
          redirected = true;
          window.location.hash = `#/business/${body.businessId}/admin`;
          return;
        }
        setError('Login succeeded but no business found. Please contact support.');
      } catch (e) {
        console.warn('Onboarding call failed', e);
        setError('Unable to complete login. Please try again.');
      }

      if (!redirected && typeof onLoginSuccess === 'function') onLoginSuccess(session);
      if (!redirected) setLoading(false);
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        String(email).trim(),
        { redirectTo: window.location.origin + '/#/login' }
      );
      
      if (resetError) {
        setError(resetError.message || 'Failed to send reset email');
      } else {
        setResetSent(true);
      }
    } catch (err) {
      setError(err?.message || 'Failed to send reset email');
    }
    setLoading(false);
  };

  if (showForgotPassword) {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 6, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>Reset Password</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your email and we'll send you a link to reset your password.
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        
        {resetSent ? (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>📧 Check Your Email</Typography>
            <Typography variant="body2">
              We've sent a password reset link to <strong>{email}</strong>
            </Typography>
            <Button 
              variant="text" 
              sx={{ mt: 2 }} 
              onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
            >
              Back to Login
            </Button>
          </Paper>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <TextField 
              fullWidth 
              label="Email Address" 
              type="email" 
              margin="normal" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button 
                variant="text" 
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Login
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading || !email}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Box>
          </form>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 6, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>Welcome Back</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sign in to your Review-Help account
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <TextField 
          fullWidth 
          label="Email Address" 
          type="email" 
          margin="normal" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <TextField 
          fullWidth 
          label="Password" 
          type="password" 
          margin="normal" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Link 
            component="button" 
            type="button"
            variant="body2" 
            onClick={() => setShowForgotPassword(true)}
            sx={{ cursor: 'pointer' }}
          >
            Forgot password?
          </Link>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </Box>
      </form>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        Don't have an account?{' '}
        <Button 
          variant="text" 
          size="small" 
          onClick={() => window.location.hash = '#/signup'}
          sx={{ textTransform: 'none' }}
        >
          Sign up
        </Button>
      </Typography>
    </Box>
  );
}

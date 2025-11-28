import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import api from '../api';

/**
 * BusinessLoginModal - Login popup for business admin access
 * 
 * Props:
 *   - open: boolean - whether the modal is open
 *   - businessId: string/number - the business ID
 *   - businessName: string - optional business name for display
 *   - onClose: function - called when modal is closed (cancelled)
 *   - onLoginSuccess: function(token) - called when login succeeds
 */
const BusinessLoginModal = ({ open, businessId, businessName, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post(`/businesses/${businessId}/admin/login`, {
        username: username.trim(),
        password,
      });

      if (response.data.success) {
        // Store token in sessionStorage (cleared when browser closes)
        const token = response.data.token;
        sessionStorage.setItem(`business_admin_token_${businessId}`, token);
        
        // Notify parent
        if (onLoginSuccess) {
          onLoginSuccess(token);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError('');
    if (onClose) onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        pb: 1,
        pt: 3,
      }}>
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 1.5 
        }}>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <LockIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={600}>
            Admin Login
          </Typography>
          {businessName && (
            <Typography variant="body2" color="text.secondary">
              {businessName}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <form onSubmit={handleLogin}>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, flexDirection: 'column', gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || !username.trim() || !password}
            sx={{ 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>
          
          <Button
            variant="text"
            onClick={handleClose}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BusinessLoginModal;

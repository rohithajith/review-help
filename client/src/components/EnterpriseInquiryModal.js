import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Business,
  CheckCircle,
  Close,
} from '@mui/icons-material';
import api from '../api';

const BUSINESS_TYPES = [
  'Restaurant / Food Service',
  'Retail / Shopping',
  'Salon / Spa / Beauty',
  'Healthcare / Medical',
  'Hospitality / Hotels',
  'Professional Services',
  'Automotive',
  'Real Estate',
  'Fitness / Gym',
  'Other',
];

const LOCATION_RANGES = [
  '6-10 locations',
  '11-25 locations',
  '26-50 locations',
  '51-100 locations',
  '100+ locations',
];

const REVIEW_VOLUME_RANGES = [
  'Less than 50 reviews/month',
  '50-100 reviews/month',
  '100-500 reviews/month',
  '500-1000 reviews/month',
  '1000+ reviews/month',
];

const REVIEW_PLATFORMS = [
  'Google',
  'Yelp',
  'TripAdvisor',
  'Facebook',
  'JustEat',
  'Deliveroo',
  'Uber Eats',
  'Trustpilot',
  'Other',
];

export default function EnterpriseInquiryModal({ open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
    numberOfLocations: '',
    currentReviewVolume: '',
    reviewPlatforms: [],
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlatformToggle = (platform) => {
    setFormData((prev) => ({
      ...prev,
      reviewPlatforms: prev.reviewPlatforms.includes(platform)
        ? prev.reviewPlatforms.filter((p) => p !== platform)
        : [...prev.reviewPlatforms, platform],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/contact/enterprise', formData);
      if (response.data && response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data?.error || 'Failed to submit inquiry. Please try again.');
      }
    } catch (err) {
      console.error('Enterprise inquiry error:', err);
      setError(
        err.response?.data?.error ||
        'Failed to submit inquiry. Please try again or email us directly at info@reviewhelp.uk'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        contactName: '',
        email: '',
        phone: '',
        businessName: '',
        businessType: '',
        numberOfLocations: '',
        currentReviewVolume: '',
        reviewPlatforms: [],
        message: '',
      });
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { 
          borderRadius: isMobile ? 0 : 3,
          m: isMobile ? 0 : 2,
        },
      }}
    >
      {success ? (
        <>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 }, px: { xs: 1, sm: 2 } }}>
              <CheckCircle sx={{ fontSize: { xs: 60, sm: 80 }, color: '#10b981', mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#1e3c72', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Thank You!
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Your enterprise inquiry has been received.
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Our team will review your requirements and contact you within 24 hours 
                to discuss a custom solution for {formData.businessName || 'your business'}.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleClose}
              sx={{
                bgcolor: '#10b981',
                py: 1.5,
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ pb: 1, pr: { xs: 6, sm: 2 }, position: 'relative' }}>
            {isMobile && (
              <IconButton
                onClick={handleClose}
                disabled={loading}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'text.secondary',
                }}
              >
                <Close />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 } }}>
              <Business sx={{ color: '#10b981', fontSize: { xs: 28, sm: 32 }, mt: 0.5 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e3c72', fontSize: { xs: '1.1rem', sm: '1.5rem' }, lineHeight: 1.3 }}>
                  Enterprise Plan Inquiry
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, mt: 0.5 }}>
                  Tell us about your business and we'll create a custom solution
                </Typography>
              </Box>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e3c72', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
              Contact Information
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Your Name"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number (optional)"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e3c72', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
              Business Information
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Business Name"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Business Type</InputLabel>
                  <Select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    label="Business Type"
                    disabled={loading}
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Number of Locations</InputLabel>
                  <Select
                    name="numberOfLocations"
                    value={formData.numberOfLocations}
                    onChange={handleChange}
                    label="Number of Locations"
                    disabled={loading}
                  >
                    {LOCATION_RANGES.map((range) => (
                      <MenuItem key={range} value={range}>
                        {range}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Current Review Volume</InputLabel>
                  <Select
                    name="currentReviewVolume"
                    value={formData.currentReviewVolume}
                    onChange={handleChange}
                    label="Current Review Volume"
                    disabled={loading}
                  >
                    {REVIEW_VOLUME_RANGES.map((range) => (
                      <MenuItem key={range} value={range}>
                        {range}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e3c72', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
              Review Platforms You Use
            </Typography>
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.75, sm: 1 } }}>
                {REVIEW_PLATFORMS.map((platform) => (
                  <Chip
                    key={platform}
                    label={platform}
                    onClick={() => handlePlatformToggle(platform)}
                    color={formData.reviewPlatforms.includes(platform) ? 'primary' : 'default'}
                    variant={formData.reviewPlatforms.includes(platform) ? 'filled' : 'outlined'}
                    disabled={loading}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{
                      cursor: 'pointer',
                      fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                      '&:hover': {
                        bgcolor: formData.reviewPlatforms.includes(platform) 
                          ? undefined 
                          : 'rgba(16, 185, 129, 0.1)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1e3c72', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
              Additional Information
            </Typography>
            <TextField
              fullWidth
              label="Tell us about your specific needs (optional)"
              name="message"
              multiline
              rows={isMobile ? 2 : 3}
              value={formData.message}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g., Custom integrations needed, specific features required, timeline, etc."
              size={isMobile ? 'small' : 'medium'}
            />
          </DialogContent>

          <DialogActions sx={{ p: { xs: 2, sm: 3 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button
              onClick={handleClose}
              disabled={loading}
              sx={{ color: 'text.secondary', order: { xs: 2, sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: '#10b981',
                px: { xs: 3, sm: 4 },
                py: { xs: 1.25, sm: 1 },
                order: { xs: 1, sm: 2 },
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Inquiry'}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}

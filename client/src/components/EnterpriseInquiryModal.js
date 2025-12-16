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
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      {success ? (
        <>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 80, color: '#10b981', mb: 3 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#1e3c72' }}>
                Thank You!
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Your enterprise inquiry has been received.
              </Typography>
              <Typography color="text.secondary">
                Our team will review your requirements and contact you within 24 hours 
                to discuss a custom solution for {formData.businessName || 'your business'}.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
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
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Business sx={{ color: '#10b981', fontSize: 32 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e3c72' }}>
                  Enterprise Plan Inquiry
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tell us about your business and we'll create a custom solution
                </Typography>
              </Box>
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1e3c72' }}>
              Contact Information
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Your Name"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  disabled={loading}
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
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1e3c72' }}>
              Business Information
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Business Name"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
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
                <FormControl fullWidth>
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
                <FormControl fullWidth>
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

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1e3c72' }}>
              Review Platforms You Use
            </Typography>
            <Box sx={{ mb: 3 }}>
              <FormGroup row sx={{ gap: 1 }}>
                {REVIEW_PLATFORMS.map((platform) => (
                  <Chip
                    key={platform}
                    label={platform}
                    onClick={() => handlePlatformToggle(platform)}
                    color={formData.reviewPlatforms.includes(platform) ? 'primary' : 'default'}
                    variant={formData.reviewPlatforms.includes(platform) ? 'filled' : 'outlined'}
                    disabled={loading}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: formData.reviewPlatforms.includes(platform) 
                          ? undefined 
                          : 'rgba(16, 185, 129, 0.1)',
                      },
                    }}
                  />
                ))}
              </FormGroup>
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1e3c72' }}>
              Additional Information
            </Typography>
            <TextField
              fullWidth
              label="Tell us about your specific needs (optional)"
              name="message"
              multiline
              rows={3}
              value={formData.message}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g., Custom integrations needed, specific features required, timeline, etc."
            />
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleClose}
              disabled={loading}
              sx={{ color: 'text.secondary' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: '#10b981',
                px: 4,
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

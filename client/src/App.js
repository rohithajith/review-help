import React, { useState, useEffect } from 'react';
import api from './api';
import { HashRouter as Router, Route, Routes, useParams, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Landing from './components/Landing';
import Pricing from './components/Pricing';
import Contact from './components/Contact';
import Signup from './components/Signup';
import SignupSuccess from './components/SignupSuccess';
import NavBar from './components/Navbar';
import useTemplates from './hooks/useTemplates';
import useScrollGradient from './hooks/useScrollGradient';
import Footer from './components/Footer';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdminDashboard from './components/AdminDashboard';
import BusinessAdmin from './components/BusinessAdmin';
import './App.css';

// Logo mapping for businesses (static logos stored in public/logos/)
const businessLogos = {
  2: '/logos/myras-fish-bar.png', // Myra's Fish Bar
};

// =============================================================================
// Business Template Page - Each business owner gets their unique URL
// Example: http://your-domain.com/#/business/2 for Myra's Fish Bar
// =============================================================================
function BusinessTemplatePage() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);
  const [businessError, setBusinessError] = useState(null);
  const { templates, loading, error, refresh } = useTemplates(businessId);
  const scrollBg = useScrollGradient();
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showChannelPopup, setShowChannelPopup] = useState(false);
  const [lastSavedReview, setLastSavedReview] = useState('');

  // Fetch business details when businessId changes
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId) return;
      try {
        const res = await api.get(`/${businessId}/business`);
        setBusiness(res.data || null);
        setBusinessError(null);
      } catch (err) {
        console.error('Error fetching business details', err);
        setBusinessError('Business not found');
      }
    };
    fetchBusiness();
  }, [businessId]);

  useEffect(() => {
    if (!Array.isArray(templates) || templates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }
    if (!selectedTemplateId || !templates.some((t) => t.id === selectedTemplateId)) {
      const first = templates[0];
      setSelectedTemplateId(first.id);
      setReviewText(first.text || '');
    }
  }, [templates, selectedTemplateId]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setReviewText(template.text || '');
  };

  const getChannelUrl = (channelName) => {
    const normalized = String(channelName || '').toLowerCase();
    const configured = Array.isArray(business?.review_platforms)
      ? business.review_platforms.find((p) => String(p.name || '').toLowerCase().includes(normalized))
      : null;
    if (configured && configured.url) return configured.url;
    if (normalized === 'google') {
      if (business?.google_review_url) return business.google_review_url;
      return `https://www.google.com/search?q=${encodeURIComponent(business?.name || '')}+reviews`;
    }
    if (normalized === 'tripadvisor') {
      return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(business?.name || '')}`;
    }
    return null;
  };

  const handleSubmitInAppReview = async () => {
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (!selectedTemplate || !reviewText.trim() || !rating) return;
    setSubmitting(true);
    try {
      await api.post(`/${businessId}/reviews`, {
        templateId: selectedTemplate.id,
        rating,
        reviewText: reviewText.trim(),
      });
      setLastSavedReview(reviewText.trim());
      setSuccessMessage('Review taken');
      setShowChannelPopup(true);
      if (typeof refresh === 'function') await refresh(businessId);
    } catch (err) {
      console.error('Error submitting review', err);
      setSuccessMessage('Could not save your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostToChannel = async (channelName) => {
    const url = getChannelUrl(channelName);
    try {
      await navigator.clipboard.writeText(lastSavedReview || reviewText || '');
    } catch (e) {
      // ignore clipboard permission failures
    }
    if (url) window.open(url, '_blank');
    setShowChannelPopup(false);
  };

  // Loading state
  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress color="primary" />
    </Box>
  );
  
  // Business not found
  if (businessError) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={2}>
      <Alert severity="error">{businessError}</Alert>
    </Box>
  );
  
  // API error
  if (error) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={2}>
      <Alert severity="error">Error: {error}</Alert>
    </Box>
  );

  return (
    <Box 
      className="App" 
      sx={{ 
        minHeight: '100vh',
        background: scrollBg, 
        transition: 'background 300ms linear'
      }}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Business Logo and Welcome Message */}
        {businessLogos[businessId] && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', justifyContent: 'center', mb: 4 }}>
            <Box
              component="img"
              src={businessLogos[businessId]}
              alt={business?.name || 'Business Logo'}
              sx={{
                height: { xs: 80, md: 100 },
                width: 'auto',
                borderRadius: 2,
              }}
            />
            {business?.welcome_message && (
              <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center' }}>
                {business.welcome_message}
              </Typography>
            )}
          </Box>
        )}

        {/* Business Name Header (if no logo configured) */}
        {!businessLogos[businessId] && business?.name && (
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" color="primary">
              {business.name}
            </Typography>
            {business?.welcome_message && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                {business.welcome_message}
              </Typography>
            )}
          </Box>
        )}

        {/* Admin Button - small, unobtrusive */}
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => window.location.hash = `#/business/${businessId}/admin`}
            sx={{ 
              opacity: 0.7, 
              '&:hover': { opacity: 1 },
              backgroundColor: 'rgba(255,255,255,0.9)',
            }}
          >
            Admin
          </Button>
        </Box>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={3000}
          onClose={() => setSuccessMessage('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccessMessage('')} severity={successMessage === 'Review taken' ? 'success' : 'error'}>
            {successMessage}
          </Alert>
        </Snackbar>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
            1) Select template
          </Typography>
          {templates.length > 1 ? (
            <Grid container spacing={2}>
              {templates.map((template) => (
                <Grid item xs={12} md={6} key={template.id}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardContent>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {template.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {templates[0]?.text || 'No templates available'}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        <Box sx={{ mb: 4, textAlign: 'left' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            2) Submit once inside the app
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Rating
            </Typography>
            <Rating value={rating} onChange={(_, v) => setRating(v || 0)} />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Your review"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSubmitInAppReview}
              disabled={submitting || !selectedTemplateId || !rating || !reviewText.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </Box>
        </Box>

        <Dialog open={showChannelPopup} onClose={() => setShowChannelPopup(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Would you also like to post this on Google / TripAdvisor?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Review text is ready. You can copy and paste it manually on the external platform.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={lastSavedReview}
              InputProps={{ readOnly: true }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => navigator.clipboard.writeText(lastSavedReview || '')}
            >
              Copy Review Text
            </Button>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button startIcon={<OpenInNewIcon />} onClick={() => handlePostToChannel('Google')}>
              Post on Google
            </Button>
            <Button startIcon={<OpenInNewIcon />} onClick={() => handlePostToChannel('TripAdvisor')}>
              Post on TripAdvisor
            </Button>
            <Button variant="contained" onClick={() => setShowChannelPopup(false)}>
              Skip
            </Button>
          </DialogActions>
        </Dialog>

        <Footer />
      </Container>
    </Box>
  );
}

// =============================================================================
// Business Admin Page Wrapper
// =============================================================================
function BusinessAdminPage() {
  const { businessId } = useParams();
  return <BusinessAdmin businessId={businessId} />;
}

// =============================================================================
// Main App Router
// =============================================================================
export default function App() {
  // On app start, apply any saved access token to the API client
  React.useEffect(() => {
    try {
      const token = localStorage.getItem('supabase_access_token');
      if (token && api && api.defaults) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      // ignore
    }
  }, []);
  return (
    <Router>
      <NavBar />
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-success" element={<SignupSuccess />} />
        {/* Business-specific template page - give this URL to customers */}
        {/* Example: http://localhost:3000/#/business/2 for Myra's Fish Bar */}
        <Route path="/business/:businessId" element={<BusinessTemplatePage />} />
        
        {/* Business-specific admin - give this URL to business owners */}
        {/* Example: http://localhost:3000/#/business/2/admin for Myra's admin */}
        <Route path="/business/:businessId/admin" element={<BusinessAdminPage />} />
        
        {/* Super admin dashboard - for you to manage all businesses */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Simple login route for business owners */}
        <Route path="/login" element={<Login />} />
        
        {/* Catch-all: redirect unknown hashes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

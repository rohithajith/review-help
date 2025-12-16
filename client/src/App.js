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
import { Container, Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import TemplateList from './components/TemplateList';
import EditModal from './components/EditModal';
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
  const [editingTemplate, setEditingTemplate] = useState(null);

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

  const handleEdit = (template) => setEditingTemplate(template);
  
  const handleSave = async (updatedTemplate) => {
    try {
      if (businessId && updatedTemplate && updatedTemplate.id) {
        await api.put(`/${businessId}/templates/${updatedTemplate.id}`, { text: updatedTemplate.text });
      }
    } catch (err) {
      console.error('Failed to save template', err);
    } finally {
      try {
        if (typeof refresh === 'function') await refresh(businessId);
      } catch (refreshErr) {
        console.error('Error refreshing templates', refreshErr);
      }
      setEditingTemplate(null);
    }
  };

  const handleCopyAndLeaveReview = async (template, platformUrl = null) => {
    try {
      // Archive template and rotate in a new one from backups
      if (businessId && template && template.id) {
        await api.post(`/${businessId}/templates/${template.id}/use`, { modifiedText: template.text });
        if (typeof refresh === 'function') await refresh(businessId);
      }
    } catch (err) {
      console.error('Error archiving template', err);
      alert('Could not save your changes. Please try again.');
      return;
    }

    // Copy text to clipboard
    try { await navigator.clipboard.writeText(template.text); } catch (e) {}

    // Open the specified platform URL, or fallback to google_review_url, or search
    const url = platformUrl || business?.google_review_url || 
      `https://www.google.com/search?q=${encodeURIComponent(business?.name || '')}+reviews`;
    if (url) window.open(url, '_blank');
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

        <TemplateList
          templates={templates}
          onEdit={handleEdit}
          onCopyAndLeaveReview={handleCopyAndLeaveReview}
        />
        
        {editingTemplate && (
          <EditModal
            template={editingTemplate}
            onClose={() => setEditingTemplate(null)}
            onSave={handleSave}
            onCopyAndLeaveReview={handleCopyAndLeaveReview}
            reviewPlatforms={business?.review_platforms || []}
          />
        )}

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

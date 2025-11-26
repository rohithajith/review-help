import React, { useState, useEffect } from 'react';
import api from './api';
import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import useTemplates from './hooks/useTemplates';
import useScrollGradient from './hooks/useScrollGradient';
import Footer from './components/Footer';
import { Container, Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import TemplateList from './components/TemplateList';
import EditModal from './components/EditModal';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function AppInner() {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  const [selectedBusinessId, setSelectedBusinessId] = useState(settings.businessId || null);
  const [business, setBusiness] = useState(null);
  const { templates, loading, error, refresh } = useTemplates(selectedBusinessId);
  const scrollBg = useScrollGradient();
  const location = useLocation();
  const showGradient = !(location.pathname && location.pathname.startsWith('/admin'));

  // Logo mapping for businesses (static logos stored in public/logos/)
  const businessLogos = {
    3: '/logos/myras-fish-bar.png', // Myra's Fish Bar
  };

  useEffect(() => {
    const initBusiness = async () => {
      if (selectedBusinessId) {
        // Fetch business details for the selected business
        try {
          const res = await api.get(`/${selectedBusinessId}/business`);
          setBusiness(res.data || null);
        } catch (err) {
          console.error('Error fetching business details', err);
        }
        return;
      }
      try {
        const res = await api.get('/businesses');
        const list = Array.isArray(res && res.data) ? res.data : [];
        if (list.length > 0) {
          const firstId = list[0].id;
          setSelectedBusinessId(firstId);
          setBusiness(list[0]);
          const s = JSON.parse(localStorage.getItem('settings')) || {};
          s.businessId = firstId;
          localStorage.setItem('settings', JSON.stringify(s));
        }
      } catch (err) {
        console.error('App: error during initBusiness fetch /businesses', err);
      }
    };
    initBusiness();
  }, [selectedBusinessId]);

  const [editingTemplate, setEditingTemplate] = useState(null);

  const handleEdit = (template) => setEditingTemplate(template);
  const handleSave = async (updatedTemplate) => {
    // persist changes to API if possible, then close editor locally
    try {
      const settings = JSON.parse(localStorage.getItem('settings')) || {};
      const bizId = settings.businessId || selectedBusinessId;
      if (bizId && updatedTemplate && updatedTemplate.id) {
        await api.put(`/${bizId}/templates/${updatedTemplate.id}`, { text: updatedTemplate.text });
      }
      } catch (err) {
      console.error('Failed to save template from EditModal', err);
    } finally {
      try {
        if (typeof refresh === 'function') await refresh(selectedBusinessId);
      } catch (refreshErr) {
        console.error('Error refreshing templates after save', refreshErr);
      }
      setEditingTemplate(null);
    }
  };
  const handleCopyAndLeaveReview = async (template) => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const bizId = settings.businessId || selectedBusinessId;

    try {
      // Call backend archive+rotate endpoint which saves modifiedText into archived_templates,
      // removes the active template and rotates in one from backup_templates.
      if (bizId && template && template.id) {
        await api.post(`/${bizId}/templates/${template.id}/use`, { modifiedText: template.text });
        // refresh templates so UI reflects rotation
        if (typeof refresh === 'function') await refresh(bizId);
      }
    } catch (err) {
      console.error('Error archiving template before copy/review', err);
      // If archive fails, surface a simple alert and abort copy/review
      try { alert('Could not save your changes for archiving. Please try again.'); } catch (e) {}
      return;
    }

    // copy text and open review URL after successful archive/rotation
    try { await navigator.clipboard.writeText(template.text); } catch (e) { /* ignore clipboard errors */ }

    const platform = (() => {
      try { return sessionStorage.getItem('preferredReviewPlatform'); } catch (e) { return null; }
    })();

    let url = null;
    if (platform === 'booking') {
      const q = encodeURIComponent(settings.businessName || template.businessName || '');
      url = `https://www.booking.com/searchresults.html?ss=${q}`;
    } else {
      url = settings.googleReviewUrl || template.google_review_url || `https://www.google.com/search?q=${encodeURIComponent(settings.businessName || '')}+reviews`;
    }

    if (url) window.open(url, '_blank');
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress color="primary" />
    </Box>
  );
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
        ...(showGradient ? { background: scrollBg, transition: 'background 300ms linear' } : {})
      }}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Only show the logo header on non-admin routes when business has a logo */}
        {!location.pathname.startsWith('/admin') && selectedBusinessId && businessLogos[selectedBusinessId] && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', justifyContent: 'center', mb: 4 }}>
            <Box
              component="img"
              src={businessLogos[selectedBusinessId]}
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

        <Routes>
          <Route path="/" exact element={
            <Box>
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
                />
              )}
            </Box>
          } />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>

        <Footer />
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

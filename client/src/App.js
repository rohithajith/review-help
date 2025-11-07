import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import useTemplates from './hooks/useTemplates';
import useScrollGradient from './hooks/useScrollGradient';
import Footer from './components/Footer';
import AppNavbar from './components/Navbar';
import { Container } from 'react-bootstrap';
import TemplateList from './components/TemplateList';
import EditModal from './components/EditModal';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  const [selectedBusinessId, setSelectedBusinessId] = useState(settings.businessId || null);
  const { templates, loading, error } = useTemplates(selectedBusinessId);
  // background gradient based on scroll position (smooth transition)
  const scrollBg = useScrollGradient();

  // On app load, if no businessId is configured, attempt to pick the first
  // business returned by the API and persist it. This ensures the root page can
  // show templates without visiting the Admin dashboard first.
  useEffect(() => {
    const initBusiness = async () => {
      if (selectedBusinessId) return;
      try {
        const apiBase = process.env.REACT_APP_API_URL || '';
        const res = await axios.get(`${apiBase}/businesses`);
        const list = res.data || [];
        if (list.length > 0) {
          const firstId = list[0].id;
          setSelectedBusinessId(firstId);
          const s = JSON.parse(localStorage.getItem('settings')) || {};
          s.businessId = firstId;
          localStorage.setItem('settings', JSON.stringify(s));
        }
      } catch (err) {
        // don't block rendering; error will be visible in templates hook if any
        // console.warn('Could not auto-select business', err);
      }
    };
    initBusiness();
  }, [selectedBusinessId]);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // useTemplates hook handles fetching and state

  const handleEdit = (template) => {
    setEditingTemplate(template);
  };

  const handleSave = (updatedTemplate) => {
    // Update local state via hook if needed
    setEditingTemplate(null);
  };

  const handleCopyAndLeaveReview = (template) => {
    navigator.clipboard.writeText(template.text);
    // prefer configured google review url
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const url = settings.googleReviewUrl || template.google_review_url || `https://www.google.com/search?q=${encodeURIComponent(settings.businessName || '')}+reviews`;
    if (url) window.open(url, '_blank');
  };

  if (loading) {
    return <div>Loading templates...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Router>
      <div className="App" style={{ background: scrollBg, transition: 'background 300ms linear' }}>
        <AppNavbar />
        <Container>
          <header className="App-header">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1>Review Templates</h1>
            </div>
            <Routes>
              <Route path="/" exact element={
                <div className="template-list">
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
                    />
                  )}
                </div>
              } />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </header>
          <Footer />
        </Container>
      </div>
    </Router>
  );
}

export default App;

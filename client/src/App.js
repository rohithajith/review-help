import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import useTemplates from './hooks/useTemplates';
import Footer from './components/Footer';
import AppNavbar from './components/Navbar';
import { Container } from 'react-bootstrap';
import TemplateList from './components/TemplateList';
import EditModal from './components/EditModal';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const { templates, loading, error } = useTemplates();
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
    window.open(`https://www.google.com/maps/place/${template.businessId}/reviews`, '_blank');
  };

  if (loading) {
    return <div>Loading templates...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Router>
      <div className="App">
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

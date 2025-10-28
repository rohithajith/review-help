import React, { useState, useEffect } from 'react';
import useTemplates from './hooks/useTemplates';
import Footer from './components/Footer';
import AppNavbar from './components/Navbar';
import { Container } from 'react-bootstrap';
import TemplateList from './components/TemplateList';
import EditModal from './components/EditModal';
import './App.css';

function App() {
  const { templates, loading, error, refresh } = useTemplates();
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
    <div className="App">
      <AppNavbar />
      <Container>
        <header className="App-header">
          <h1>Review Templates</h1>
          <div className="template-list">
            <TemplateList
              templates={templates}
              onEdit={handleEdit}
              onCopyAndLeaveReview={handleCopyAndLeaveReview}
            />
          </div>
          {editingTemplate && (
            <EditModal
              template={editingTemplate}
              onClose={() => setEditingTemplate(null)}
              onSave={handleSave}
            />
          )}
        </header>
  <Footer />
      </Container>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import Footer from './components/Footer';
import AppNavbar from './components/Navbar';
import { Container } from 'react-bootstrap';
import TemplateList from './components/TemplateList';
import EditModal from './components/EditModal';
import './App.css';

function App() {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/templates`);
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        console.log("Fetched templates:", data); // Add this line
        setTemplates(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleEdit = (template) => {
    setEditingTemplate(template);
  };

  const handleSave = (updatedTemplate) => {
    setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
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

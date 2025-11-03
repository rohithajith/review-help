import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Modal, Form, Table, Alert } from 'react-bootstrap';
import axios from 'axios';

const AdminDashboard = () => {
  const [templates, setTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({ text: '' });
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');

  useEffect(() => {
    fetchTemplates();
    loadSettings();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const loadSettings = () => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    setGoogleReviewUrl(settings.googleReviewUrl || '');
    setBusinessName(settings.businessName || '');
    setWelcomeMessage(settings.welcomeMessage || '');
  };

  const saveSettings = () => {
    const settings = {
      googleReviewUrl,
      businessName,
      welcomeMessage
    };
    localStorage.setItem('settings', JSON.stringify(settings));
    setAlertMessage('Settings saved successfully');
    setAlertVariant('success');
  };

  const handleCreateTemplate = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/templates`, { text: currentTemplate.text });
      await fetchTemplates();
      setShowCreateModal(false);
      setAlertMessage('Template created successfully');
      setAlertVariant('success');
    } catch (error) {
      console.error('Error creating template:', error);
      setAlertMessage('Error creating template');
      setAlertVariant('danger');
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/templates/${currentTemplate.id}`, { text: currentTemplate.text });
      await fetchTemplates();
      setShowEditModal(false);
      setAlertMessage('Template updated successfully');
      setAlertVariant('success');
    } catch (error) {
      console.error('Error updating template:', error);
      setAlertMessage('Error updating template');
      setAlertVariant('danger');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/templates/${id}`);
      await fetchTemplates();
      setShowDeleteConfirm(false);
      setAlertMessage('Template deleted successfully');
      setAlertVariant('success');
    } catch (error) {
      console.error('Error deleting template:', error);
      setAlertMessage('Error deleting template');
      setAlertVariant('danger');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/templates/bulk`, { data: { ids: selectedTemplates } });
      await fetchTemplates();
      setShowBulkDeleteConfirm(false);
      setSelectedTemplates([]);
      setAlertMessage('Templates deleted successfully');
      setAlertVariant('success');
    } catch (error) {
      console.error('Error deleting templates:', error);
      setAlertMessage('Error deleting templates');
      setAlertVariant('danger');
    }
  };

  const handleTemplateSelect = (id) => {
    setSelectedTemplates(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  return (
    <Container>
      {alertMessage && <Alert variant={alertVariant} onClose={() => setAlertMessage('')} dismissible>{alertMessage}</Alert>}

      <h1>Admin Dashboard</h1>

      <Row className="mb-4">
        <Col>
          <Button onClick={() => setShowCreateModal(true)}>Create New Template</Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Button
            disabled={selectedTemplates.length === 0}
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            Delete Selected Templates
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Select</th>
                <th>Template</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleTemplateSelect(template.id)}
                    />
                  </td>
                  <td>{template.text}</td>
                  <td>
                    <Button
                      size="sm"
                      onClick={() => {
                        setCurrentTemplate(template);
                        setShowEditModal(true);
                      }}
                    >
                      Edit
                    </Button>{' '}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setCurrentTemplate(template);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>

      <h2>Google Review Link Management</h2>
      <Row className="mb-4">
        <Col>
          <Form.Group>
            <Form.Label>Google Review URL</Form.Label>
            <Form.Control
              type="url"
              value={googleReviewUrl}
              onChange={e => setGoogleReviewUrl(e.target.value)}
            />
          </Form.Group>
          <Button onClick={() => window.open(googleReviewUrl, '_blank')}>Test Link</Button>
        </Col>
      </Row>

      <h2>Settings</h2>
      <Row className="mb-4">
        <Col>
          <Form.Group>
            <Form.Label>Business Name</Form.Label>
            <Form.Control
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="mb-4">
        <Col>
          <Form.Group>
            <Form.Label>Welcome Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={welcomeMessage}
              onChange={e => setWelcomeMessage(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col>
          <Button onClick={saveSettings}>Save Settings</Button>
        </Col>
      </Row>

      {/* Create Template Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Template Text</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={currentTemplate.text}
              onChange={e => setCurrentTemplate({ text: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateTemplate}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Template Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Template Text</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={currentTemplate.text}
              onChange={e => setCurrentTemplate({ ...currentTemplate, text: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateTemplate}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this template? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => handleDeleteTemplate(currentTemplate._id)}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal show={showBulkDeleteConfirm} onHide={() => setShowBulkDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Bulk Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the selected templates? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleBulkDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
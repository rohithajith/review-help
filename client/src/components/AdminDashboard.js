import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Modal, Form, Table, Alert, Card } from 'react-bootstrap';
import axios from 'axios';

const AdminDashboard = () => {
  const [templates, setTemplates] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [newBusinessName, setNewBusinessName] = useState('');
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
    loadBusinesses();
    loadSettings();
  }, []);

  // Whenever selected business changes, load templates and branding
  useEffect(() => {
    const loadTenantData = async (bizId) => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/${bizId}/business`);
        const biz = res.data || {};
        setBusinessName(biz.name || '');
        setGoogleReviewUrl(biz.google_review_url || '');
        setWelcomeMessage(biz.welcome_message || '');
        fetchTemplates(bizId);
      } catch (err) {
        console.error('Error loading business details', err);
      }
    };

    if (selectedBusinessId) {
      loadTenantData(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  const fetchTemplates = async (bizId = selectedBusinessId) => {
    try {
      if (!bizId) return;
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/${bizId}/templates`);
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
    setSelectedBusinessId(settings.businessId || null);
  };

  const saveSettings = () => {
    const settings = {
      googleReviewUrl,
      businessName,
      welcomeMessage,
      businessId: selectedBusinessId
    };
    localStorage.setItem('settings', JSON.stringify(settings));
    setAlertMessage('Settings saved successfully');
    setAlertVariant('success');
  };

  const handleCreateTemplate = async () => {
    try {
      if (!selectedBusinessId) throw new Error('Select a business first');
      await axios.post(`${process.env.REACT_APP_API_URL}/${selectedBusinessId}/templates`, { text: currentTemplate.text });
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
      if (!selectedBusinessId) throw new Error('Select a business first');
      await axios.put(`${process.env.REACT_APP_API_URL}/${selectedBusinessId}/templates/${currentTemplate.id}`, { text: currentTemplate.text });
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
      if (!selectedBusinessId) throw new Error('Select a business first');
      await axios.delete(`${process.env.REACT_APP_API_URL}/${selectedBusinessId}/templates/${id}`);
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
      if (!selectedBusinessId) throw new Error('Select a business first');
      await axios.delete(`${process.env.REACT_APP_API_URL}/${selectedBusinessId}/templates/bulk`, { data: { ids: selectedTemplates } });
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

  const loadBusinesses = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/businesses`);
      const bizs = res.data || [];
      setBusinesses(bizs);
      // If no business is selected in settings, auto-select the first available
      const settings = JSON.parse(localStorage.getItem('settings')) || {};
      if ((!settings.businessId || settings.businessId === null || settings.businessId === '') && bizs.length > 0) {
        const firstId = bizs[0].id;
        settings.businessId = firstId;
        localStorage.setItem('settings', JSON.stringify(settings));
        setSelectedBusinessId(firstId);
        // load templates and branding for the auto-selected business
        fetchTemplates(firstId);
        try {
          const resBiz = await axios.get(`${process.env.REACT_APP_API_URL}/${firstId}/business`);
          const biz = resBiz.data || {};
          setBusinessName(biz.name || '');
          setGoogleReviewUrl(biz.google_review_url || '');
          setWelcomeMessage(biz.welcome_message || '');
        } catch (err) {
          console.error('Error loading auto-selected business details', err);
        }
      }
    } catch (err) {
      console.error('Error loading businesses', err);
    }
  };

  const handleCreateBusiness = async () => {
    try {
      if (!newBusinessName) return setAlertMessage('Business name required');
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/businesses`, { name: newBusinessName });
      setAlertMessage('Business created');
      setAlertVariant('success');
      setNewBusinessName('');
      await loadBusinesses();
    } catch (err) {
      console.error(err);
      setAlertMessage('Error creating business');
      setAlertVariant('danger');
    }
  };

  const handleSelectBusiness = async (bizId) => {
    setSelectedBusinessId(bizId);
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    settings.businessId = bizId;
    localStorage.setItem('settings', JSON.stringify(settings));
    // load branding and templates
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/${bizId}/business`);
      const biz = res.data || {};
      setBusinessName(biz.name || '');
      setGoogleReviewUrl(biz.google_review_url || '');
      setWelcomeMessage(biz.welcome_message || '');
    } catch (err) {
      console.error('Error loading business details', err);
    }
    fetchTemplates(bizId);
  };

  return (
    <Container>
      {alertMessage && <Alert variant={alertVariant} onClose={() => setAlertMessage('')} dismissible>{alertMessage}</Alert>}

      <h1 className="mb-4">Admin Dashboard</h1>

      <Row className="g-4">
        <Col md={6}>
          <Card className="admin-card">
            <Card.Header className="admin-card-header">Business</Card.Header>
            <Card.Body>
              <Form.Label className="mb-2">Select Business</Form.Label>
              <Form.Select value={selectedBusinessId || ''} onChange={e => handleSelectBusiness(Number(e.target.value))} className="mb-3">
                <option value="">-- Select business --</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Form.Select>

              <Form.Label className="mb-2">Create Business</Form.Label>
              <div className="d-flex gap-2 mb-2">
                <Form.Control value={newBusinessName} onChange={e => setNewBusinessName(e.target.value)} />
                <Button onClick={handleCreateBusiness}>Create</Button>
              </div>
            </Card.Body>
          </Card>

          <Card className="admin-card mt-3">
            <Card.Header className="admin-card-header">Templates</Card.Header>
            <Card.Body>
              <div className="mb-3 d-flex justify-content-between align-items-center">
                <div>
                  <Button onClick={() => setShowCreateModal(true)}>Create New Template</Button>{' '}
                  <Button disabled={selectedTemplates.length === 0} variant="danger" onClick={() => setShowBulkDeleteConfirm(true)}>Delete Selected</Button>
                </div>
              </div>

              <div className="templates-table-wrapper">
                <Table responsive striped bordered hover>
                  <thead>
                    <tr>
                      <th style={{width: '80px'}}>Select</th>
                      <th>Template</th>
                      <th style={{width: '160px'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map(template => (
                      <tr key={template.id}>
                        <td className="align-middle text-center">
                          <Form.Check type="checkbox" checked={selectedTemplates.includes(template.id)} onChange={() => handleTemplateSelect(template.id)} />
                        </td>
                        <td className="align-middle">{template.text}</td>
                        <td className="align-middle">
                          <div className="d-flex gap-2">
                            <Button size="sm" onClick={() => { setCurrentTemplate(template); setShowEditModal(true); }}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => { setCurrentTemplate(template); setShowDeleteConfirm(true); }}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="admin-card">
            <Card.Header className="admin-card-header">Branding & Links</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Google Review URL</Form.Label>
                <Form.Control type="url" value={googleReviewUrl} onChange={e => setGoogleReviewUrl(e.target.value)} />
              </Form.Group>
              <Button className="mb-3" onClick={() => window.open(googleReviewUrl, '_blank')}>Test Link</Button>

              <hr />

              <Form.Group className="mb-3">
                <Form.Label>Business Name</Form.Label>
                <Form.Control type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Welcome Message</Form.Label>
                <Form.Control as="textarea" rows={3} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} />
              </Form.Group>

              <div className="d-flex gap-2">
                <Button onClick={saveSettings}>Save Settings</Button>
                <Button variant="secondary" onClick={() => { setBusinessName(''); setWelcomeMessage(''); setGoogleReviewUrl(''); }}>Reset</Button>
              </div>
            </Card.Body>
          </Card>
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
          <Button variant="danger" onClick={() => handleDeleteTemplate(currentTemplate.id)}>
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
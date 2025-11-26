import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import api from '../api';
import LogsViewer from './LogsViewer';

const AdminDashboard = () => {
  const [templates, setTemplates] = useState([]);
  const [backupTemplates, setBackupTemplates] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({ text: '' });
  const [editingBackup, setEditingBackup] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');


  const fetchTemplates = useCallback(async (bizId = selectedBusinessId) => {
    try {
      if (!bizId) return;
          const response = await api.get(`/${bizId}/templates`);
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [selectedBusinessId]);

  const fetchBackups = useCallback(async (bizId = selectedBusinessId) => {
    try {
      if (!bizId) return;
      const res = await api.get(`/${bizId}/templates/backups`);
      setBackupTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching backup templates:', err);
    }
  }, [selectedBusinessId]);

  const loadSettings = useCallback(() => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    setGoogleReviewUrl(settings.googleReviewUrl || '');
    setBusinessName(settings.businessName || '');
    setWelcomeMessage(settings.welcomeMessage || '');
    setSelectedBusinessId(settings.businessId || null);
  }, []);

  const loadBusinesses = useCallback(async () => {
    try {
        const res = await api.get('/businesses');
      const bizs = Array.isArray(res && res.data) ? res.data : [];
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
              const resBiz = await api.get(`/${firstId}/business`);
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
  }, [fetchTemplates]);

  useEffect(() => {
    loadBusinesses();
    loadSettings();
  }, [loadBusinesses, loadSettings]);

  // Whenever selected business changes, load templates and branding
  useEffect(() => {
    const loadTenantData = async (bizId) => {
      try {
          const res = await api.get(`/${bizId}/business`);
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
  }, [selectedBusinessId, fetchTemplates]);

  // whenever selected business changes also load backups
  useEffect(() => {
    if (selectedBusinessId) fetchBackups(selectedBusinessId);
  }, [selectedBusinessId, fetchBackups]);

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
          await api.post(`/${selectedBusinessId}/templates`, { text: currentTemplate.text });
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

  const handleCreateBackup = async () => {
    try {
      if (!selectedBusinessId) throw new Error('Select a business first');
      await api.post(`/${selectedBusinessId}/templates/backups`, { text: currentTemplate.text });
      await fetchBackups();
      setShowCreateModal(false);
      setAlertMessage('Backup template created successfully');
      setAlertVariant('success');
    } catch (error) {
      console.error('Error creating backup template:', error);
      setAlertMessage('Error creating backup template');
      setAlertVariant('danger');
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      if (!selectedBusinessId) throw new Error('Select a business first');
          if (editingBackup) {
        await api.put(`/${selectedBusinessId}/templates/backups/${currentTemplate.id}`, { text: currentTemplate.text });
        await fetchBackups();
      } else {
        await api.put(`/${selectedBusinessId}/templates/${currentTemplate.id}`, { text: currentTemplate.text });
        await fetchTemplates();
      }
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
          if (editingBackup) {
        await api.delete(`/${selectedBusinessId}/templates/backups/${id}`);
        await fetchBackups();
      } else {
        await api.delete(`/${selectedBusinessId}/templates/${id}`);
        await fetchTemplates();
      }
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
          await api.delete(`/${selectedBusinessId}/templates/bulk`, { data: { ids: selectedTemplates } });
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

  const handleCreateBusiness = async () => {
    try {
      if (!newBusinessName) return setAlertMessage('Business name required');
          await api.post('/businesses', { name: newBusinessName });
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
          const res = await api.get(`/${bizId}/business`);
      const biz = res.data || {};
      setBusinessName(biz.name || '');
      setGoogleReviewUrl(biz.google_review_url || '');
      setWelcomeMessage(biz.welcome_message || '');
    } catch (err) {
      console.error('Error loading business details', err);
    }
    fetchTemplates(bizId);
    fetchBackups(bizId);
  };

  return (
    <Container maxWidth="xl">
      {/* Alert Snackbar */}
      <Snackbar
        open={!!alertMessage}
        autoHideDuration={6000}
        onClose={() => setAlertMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlertMessage('')}
          severity={alertVariant === 'danger' ? 'error' : alertVariant}
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>

      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {/* Business Card */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title="Business"
              sx={{
                background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                fontWeight: 600,
                '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
              }}
            />
            <CardContent>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="select-business-label">Select Business</InputLabel>
                <Select
                  labelId="select-business-label"
                  value={selectedBusinessId || ''}
                  label="Select Business"
                  onChange={e => handleSelectBusiness(Number(e.target.value))}
                >
                  <MenuItem value="">-- Select business --</MenuItem>
                  {businesses.map(b => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Create Business
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={newBusinessName}
                  onChange={e => setNewBusinessName(e.target.value)}
                  placeholder="Business name"
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateBusiness}
                >
                  Create
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Templates Card */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title="Templates"
              sx={{
                background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
              }}
            />
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => { setEditingBackup(false); setCurrentTemplate({ text: '' }); setShowCreateModal(true); }}
                >
                  Create New Template
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled={selectedTemplates.length === 0}
                  onClick={() => setShowBulkDeleteConfirm(true)}
                >
                  Delete Selected
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: '48vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 80 }}>Select</TableCell>
                      <TableCell>Template</TableCell>
                      <TableCell sx={{ width: 160 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map(template => (
                      <TableRow key={template.id} hover>
                        <TableCell align="center">
                          <Checkbox
                            checked={selectedTemplates.includes(template.id)}
                            onChange={() => handleTemplateSelect(template.id)}
                          />
                        </TableCell>
                        <TableCell>{template.text}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => { setCurrentTemplate(template); setEditingBackup(false); setShowEditModal(true); }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => { setCurrentTemplate(template); setEditingBackup(false); setShowDeleteConfirm(true); }}
                            >
                              Delete
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Backup Templates Card */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title="Backup Templates"
              sx={{
                background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
              }}
            />
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => { setEditingBackup(true); setCurrentTemplate({ text: '' }); setShowCreateModal(true); }}
                >
                  Create Backup Template
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: '48vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Template</TableCell>
                      <TableCell sx={{ width: 160 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backupTemplates.map(template => (
                      <TableRow key={template.id} hover>
                        <TableCell>{template.text}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => { setCurrentTemplate(template); setEditingBackup(true); setShowEditModal(true); }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => { setCurrentTemplate(template); setEditingBackup(true); setShowDeleteConfirm(true); }}
                            >
                              Delete
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {/* Branding & Links Card */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title="Branding & Links"
              sx={{
                background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
              }}
            />
            <CardContent>
              <TextField
                fullWidth
                label="Google Review URL"
                type="url"
                value={googleReviewUrl}
                onChange={e => setGoogleReviewUrl(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(googleReviewUrl, '_blank')}
                sx={{ mb: 3 }}
              >
                Test Link
              </Button>

              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 2 }} />

              <TextField
                fullWidth
                label="Business Name"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Welcome Message"
                multiline
                rows={3}
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={saveSettings}
                >
                  Save Settings
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => { setBusinessName(''); setWelcomeMessage(''); setGoogleReviewUrl(''); }}
                >
                  Reset
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Logs Card */}
          <Card sx={{ borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title="Logs"
              sx={{
                background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
              }}
            />
            <CardContent>
              <LogsViewer lines={200} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Template Dialog */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
          Create New Template
          <IconButton
            aria-label="close"
            onClick={() => setShowCreateModal(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Template Text"
            multiline
            rows={5}
            value={currentTemplate.text}
            onChange={e => setCurrentTemplate({ text: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={editingBackup ? handleCreateBackup : handleCreateTemplate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
          Edit Template
          <IconButton
            aria-label="close"
            onClick={() => setShowEditModal(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Template Text"
            multiline
            rows={5}
            value={currentTemplate.text}
            onChange={e => setCurrentTemplate({ ...currentTemplate, text: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpdateTemplate}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
          Confirm Delete
          <IconButton
            aria-label="close"
            onClick={() => setShowDeleteConfirm(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this template? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={() => handleDeleteTemplate(currentTemplate.id)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
          Confirm Bulk Delete
          <IconButton
            aria-label="close"
            onClick={() => setShowBulkDeleteConfirm(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the selected templates? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setShowBulkDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleBulkDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
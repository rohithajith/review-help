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
  IconButton,
  Snackbar,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import api from '../api';

// =============================================================================
// BusinessAdmin - A simplified admin panel for business owners
// Only shows templates for their specific business, no access to other data
// =============================================================================
const BusinessAdmin = ({ businessId }) => {
  const [business, setBusiness] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [backupTemplates, setBackupTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({ text: '' });
  const [editingBackup, setEditingBackup] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const [loading, setLoading] = useState(true);

  // Fetch business details
  const fetchBusiness = useCallback(async () => {
    try {
      const res = await api.get(`/${businessId}/business`);
      setBusiness(res.data || null);
    } catch (err) {
      console.error('Error fetching business:', err);
    }
  }, [businessId]);

  // Fetch active templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get(`/${businessId}/templates`);
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [businessId]);

  // Fetch backup templates
  const fetchBackups = useCallback(async () => {
    try {
      const res = await api.get(`/${businessId}/templates/backups`);
      setBackupTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching backup templates:', err);
    }
  }, [businessId]);

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBusiness(), fetchTemplates(), fetchBackups()]);
      setLoading(false);
    };
    if (businessId) loadData();
  }, [businessId, fetchBusiness, fetchTemplates, fetchBackups]);

  // Create template handler
  const handleCreateTemplate = async () => {
    try {
      if (editingBackup) {
        await api.post(`/${businessId}/templates/backups`, { text: currentTemplate.text });
        await fetchBackups();
        setAlertMessage('Backup template created successfully');
      } else {
        await api.post(`/${businessId}/templates`, { text: currentTemplate.text });
        await fetchTemplates();
        setAlertMessage('Template created successfully');
      }
      setAlertVariant('success');
      setShowCreateModal(false);
      setCurrentTemplate({ text: '' });
    } catch (error) {
      console.error('Error creating template:', error);
      setAlertMessage('Error creating template');
      setAlertVariant('error');
    }
  };

  // Update template handler
  const handleUpdateTemplate = async () => {
    try {
      if (editingBackup) {
        await api.put(`/${businessId}/templates/backups/${currentTemplate.id}`, { text: currentTemplate.text });
        await fetchBackups();
      } else {
        await api.put(`/${businessId}/templates/${currentTemplate.id}`, { text: currentTemplate.text });
        await fetchTemplates();
      }
      setShowEditModal(false);
      setAlertMessage('Template updated successfully');
      setAlertVariant('success');
    } catch (error) {
      console.error('Error updating template:', error);
      setAlertMessage('Error updating template');
      setAlertVariant('error');
    }
  };

  // Delete template handler
  const handleDeleteTemplate = async (id) => {
    try {
      if (editingBackup) {
        await api.delete(`/${businessId}/templates/backups/${id}`);
        await fetchBackups();
      } else {
        await api.delete(`/${businessId}/templates/${id}`);
        await fetchTemplates();
      }
      setShowDeleteConfirm(false);
      setAlertMessage('Template deleted successfully');
      setAlertVariant('success');
    } catch (error) {
      console.error('Error deleting template:', error);
      setAlertMessage('Error deleting template');
      setAlertVariant('error');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!business) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Business not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Alert Snackbar */}
      <Snackbar
        open={!!alertMessage}
        autoHideDuration={4000}
        onClose={() => setAlertMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlertMessage('')}
          severity={alertVariant}
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => window.location.hash = `#/business/${businessId}`}
        >
          Back to Templates
        </Button>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, flex: 1 }}>
          {business.name} - Admin
        </Typography>
        <Chip label="Business Admin" color="primary" />
      </Box>

      <Grid container spacing={3}>
        {/* Active Templates */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Active Templates
                  <Chip label={templates.length} size="small" color="success" />
                </Box>
              }
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
                  Add Template
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: '50vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Template Text</TableCell>
                      <TableCell sx={{ width: 140 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          <Typography color="text.secondary">No active templates</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map(template => (
                        <TableRow key={template.id} hover>
                          <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {template.text}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => { setCurrentTemplate(template); setEditingBackup(false); setShowEditModal(true); }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => { setCurrentTemplate(template); setEditingBackup(false); setShowDeleteConfirm(true); }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Backup Templates */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Backup Templates
                  <Chip label={backupTemplates.length} size="small" color="warning" />
                </Box>
              }
              sx={{
                background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
              }}
            />
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<AddIcon />}
                  onClick={() => { setEditingBackup(true); setCurrentTemplate({ text: '' }); setShowCreateModal(true); }}
                >
                  Add Backup
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Backup templates are used to replace active templates when customers use them for reviews.
              </Typography>

              <TableContainer component={Paper} sx={{ maxHeight: '50vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Template Text</TableCell>
                      <TableCell sx={{ width: 140 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backupTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          <Typography color="text.secondary">No backup templates</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      backupTemplates.map(template => (
                        <TableRow key={template.id} hover>
                          <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {template.text}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => { setCurrentTemplate(template); setEditingBackup(true); setShowEditModal(true); }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => { setCurrentTemplate(template); setEditingBackup(true); setShowDeleteConfirm(true); }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Template Dialog */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
          Create {editingBackup ? 'Backup' : 'Active'} Template
          <IconButton
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
            rows={6}
            value={currentTemplate.text}
            onChange={e => setCurrentTemplate({ text: e.target.value })}
            placeholder="Write your review template here... (80-100 words recommended)"
            helperText={`${currentTemplate.text.split(/\s+/).filter(w => w).length} words`}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateTemplate} disabled={!currentTemplate.text.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
          Edit Template
          <IconButton
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
            rows={6}
            value={currentTemplate.text}
            onChange={e => setCurrentTemplate({ ...currentTemplate, text: e.target.value })}
            helperText={`${currentTemplate.text?.split(/\s+/).filter(w => w).length || 0} words`}
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
    </Container>
  );
};

export default BusinessAdmin;

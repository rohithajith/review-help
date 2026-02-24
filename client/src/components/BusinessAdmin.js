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
  CircularProgress,
  Rating,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import api from '../api';
import BusinessLoginModal from './BusinessLoginModal';

// =============================================================================
// BusinessAdmin - A simplified admin panel for business owners
// Only shows templates for their specific business, no access to other data
// Requires authentication via login modal
// =============================================================================
const BusinessAdmin = ({ businessId }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupError, setSetupError] = useState('');

  // Business and template state
  const [business, setBusiness] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [backupTemplates, setBackupTemplates] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({ text: '' });
  const [editingBackup, setEditingBackup] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const [loading, setLoading] = useState(true);

  // Check if already authenticated (has valid session token)
  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      
      // Check for existing session token
      const token = sessionStorage.getItem(`business_admin_token_${businessId}`);
      if (token) {
        // Token exists, consider authenticated (simple validation)
        setIsAuthenticated(true);
        setCheckingAuth(false);
        return;
      }

      // Check if business has credentials configured
      try {
        const response = await api.get(`/businesses/${businessId}/admin/has-credentials`);
        
        if (response.data.hasCredentials) {
          // Has credentials, show login modal
          setShowLoginModal(true);
        } else {
          // No credentials, show setup modal
          setShowSetupModal(true);
        }
      } catch (err) {
        console.error('Error checking credentials:', err);
        // Default to showing login
        setShowLoginModal(true);
      }
      
      setCheckingAuth(false);
    };

    if (businessId) checkAuth();
  }, [businessId]);

  // Handle successful login
  const handleLoginSuccess = (token) => {
    setIsAuthenticated(true);
    setShowLoginModal(false);
  };

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem(`business_admin_token_${businessId}`);
    setIsAuthenticated(false);
    window.location.hash = `#/business/${businessId}`;
  };

  // Handle credential setup
  const handleSetupCredentials = async () => {
    setSetupError('');
    
    if (!setupUsername.trim() || !setupPassword) {
      setSetupError('Please enter both username and password');
      return;
    }
    
    if (setupPassword.length < 4) {
      setSetupError('Password must be at least 4 characters');
      return;
    }

    try {
      await api.post(`/businesses/${businessId}/admin/credentials`, {
        username: setupUsername.trim(),
        password: setupPassword,
      });

      // Auto-login after setup
      const loginResponse = await api.post(`/businesses/${businessId}/admin/login`, {
        username: setupUsername.trim(),
        password: setupPassword,
      });

      if (loginResponse.data.success) {
        sessionStorage.setItem(`business_admin_token_${businessId}`, loginResponse.data.token);
        setIsAuthenticated(true);
        setShowSetupModal(false);
        setAlertMessage('Admin credentials created successfully!');
        setAlertVariant('success');
      }
    } catch (err) {
      console.error('Error setting up credentials:', err);
      setSetupError(err.response?.data?.error || 'Failed to set up credentials');
    }
  };

  // Handle cancel (go back to business page)
  const handleCancel = () => {
    window.location.hash = `#/business/${businessId}`;
  };

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

  // Fetch submitted reviews (My Reviews)
  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get(`/${businessId}/reviews`);
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  }, [businessId]);

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) return;
      setLoading(true);
      await Promise.all([fetchBusiness(), fetchTemplates(), fetchBackups(), fetchReviews()]);
      setLoading(false);
    };
    if (businessId && isAuthenticated) loadData();
  }, [businessId, isAuthenticated, fetchBusiness, fetchTemplates, fetchBackups, fetchReviews]);

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
      await fetchReviews();
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
      await fetchReviews();
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
      await fetchReviews();
    } catch (error) {
      console.error('Error deleting template:', error);
      setAlertMessage('Error deleting template');
      setAlertVariant('error');
    }
  };

  // Show loading spinner while checking auth
  if (checkingAuth) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Checking authentication...</Typography>
      </Container>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <BusinessLoginModal
          open={showLoginModal}
          businessId={businessId}
          businessName={business?.name}
          onClose={handleCancel}
          onLoginSuccess={handleLoginSuccess}
        />

        {/* Setup credentials modal for first-time access */}
        <Dialog 
          open={showSetupModal} 
          onClose={handleCancel}
          maxWidth="xs" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            <IconButton
              onClick={handleCancel}
              sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h5" fontWeight={600}>
              Set Up Admin Access
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Create admin credentials for this business
            </Typography>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 2 }}>
            {setupError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {setupError}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="Username"
              value={setupUsername}
              onChange={(e) => setSetupUsername(e.target.value)}
              sx={{ mb: 2 }}
              autoFocus
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              helperText="At least 4 characters"
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 1, flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleSetupCredentials}
              disabled={!setupUsername.trim() || setupPassword.length < 4}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Create Admin Account
            </Button>
            <Button variant="text" onClick={handleCancel}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading...</Typography>
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
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          size="small"
        >
          Logout
        </Button>
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

      <Box sx={{ mt: 3 }}>
        <Card sx={{ borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                My Reviews
                <Chip label={reviews.length} size="small" color="primary" />
              </Box>
            }
            sx={{
              background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
              '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
            }}
          />
          <CardContent>
            <TableContainer component={Paper} sx={{ maxHeight: '50vh' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 160 }}>Date</TableCell>
                    <TableCell sx={{ width: 130 }}>Rating</TableCell>
                    <TableCell>Review</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="text.secondary">No submitted reviews yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviews.map((review) => (
                      <TableRow key={review.id} hover>
                        <TableCell>
                          {new Date(review.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Rating value={Number(review.rating) || 0} precision={1} readOnly size="small" />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                          {review.review_text}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

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

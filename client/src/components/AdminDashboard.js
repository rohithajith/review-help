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
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import api from '../api';
import supabase from '../lib/supabaseClient';
import LogsViewer from './LogsViewer';
import TemplateSharePanel from './TemplateSharePanel';
import { hasSeenShareQr, markShareQrSeen } from '../utils/templateShare';

// Default review platforms
const DEFAULT_REVIEW_PLATFORMS = [
  { name: 'Google', url: '' },
  { name: 'Booking.com', url: '' },
];

async function waitForSession(maxAttempts = 6, delayMs = 200) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || null;
      if (token) return token;
    } catch (e) {
      // ignore transient auth read failures
    }
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

function normalizeUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

const AdminDashboard = () => {
  const [authReady, setAuthReady] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [backupTemplates, setBackupTemplates] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({ text: '' });
  const [editingBackup, setEditingBackup] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [reviewPlatforms, setReviewPlatforms] = useState(DEFAULT_REVIEW_PLATFORMS);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const handleBillingRequired = useCallback((err, fallbackBusinessId = null) => {
    if (err?.response?.status !== 402) return false;
    const pendingBusinessId = err?.response?.data?.businessId || fallbackBusinessId || selectedBusinessId;
    if (pendingBusinessId) {
      window.location.hash = `#/payment-pending?businessId=${pendingBusinessId}`;
    } else {
      window.location.hash = '#/payment-pending';
    }
    return true;
  }, [selectedBusinessId]);

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

  const fetchReviews = useCallback(async (bizId = selectedBusinessId) => {
    if (!bizId) {
      setReviews([]);
      return;
    }
    setReviewsLoading(true);
    try {
      const res = await api.get(`/${bizId}/reviews`);
      setReviews(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [selectedBusinessId]);

  const loadSettings = useCallback(() => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    setGoogleReviewUrl(settings.googleReviewUrl || '');
    setLogoUrl(settings.logoUrl || '');
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
          setLogoUrl(biz.logo_url || '');
          setWelcomeMessage(biz.welcome_message || '');
        } catch (err) {
          if (handleBillingRequired(err, firstId)) return;
          console.error('Error loading auto-selected business details', err);
        }
      }
    } catch (err) {
      if (handleBillingRequired(err)) return;
      console.error('Error loading businesses', err);
    }
  }, [fetchTemplates, handleBillingRequired]);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await waitForSession();
        if (!token) {
          window.location.hash = '#/login';
          setAuthReady(true);
          return;
        }
        if (api && api.defaults) {
          api.defaults.headers.common = api.defaults.headers.common || {};
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
        }
        await loadBusinesses();
        loadSettings();
      } catch (err) {
        console.error('Admin auth initialization failed', err);
        if (handleBillingRequired(err)) return;
        window.location.hash = '#/login';
      } finally {
        setAuthReady(true);
      }
    };
    init();
  }, [loadBusinesses, loadSettings, handleBillingRequired]);

  // Whenever selected business changes, load templates and branding
  useEffect(() => {
    const loadTenantData = async (bizId) => {
      try {
          const res = await api.get(`/${bizId}/business`);
        const biz = res.data || {};
        setBusinessName(biz.name || '');
        setGoogleReviewUrl(biz.google_review_url || '');
        setLogoUrl(biz.logo_url || '');
        setWelcomeMessage(biz.welcome_message || '');
        setReviewPlatforms(biz.review_platforms || DEFAULT_REVIEW_PLATFORMS);
        fetchTemplates(bizId);
        fetchReviews(bizId);
      } catch (err) {
        if (handleBillingRequired(err, bizId)) return;
        console.error('Error loading business details', err);
      }
    };

    if (authReady && selectedBusinessId) {
      loadTenantData(selectedBusinessId);
    }
  }, [authReady, selectedBusinessId, fetchTemplates, fetchReviews]);

  // whenever selected business changes also load backups
  useEffect(() => {
    if (authReady && selectedBusinessId) fetchBackups(selectedBusinessId);
  }, [authReady, selectedBusinessId, fetchBackups]);

  useEffect(() => {
    const businessId = Number(selectedBusinessId);
    if (!authReady || !Number.isInteger(businessId) || businessId <= 0) return;
    if (!hasSeenShareQr(businessId)) {
      setShowShareDialog(true);
    }
  }, [authReady, selectedBusinessId]);

  const saveSettings = async () => {
    try {
      const normalizedPlatforms = (Array.isArray(reviewPlatforms) ? reviewPlatforms : [])
        .map((p) => ({
          name: String(p?.name || '').trim(),
          url: normalizeUrl(p?.url),
        }))
        .filter((p) => p.name || p.url);

      // Save to backend
      if (selectedBusinessId) {
        await api.put(`/${selectedBusinessId}/business`, {
          name: String(businessName || '').trim(),
          google_review_url: normalizeUrl(googleReviewUrl),
          logo_url: logoUrl || null,
          welcome_message: String(welcomeMessage || '').trim(),
          review_platforms: normalizedPlatforms.length > 0 ? normalizedPlatforms : DEFAULT_REVIEW_PLATFORMS,
        });
      }
      // Also save to localStorage for quick access
      const settings = {
        googleReviewUrl: normalizeUrl(googleReviewUrl),
        logoUrl,
        businessName: String(businessName || '').trim(),
        welcomeMessage: String(welcomeMessage || '').trim(),
        reviewPlatforms: normalizedPlatforms.length > 0 ? normalizedPlatforms : DEFAULT_REVIEW_PLATFORMS,
        businessId: selectedBusinessId
      };
      localStorage.setItem('settings', JSON.stringify(settings));
      setReviewPlatforms(settings.reviewPlatforms);
      setAlertMessage('Settings saved successfully');
      setAlertVariant('success');
    } catch (err) {
      console.error('Error saving settings:', err);
      setAlertMessage('Error saving settings');
      setAlertVariant('danger');
    }
  };

  // Review Platform handlers
  const handlePlatformChange = (index, field, value) => {
    const updated = [...reviewPlatforms];
    updated[index] = { ...updated[index], [field]: value };
    setReviewPlatforms(updated);
  };

  const handleAddPlatform = () => {
    setReviewPlatforms([...reviewPlatforms, { name: '', url: '' }]);
  };

  const handleRemovePlatform = (index) => {
    if (reviewPlatforms.length > 1) {
      setReviewPlatforms(reviewPlatforms.filter((_, i) => i !== index));
    }
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

  const handleLogoFileUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setAlertMessage('Please upload an image file');
      setAlertVariant('danger');
      return;
    }
    // Protect save payload: backend JSON body limit is 100KB by default.
    if (file.size > 70 * 1024) {
      setAlertMessage('Logo is too large. Please use an image under 70KB.');
      setAlertVariant('danger');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setLogoUrl(dataUrl);
    };
    reader.onerror = () => {
      setAlertMessage('Could not read logo file');
      setAlertVariant('danger');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectBusiness = async (bizId) => {
    if (!bizId) {
      setSelectedBusinessId(null);
      setBusinessName('');
      setGoogleReviewUrl('');
      setLogoUrl('');
      setWelcomeMessage('');
      setReviewPlatforms(DEFAULT_REVIEW_PLATFORMS);
      return;
    }
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
      setLogoUrl(biz.logo_url || '');
      setWelcomeMessage(biz.welcome_message || '');
      setReviewPlatforms(Array.isArray(biz.review_platforms) ? biz.review_platforms : DEFAULT_REVIEW_PLATFORMS);
    } catch (err) {
      console.error('Error loading business details', err);
    }
    fetchTemplates(bizId);
    fetchBackups(bizId);
    fetchReviews(bizId);
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
            </CardContent>
          </Card>

          {selectedBusinessId && (
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
              <CardHeader
                title="Share with Customers"
                sx={{
                  background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                  '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
                }}
              />
              <CardContent>
                <TemplateSharePanel businessId={selectedBusinessId} />
              </CardContent>
            </Card>
          )}

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
                label="Business Name"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Company Logo
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Button component="label" variant="outlined" size="small">
                  Upload Logo
                  <input type="file" accept="image/*" hidden onChange={handleLogoFileUpload} />
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => setLogoUrl('')}
                  disabled={!logoUrl}
                >
                  Remove Logo
                </Button>
              </Box>
              {logoUrl && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    component="img"
                    src={logoUrl}
                    alt="Company logo preview"
                    sx={{ maxHeight: 64, width: 'auto', borderRadius: 1, border: '1px solid rgba(148,163,184,0.35)', p: 0.5, bgcolor: '#fff' }}
                  />
                </Box>
              )}

              <TextField
                fullWidth
                label="Welcome Message"
                multiline
                rows={3}
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 3 }} />

              {/* Review Platforms Section */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Review Platforms
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure the review platforms shown to customers. Add your own or edit the defaults.
              </Typography>

              {reviewPlatforms.map((platform, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                  <TextField
                    size="small"
                    label="Platform Name"
                    value={platform.name}
                    onChange={e => handlePlatformChange(index, 'name', e.target.value)}
                    sx={{ width: '30%' }}
                    placeholder="e.g., Google, TripAdvisor"
                  />
                  <TextField
                    size="small"
                    label="Review URL"
                    value={platform.url}
                    onChange={e => handlePlatformChange(index, 'url', e.target.value)}
                    sx={{ flexGrow: 1 }}
                    placeholder="https://..."
                  />
                  <IconButton
                    size="small"
                    onClick={() => window.open(normalizeUrl(platform.url), '_blank')}
                    disabled={!platform.url}
                    title="Test Link"
                  >
                    <OpenInNewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemovePlatform(index)}
                    disabled={reviewPlatforms.length <= 1}
                    title="Remove Platform"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddPlatform}
                sx={{ mb: 3 }}
              >
                Add Platform
              </Button>

              <Divider sx={{ my: 3 }} />

              {/* Legacy Google Review URL for backward compatibility */}
              <TextField
                fullWidth
                label="Default Google Review URL (Legacy)"
                type="url"
                value={googleReviewUrl}
                onChange={e => setGoogleReviewUrl(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Used as fallback if no platforms are configured"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(normalizeUrl(googleReviewUrl), '_blank')}
                disabled={!googleReviewUrl}
                sx={{ mb: 3 }}
              >
                Test Link
              </Button>

              <Divider sx={{ my: 3 }} />

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
                  onClick={() => { 
                    setBusinessName(''); 
                    setWelcomeMessage(''); 
                    setGoogleReviewUrl(''); 
                    setLogoUrl('');
                    setReviewPlatforms(DEFAULT_REVIEW_PLATFORMS);
                  }}
                >
                  Reset
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Logs Card */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 6px 18px rgba(41, 54, 67, 0.08)' }}>
            <CardHeader
              title="My Reviews"
              action={(
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => fetchReviews(selectedBusinessId)}
                  disabled={!selectedBusinessId || reviewsLoading}
                >
                  Refresh
                </Button>
              )}
              sx={{
                background: 'linear-gradient(90deg, rgba(248,249,250,0.9), rgba(255,255,255,0.9))',
                '& .MuiCardHeader-title': { fontWeight: 600, color: '#172554' },
              }}
            />
            <CardContent>
              {!selectedBusinessId && (
                <Typography variant="body2" color="text.secondary">
                  Select a business to view submitted reviews.
                </Typography>
              )}

              {selectedBusinessId && reviewsLoading && (
                <Typography variant="body2" color="text.secondary">
                  Loading reviews...
                </Typography>
              )}

              {selectedBusinessId && !reviewsLoading && reviews.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No reviews submitted yet.
                </Typography>
              )}

              {selectedBusinessId && !reviewsLoading && reviews.length > 0 && (
                <TableContainer component={Paper} sx={{ maxHeight: '40vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 120 }}>Date</TableCell>
                        <TableCell sx={{ width: 80 }}>Rating</TableCell>
                        <TableCell>Review</TableCell>
                        <TableCell sx={{ width: 120 }}>Source</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reviews.map((review) => (
                        <TableRow key={review.id} hover>
                          <TableCell>
                            {review.created_at ? new Date(review.created_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>{review.rating || '-'}</TableCell>
                          <TableCell>{review.review_text || '-'}</TableCell>
                          <TableCell>{review.template_id ? 'Template' : 'Own review'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
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

      <Dialog
        open={showShareDialog}
        onClose={() => {
          markShareQrSeen(selectedBusinessId);
          setShowShareDialog(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Your Review Page</DialogTitle>
        <DialogContent dividers>
          <TemplateSharePanel businessId={selectedBusinessId} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              markShareQrSeen(selectedBusinessId);
              setShowShareDialog(false);
            }}
          >
            Done
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

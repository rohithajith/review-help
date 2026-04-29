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
  Slider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api';
import supabase from '../lib/supabaseClient';
import TemplateSharePanel from './TemplateSharePanel';
import { hasSeenShareQr, markShareQrSeen } from '../utils/templateShare';
import { readBusinessLocalLogo, writeBusinessLocalLogo } from '../utils/businessLiveSync';

const DEFAULT_REVIEW_PLATFORMS = [
  { name: 'Google', url: '' },
  { name: 'Booking.com', url: '' },
];

const DEFAULT_COMPOSE_QUESTIONS = [
  {
    key: 'visit_purpose',
    label: 'What brought you in for this visit?',
    placeholder: 'For example: first time, regular appointment, or quick service.',
  },
  {
    key: 'service_quality',
    label: 'What stood out about the quality of the service?',
    placeholder: 'Mention the specific detail that mattered most.',
  },
  {
    key: 'staff_experience',
    label: 'How was the team or staff experience?',
    placeholder: 'Friendly, professional, attentive, quick, etc.',
  },
  {
    key: 'specific_highlight',
    label: 'What specific result or moment are you happiest with?',
    placeholder: 'Share one concrete highlight from your experience.',
  },
  {
    key: 'overall_recommendation',
    label: 'How would you summarize your overall experience?',
    placeholder: 'Value for money, consistency, and whether you would return.',
  },
];

function normalizeComposeQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length !== DEFAULT_COMPOSE_QUESTIONS.length) {
    return DEFAULT_COMPOSE_QUESTIONS.map((question) => ({ ...question }));
  }

  const normalized = rawQuestions.map((question, index) => ({
    key: DEFAULT_COMPOSE_QUESTIONS[index].key,
    label: String(question?.label || '').trim(),
    placeholder: String(question?.placeholder || '').trim(),
  }));
  if (normalized.some((question) => !question.label)) {
    return DEFAULT_COMPOSE_QUESTIONS.map((question) => ({ ...question }));
  }
  return normalized;
}

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
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

// =============================================================================
// BusinessAdmin - A simplified admin panel for business owners
// Only shows templates for their specific business, no access to other data
// Requires authentication via login modal
// =============================================================================
const BusinessAdmin = ({ businessId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [requiresLogin, setRequiresLogin] = useState(false);

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
  const [logoUrl, setLogoUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [reviewPlatforms, setReviewPlatforms] = useState(DEFAULT_REVIEW_PLATFORMS);
  const [composeQuestions, setComposeQuestions] = useState(DEFAULT_COMPOSE_QUESTIONS);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState('success');
  const [loading, setLoading] = useState(true);
  const [templatesGenerating, setTemplatesGenerating] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showLogoCropDialog, setShowLogoCropDialog] = useState(false);
  const [rawLogoSource, setRawLogoSource] = useState('');
  const [logoZoom, setLogoZoom] = useState(1.2);
  const [logoOffsetX, setLogoOffsetX] = useState(0);
  const [logoOffsetY, setLogoOffsetY] = useState(0);

  // Check if already authenticated (has valid session token)
  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      try {
        const accessToken = await waitForSession();
        if (!accessToken) {
          setRequiresLogin(true);
          setIsAuthenticated(false);
          return;
        }

        if (api && api.defaults) {
          api.defaults.headers.common = api.defaults.headers.common || {};
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }

        await api.get(`/${businessId}/admin/access`);
        setIsAuthenticated(true);
        setRequiresLogin(false);
        setAccessError('');
      } catch (err) {
        console.error('Error checking owner access:', err);
        if (err?.response?.status === 402) {
          const pendingBusinessId = err?.response?.data?.businessId || businessId;
          window.location.hash = `#/payment-pending?businessId=${pendingBusinessId}`;
          return;
        } else if (err?.response?.status === 401) {
          setRequiresLogin(true);
          setIsAuthenticated(false);
          setAccessError('');
        } else if (err?.response?.status === 403) {
          setRequiresLogin(false);
          setIsAuthenticated(false);
          setAccessError('This account is not an owner/admin for this business.');
        } else {
          setRequiresLogin(false);
          setIsAuthenticated(false);
          setAccessError('Unable to verify access right now. Please try again.');
        }
      }

      setCheckingAuth(false);
    };

    if (businessId) checkAuth();
  }, [businessId]);

  // Handle logout
  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    try {
      if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
        delete api.defaults.headers.common['Authorization'];
      }
    } catch (e) {}
    setIsAuthenticated(false);
    window.location.hash = '#/login';
  };

  // Fetch business details
  const fetchBusiness = useCallback(async () => {
    try {
      const res = await api.get(`/${businessId}/business`);
      const data = res.data || null;
      const localLogo = readBusinessLocalLogo(businessId);
      setBusiness(data);
      setBusinessName(data?.name || '');
      setLogoUrl(localLogo || data?.logo_url || '');
      setReviewPlatforms(Array.isArray(data?.review_platforms) ? data.review_platforms : DEFAULT_REVIEW_PLATFORMS);
      setComposeQuestions(normalizeComposeQuestions(data?.compose_questions));
    } catch (err) {
      console.error('Error fetching business:', err);
    }
  }, [businessId]);

  const dispatchBusinessAdminUpdate = useCallback((type) => {
    const normalizedBusinessId = Number(businessId);
    if (!Number.isFinite(normalizedBusinessId)) return;
    window.dispatchEvent(new CustomEvent('business-admin-updated', {
      detail: {
        businessId: normalizedBusinessId,
        type,
      },
    }));
    try {
      const payload = JSON.stringify({ businessId: normalizedBusinessId, type, ts: Date.now() });
      localStorage.setItem('business-admin-updated', payload);
      localStorage.setItem(`business-admin-updated:${normalizedBusinessId}`, String(Date.now()));
    } catch (e) {
      // Ignore storage failures (private mode/quota).
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

  useEffect(() => {
    const normalizedBusinessId = Number(businessId);
    if (!isAuthenticated || !Number.isInteger(normalizedBusinessId) || normalizedBusinessId <= 0) return;
    if (!hasSeenShareQr(normalizedBusinessId)) {
      setShowShareDialog(true);
    }
  }, [businessId, isAuthenticated]);

  // If user just signed up and onboarding template generation is running,
  // keep polling until templates are available so the admin page gives
  // immediate visual feedback instead of showing an empty table.
  useEffect(() => {
    if (!businessId || !isAuthenticated) return undefined;
    let active = true;
    let timer = null;
    let attempts = 0;

    const storageKey = `templatesGenerating:${businessId}`;
    const shouldTrackGeneration = (() => {
      try { return sessionStorage.getItem(storageKey) === '1'; } catch { return false; }
    })();
    if (!shouldTrackGeneration) return undefined;

    const poll = async () => {
      attempts += 1;
      if (!active) return;
      setTemplatesGenerating(true);
      try {
        const [activeRes, backupRes] = await Promise.all([
          api.get(`/${businessId}/templates`),
          api.get(`/${businessId}/templates/backups`),
        ]);
        const activeTemplates = Array.isArray(activeRes?.data) ? activeRes.data : [];
        const backupTemplates = Array.isArray(backupRes?.data) ? backupRes.data : [];
        if (!active) return;
        setTemplates(activeTemplates);
        setBackupTemplates(backupTemplates);

        if (activeTemplates.length > 0 || attempts >= 20) {
          setTemplatesGenerating(false);
          try { sessionStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
          return;
        }
      } catch (err) {
        if (!active) return;
        // Keep polling on transient failures until max attempts.
        if (attempts >= 20) {
          setTemplatesGenerating(false);
          try { sessionStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
          return;
        }
      }

      timer = setTimeout(poll, 2000);
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [businessId, isAuthenticated]);

  // Create template handler
  const handleCreateTemplate = async () => {
    const isBackup = editingBackup;
    const templateText = String(currentTemplate?.text || '');
    const optimisticId = `tmp-${Date.now()}`;
    const optimisticTemplate = { id: optimisticId, text: templateText };
    const setTemplateState = isBackup ? setBackupTemplates : setTemplates;

    try {
      setTemplateState((prev) => [optimisticTemplate, ...(Array.isArray(prev) ? prev : [])]);

      if (isBackup) {
        const response = await api.post(`/${businessId}/templates/backups`, { text: templateText });
        const createdTemplate = response?.data;
        if (createdTemplate && typeof createdTemplate === 'object') {
          setBackupTemplates((prev) => prev.map((template) => (
            template.id === optimisticId ? createdTemplate : template
          )));
        }
        await fetchBackups();
        setAlertMessage('Backup template created successfully');
      } else {
        const response = await api.post(`/${businessId}/templates`, { text: templateText });
        const createdTemplate = response?.data;
        if (createdTemplate && typeof createdTemplate === 'object') {
          setTemplates((prev) => prev.map((template) => (
            template.id === optimisticId ? createdTemplate : template
          )));
        }
        await fetchTemplates();
        setAlertMessage('Template created successfully');
      }
      setAlertVariant('success');
      setShowCreateModal(false);
      setCurrentTemplate({ text: '' });
      dispatchBusinessAdminUpdate('templates');
      await fetchReviews();
    } catch (error) {
      console.error('Error creating template:', error);
      setTemplateState((prev) => prev.filter((template) => template.id !== optimisticId));
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
      dispatchBusinessAdminUpdate('templates');
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
      dispatchBusinessAdminUpdate('templates');
      await fetchReviews();
    } catch (error) {
      console.error('Error deleting template:', error);
      setAlertMessage('Error deleting template');
      setAlertVariant('error');
    }
  };

  const handleRevokeReviewConsent = async (reviewId) => {
    try {
      await api.post(`/${businessId}/reviews/${reviewId}/consent/revoke`);
      setAlertMessage('Consent revoked successfully');
      setAlertVariant('success');
      await fetchReviews();
    } catch (error) {
      console.error('Error revoking review consent:', error);
      setAlertMessage(error?.response?.data?.message || 'Error revoking consent');
      setAlertVariant('error');
    }
  };

  const handleLogoFileUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setAlertMessage('Please upload an image file');
      setAlertVariant('error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawLogoSource(String(reader.result || ''));
      setLogoZoom(1.2);
      setLogoOffsetX(0);
      setLogoOffsetY(0);
      setShowLogoCropDialog(true);
    };
    reader.onerror = () => {
      setAlertMessage('Could not read logo file');
      setAlertVariant('error');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoCrop = () => {
    if (!rawLogoSource) return;
    const image = new Image();
    image.onload = () => {
      const canvasSize = 640;
      const previewSize = 220;
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setAlertMessage('Could not process logo crop');
        setAlertVariant('error');
        return;
      }

      const baseScale = Math.max(canvasSize / image.width, canvasSize / image.height);
      const scale = baseScale * logoZoom;
      const scaledW = image.width * scale;
      const scaledH = image.height * scale;
      const ratio = canvasSize / previewSize;
      const dx = (canvasSize - scaledW) / 2 + (logoOffsetX * ratio);
      const dy = (canvasSize - scaledH) / 2 + (logoOffsetY * ratio);

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.drawImage(image, dx, dy, scaledW, scaledH);
      setLogoUrl(canvas.toDataURL('image/png'));
      setShowLogoCropDialog(false);
    };
    image.onerror = () => {
      setAlertMessage('Could not process logo image');
      setAlertVariant('error');
    };
    image.src = rawLogoSource;
  };

  const handleSaveBusinessSettings = async () => {
    const normalizedBusinessName = String(businessName || '').trim() || business?.name || '';
    try {
      const normalizedPlatforms = (Array.isArray(reviewPlatforms) ? reviewPlatforms : [])
        .map((p) => ({
          name: String(p?.name || '').trim(),
          url: normalizeUrl(p?.url),
        }))
        .filter((p) => p.name || p.url);

      let persistedLogoUrl = logoUrl || '';
      if (persistedLogoUrl && persistedLogoUrl.startsWith('data:image/')) {
        const uploadResponse = await api.post(`/businesses/${businessId}/logo`, {
          logoDataUrl: persistedLogoUrl,
        });
        persistedLogoUrl = String(uploadResponse?.data?.logoUrl || '').trim();
        if (!persistedLogoUrl) {
          throw new Error('Logo upload succeeded but no public URL was returned.');
        }
      }

      await api.put(`/${businessId}/business`, {
        name: normalizedBusinessName,
        logo_url: persistedLogoUrl || null,
        review_platforms: normalizedPlatforms.length > 0 ? normalizedPlatforms : DEFAULT_REVIEW_PLATFORMS,
      });

      writeBusinessLocalLogo(businessId, persistedLogoUrl || '');
      setBusiness((prev) => ({
        ...(prev || {}),
        name: normalizedBusinessName || prev?.name || '',
        logo_url: persistedLogoUrl || '',
        review_platforms: normalizedPlatforms.length > 0 ? normalizedPlatforms : DEFAULT_REVIEW_PLATFORMS,
      }));
      setBusinessName(normalizedBusinessName);
      setLogoUrl(persistedLogoUrl || '');
      setReviewPlatforms(normalizedPlatforms.length > 0 ? normalizedPlatforms : DEFAULT_REVIEW_PLATFORMS);
      setAlertMessage('Branding and links saved successfully.');
      setAlertVariant('success');
      dispatchBusinessAdminUpdate('business');
    } catch (err) {
      console.error('Error saving business settings:', err);
      setAlertMessage(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to save branding and links.');
      setAlertVariant('error');
      dispatchBusinessAdminUpdate('business');
    }
  };

  const handlePlatformChange = (index, field, value) => {
    setReviewPlatforms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddPlatform = () => {
    setReviewPlatforms((prev) => [...prev, { name: '', url: '' }]);
  };

  const handleRemovePlatform = (index) => {
    if (reviewPlatforms.length <= 1) return;
    setReviewPlatforms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComposeQuestionChange = (index, field, value) => {
    setComposeQuestions((prev) => {
      const next = Array.isArray(prev)
        ? prev.map((question) => ({ ...question }))
        : normalizeComposeQuestions(null);
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveComposeQuestions = async () => {
    try {
      const normalizedComposeQuestions = normalizeComposeQuestions(composeQuestions).map((question) => ({
        key: question.key,
        label: String(question.label || '').trim(),
        placeholder: String(question.placeholder || '').trim(),
      }));
      if (normalizedComposeQuestions.some((question) => !question.label)) {
        setAlertMessage('Each compose question must have text.');
        setAlertVariant('error');
        return;
      }

      const response = await api.put(`/${businessId}/business`, {
        compose_questions: normalizedComposeQuestions,
      });
      const saved = normalizeComposeQuestions(response?.data?.compose_questions || normalizedComposeQuestions);
      setComposeQuestions(saved);
      setBusiness((prev) => ({ ...(prev || {}), compose_questions: saved }));
      setAlertMessage('Compose questions saved successfully.');
      setAlertVariant('success');
      dispatchBusinessAdminUpdate('compose_questions');
    } catch (error) {
      console.error('Error saving compose questions:', error);
      setAlertMessage(error?.response?.data?.error || 'Error saving compose questions');
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

  // Not authenticated/authorized for this business
  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ py: 5 }}>
        {requiresLogin ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please sign in with your business owner account to access this admin page.
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 2 }}>
            {accessError || 'You do not have access to this business admin page.'}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => { window.location.hash = '#/login'; }}>
            Go to Login
          </Button>
          <Button variant="outlined" onClick={() => { window.location.hash = `#/business/${businessId}`; }}>
            Back to Business Page
          </Button>
        </Box>
      </Container>
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

  if (templatesGenerating) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, fontWeight: 600 }}>Generating your starter templates...</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
          This takes a few seconds. Your templates will appear automatically.
        </Typography>
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

  const cardSx = {
    borderRadius: 2,
    border: '1px solid rgba(215, 222, 234, 0.72)',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
    backgroundColor: '#ffffff',
  };

  const cardHeaderSx = {
    backgroundColor: '#f6f8fb',
    borderBottom: '1px solid #e5eaf2',
    '& .MuiCardHeader-title': {
      fontWeight: 700,
      color: '#1f2a44',
      fontSize: '1.05rem',
      letterSpacing: '-0.01em',
    },
  };

  const tableShellSx = {
    maxHeight: '50vh',
    border: '1px solid rgba(226, 232, 240, 0.75)',
    boxShadow: 'none',
    borderRadius: 1.5,
    overflowX: 'auto',
  };

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 2, md: 3 },
        fontFamily: '"Space Grotesk", "Manrope", sans-serif',
        backgroundColor: '#f2f4f8',
        minHeight: '100vh',
        px: { xs: 1.25, sm: 2.5 },
      }}
    >
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
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          mb: 3,
          p: 2,
          borderRadius: 2,
          border: '1px solid #d7deea',
          backgroundColor: '#ffffff',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => window.location.hash = `#/business/${businessId}`}
          sx={{ borderRadius: 1, width: { xs: '100%', sm: 'auto' } }}
        >
          Back to Templates
        </Button>
        <Button
          variant="contained"
          startIcon={<OpenInNewIcon />}
          onClick={() => {
            const templateUrl = `${window.location.origin}${window.location.pathname}#/business/${businessId}`;
            window.open(templateUrl, '_blank', 'noopener,noreferrer');
          }}
          sx={{ borderRadius: 1, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
        >
          Template page
        </Button>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            flex: 1,
            color: '#1f2937',
            fontSize: { xs: '1.6rem', md: '2.05rem' },
            lineHeight: 1.1,
          }}
        >
          {business.name} - Admin
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          size="small"
          sx={{ borderRadius: 1, width: { xs: '100%', sm: 'auto' } }}
        >
          Logout
        </Button>
      </Box>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid item xs={12}>
          <Card sx={cardSx}>
            <CardHeader title="Share with Customers" sx={cardHeaderSx} />
            <CardContent>
              <TemplateSharePanel businessId={businessId} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={cardSx}>
            <CardHeader
              title="Branding & Review Links"
              sx={cardHeaderSx}
            />
            <CardContent>
              <TextField
                fullWidth
                size="small"
                label="Business Name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Upload your company logo to show it on the customer template page.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.2,
                  alignItems: { xs: 'stretch', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  mb: 2,
                  '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
                }}
              >
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
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveBusinessSettings}
                  startIcon={<SaveIcon />}
                >
                  Save Settings
                </Button>
              </Box>
              {logoUrl && (
                <Box
                  component="img"
                  src={logoUrl}
                  alt="Company logo preview"
                  sx={{
                    maxHeight: 72,
                    maxWidth: '100%',
                    width: 'auto',
                    borderRadius: 1,
                    border: '1px solid rgba(148,163,184,0.35)',
                    p: 0.5,
                    bgcolor: '#fff',
                  }}
                />
              )}

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1.5 }}>
                Review Platforms
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Add external review links customers can use after submitting feedback.
              </Typography>
              {reviewPlatforms.map((platform, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, 0.38fr) 1fr auto' },
                    gap: 1,
                    mb: 1.2,
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    size="small"
                    label="Name"
                    value={platform.name}
                    onChange={(e) => handlePlatformChange(index, 'name', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="URL"
                    value={platform.url}
                    onChange={(e) => handlePlatformChange(index, 'url', e.target.value)}
                    fullWidth
                    placeholder="https://..."
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                      gridColumn: { xs: '1 / -1', sm: 'auto' },
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => window.open(normalizeUrl(platform.url), '_blank')}
                      disabled={!platform.url}
                      title="Test Link"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemovePlatform(index)}
                      disabled={reviewPlatforms.length <= 1}
                      title="Remove Platform"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddPlatform}>
                Add Platform
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={cardSx}>
            <CardHeader title="Compose Questions" sx={cardHeaderSx} />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Edit the five AI compose questions customers see when they click Compose.
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.2 }}>
                {composeQuestions.map((question, index) => (
                  <Box
                    key={question.key || index}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 1.5,
                      p: 1.2,
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.8 }}>
                      Question {index + 1}
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      label="Question Text"
                      value={question.label}
                      onChange={(event) => handleComposeQuestionChange(index, 'label', event.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Hint / Placeholder"
                      value={question.placeholder}
                      onChange={(event) => handleComposeQuestionChange(index, 'placeholder', event.target.value)}
                    />
                  </Box>
                ))}
              </Box>
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
                <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSaveComposeQuestions} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Save Compose Questions
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Templates */}
        <Grid item xs={12} md={6}>
          <Card sx={cardSx}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Active Templates
                  <Chip label={templates.length} size="small" color="success" />
                </Box>
              }
              sx={cardHeaderSx}
            />
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => { setEditingBackup(false); setCurrentTemplate({ text: '' }); setShowCreateModal(true); }}
                >
                  Add Template
                </Button>
              </Box>

              <TableContainer component={Paper} sx={tableShellSx}>
                <Table stickyHeader size="small" sx={{ minWidth: isMobile ? 520 : 0, tableLayout: 'fixed' }}>
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
                          <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
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
          <Card sx={cardSx}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Backup Templates
                  <Chip label={backupTemplates.length} size="small" color="warning" />
                </Box>
              }
              sx={cardHeaderSx}
            />
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
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

              <TableContainer component={Paper} sx={tableShellSx}>
                <Table stickyHeader size="small" sx={{ minWidth: isMobile ? 520 : 0, tableLayout: 'fixed' }}>
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
                          <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
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

        <Grid item xs={12}>
          <Card sx={cardSx}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                My Reviews
                <Chip label={reviews.length} size="small" color="primary" />
              </Box>
            }
            sx={cardHeaderSx}
          />
          <CardContent>
            <TableContainer component={Paper} sx={tableShellSx}>
              <Table stickyHeader size="small" sx={{ minWidth: isMobile ? 760 : 0, tableLayout: 'fixed' }}>
	                <TableHead>
	                  <TableRow>
	                    <TableCell sx={{ width: 160 }}>Date</TableCell>
	                    <TableCell sx={{ width: 130 }}>Rating</TableCell>
	                    <TableCell>Review</TableCell>
                    <TableCell sx={{ width: 140 }}>Consent</TableCell>
                    <TableCell sx={{ width: 130 }}>Actions</TableCell>
	                  </TableRow>
	                </TableHead>
	                <TableBody>
	                  {reviews.length === 0 ? (
	                    <TableRow>
	                      <TableCell colSpan={5} align="center">
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
	                        <TableCell sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
	                          {review.review_text}
	                        </TableCell>
                          <TableCell>
                            {review.consent_revoked_at ? (
                              <Chip
                                size="small"
                                color="warning"
                                label={`Revoked (${new Date(review.consent_revoked_at).toLocaleDateString()})`}
                              />
                            ) : review.consent_granted ? (
                              <Chip size="small" color="success" label="Consented" />
                            ) : (
                              <Chip size="small" label="No consent" />
                            )}
                          </TableCell>
                          <TableCell>
                            {review.consent_granted && !review.consent_revoked_at && isAuthenticated ? (
                              <Button
                                size="small"
                                color="warning"
                                variant="outlined"
                                onClick={() => handleRevokeReviewConsent(review.id)}
                              >
                                Revoke
                              </Button>
                            ) : (
                              <Typography variant="caption" color="text.secondary">-</Typography>
                            )}
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

      <Dialog
        open={showShareDialog}
        onClose={() => {
          markShareQrSeen(businessId);
          setShowShareDialog(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Share Your Review Page
        </DialogTitle>
        <DialogContent dividers>
          <TemplateSharePanel businessId={businessId} />
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => {
              markShareQrSeen(businessId);
              setShowShareDialog(false);
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showLogoCropDialog}
        onClose={() => setShowLogoCropDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
          Crop Logo
          <IconButton
            onClick={() => setShowLogoCropDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
            Adjust zoom and position so the logo appears consistent on the template page.
          </Typography>
          <Box
            sx={{
              width: 220,
              height: 220,
              mx: 'auto',
              borderRadius: 2,
              border: '1px solid #d6deea',
              overflow: 'hidden',
              bgcolor: '#f8fafc',
              position: 'relative',
            }}
          >
            {rawLogoSource && (
              <Box
                component="img"
                src={rawLogoSource}
                alt="Logo crop preview"
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '100%',
                  height: '100%',
                  maxWidth: 'none',
                  objectFit: 'cover',
                  transform: `translate(calc(-50% + ${logoOffsetX}px), calc(-50% + ${logoOffsetY}px)) scale(${logoZoom})`,
                  transformOrigin: 'center',
                }}
              />
            )}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">Zoom</Typography>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={logoZoom}
              onChange={(_, value) => setLogoZoom(Number(value))}
            />
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Horizontal</Typography>
            <Slider
              min={-100}
              max={100}
              step={1}
              value={logoOffsetX}
              onChange={(_, value) => setLogoOffsetX(Number(value))}
            />
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Vertical</Typography>
            <Slider
              min={-100}
              max={100}
              step={1}
              value={logoOffsetY}
              onChange={(_, value) => setLogoOffsetY(Number(value))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" onClick={() => setShowLogoCropDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleApplyLogoCrop} disabled={!rawLogoSource}>
            Apply Crop
          </Button>
        </DialogActions>
      </Dialog>

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
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
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
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
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
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
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

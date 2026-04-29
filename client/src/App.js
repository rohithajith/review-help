import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from './api';
import { HashRouter as Router, Route, Routes, useParams, useLocation, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Landing from './components/Landing';
import Pricing from './components/Pricing';
import Contact from './components/Contact';
import Signup from './components/Signup';
import SignupSuccess from './components/SignupSuccess';
import PaymentPending from './components/PaymentPending';
import ResetPassword from './components/ResetPassword';
import NavBar from './components/Navbar';
import supabase from './lib/supabaseClient';
import useTemplates from './hooks/useTemplates';
import useScrollGradient from './hooks/useScrollGradient';
import Footer from './components/Footer';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AdminDashboard from './components/AdminDashboard';
import BusinessAdmin from './components/BusinessAdmin';
import { resolveBusinessIdFromShortCode } from './utils/templateShare';
import {
  BUSINESS_ADMIN_UPDATED_EVENT,
  isBusinessAdminUpdateForBusiness,
  parseBusinessAdminStorageSignal,
  parseBusinessId,
  readBusinessLocalLogo,
} from './utils/businessLiveSync';
import './App.css';

// Logo mapping for businesses (static logos stored in public/logos/)
const businessLogos = {
  2: '/logos/myras-fish-bar.png', // Myra's Fish Bar
};

const CONSENT_STATEMENT = 'I allow this business to use my review in marketing and public content (for example website, social media, or promotional materials). I can revoke this permission later using my revoke token.';
const LEGACY_FALLBACK_TEMPLATE_TEXT = 'Thank you for visiting — we appreciate your feedback.';
const normalizeComposeQuestions = (rawQuestions) => {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions
    .map((question, index) => ({
      key: String(question?.key || `question_${index + 1}`).trim(),
      label: String(question?.label || '').trim(),
      placeholder: String(question?.placeholder || '').trim(),
    }))
    .filter((question) => question.key && question.label);
};

// =============================================================================
// Business Template Page - Each business owner gets their unique URL
// Example: http://your-domain.com/#/business/2 for Myra's Fish Bar
// =============================================================================
function BusinessTemplatePage() {
  const { businessId } = useParams();
  const normalizedBusinessId = parseBusinessId(businessId);
  const [business, setBusiness] = useState(null);
  const [businessError, setBusinessError] = useState(null);
  const { templates, loading, error, refresh } = useTemplates(businessId);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const scrollBg = useScrollGradient({
    topColor: '#f4f7fb',
    middleColor: '#edf2f8',
    bottomColor: '#e5edf7',
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [ownReviewText, setOwnReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showChannelPopup, setShowChannelPopup] = useState(false);
  const [showExternalOptions, setShowExternalOptions] = useState(true);
  const [lastSavedReview, setLastSavedReview] = useState('');
  const [lastSavedReviewId, setLastSavedReviewId] = useState(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [revokeAvailable, setRevokeAvailable] = useState(false);
  const [revokeToken, setRevokeToken] = useState('');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateEditorText, setTemplateEditorText] = useState('');
  const [showTemplateAssist, setShowTemplateAssist] = useState(false);
  const [busyThanksVisible, setBusyThanksVisible] = useState(false);
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeQuestions, setComposeQuestions] = useState([]);
  const [composeQuestionsSource, setComposeQuestionsSource] = useState('');
  const [composeQuestionsLoading, setComposeQuestionsLoading] = useState(false);
  const [composeQuestionsError, setComposeQuestionsError] = useState('');
  const [composeAnswers, setComposeAnswers] = useState({});
  const [composeSkipped, setComposeSkipped] = useState({});
  const [composeStep, setComposeStep] = useState(0);
  const [composeLoading, setComposeLoading] = useState(false);
  const [polishLoading, setPolishLoading] = useState(false);
  const isErrorMessage = /could not|error|failed|forbidden|invalid|missing/i.test(String(successMessage || ''));
  const businessLogoSrc = business?.logo_url || businessLogos[businessId] || '';

  const fetchBusinessDetails = useCallback(async (businessIdOverride = null) => {
    const targetBusinessId = parseBusinessId(businessIdOverride) || normalizedBusinessId;
    if (!targetBusinessId) return;
    try {
      const res = await api.get(`/${targetBusinessId}/business`);
      const data = res.data || null;
      const localLogo = readBusinessLocalLogo(targetBusinessId);
      setBusiness(data ? { ...data, logo_url: localLogo || data.logo_url || '' } : null);
      setBusinessError(null);
    } catch (err) {
      console.error('Error fetching business details', err);
      setBusinessError('Business not found');
    }
  }, [normalizedBusinessId]);

  // Fetch business details when businessId changes
  useEffect(() => {
    fetchBusinessDetails();
  }, [fetchBusinessDetails]);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) {
          setIsLoggedIn(Boolean(data?.session));
          setAuthResolved(true);
        }
      } catch (e) {
        if (active) {
          setIsLoggedIn(false);
          setAuthResolved(true);
        }
      }
    };

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
      setAuthResolved(true);
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!normalizedBusinessId) return undefined;

    const refreshTemplatePageData = async () => {
      const tasks = [];
      if (typeof refresh === 'function') {
        tasks.push(refresh(normalizedBusinessId));
      }
      tasks.push(fetchBusinessDetails(normalizedBusinessId));
      await Promise.allSettled(tasks);
    };

    const handleBusinessAdminUpdated = (event) => {
      if (!isBusinessAdminUpdateForBusiness(event?.detail, normalizedBusinessId)) return;
      refreshTemplatePageData();
    };

    const handleStorageSignal = (event) => {
      const signal = parseBusinessAdminStorageSignal(event);
      if (!signal?.businessId || signal.businessId !== normalizedBusinessId) return;
      refreshTemplatePageData();
    };

    window.addEventListener(BUSINESS_ADMIN_UPDATED_EVENT, handleBusinessAdminUpdated);
    window.addEventListener('storage', handleStorageSignal);

    return () => {
      window.removeEventListener(BUSINESS_ADMIN_UPDATED_EVENT, handleBusinessAdminUpdated);
      window.removeEventListener('storage', handleStorageSignal);
    };
  }, [fetchBusinessDetails, normalizedBusinessId, refresh]);

  const visibleTemplates = useMemo(
    () => (Array.isArray(templates)
      ? templates.filter((t) => String(t?.text || '').trim().toLowerCase() !== LEGACY_FALLBACK_TEMPLATE_TEXT.toLowerCase())
      : []),
    [templates]
  );

  useEffect(() => {
    if (!Array.isArray(visibleTemplates) || visibleTemplates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }
    if (selectedTemplateId && !visibleTemplates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(null);
    }
  }, [visibleTemplates, selectedTemplateId]);

  const handleSelectTemplate = (template) => {
    if (!consentAccepted) {
      setPendingTemplate(template);
      setShowPermissionPopup(true);
      return;
    }
    setSelectedTemplateId(template.id);
    setTemplateEditorText(template.text || '');
    setShowTemplateEditor(true);
  };

  const handleConfirmPermissionForTemplate = () => {
    if (!consentAccepted || !pendingTemplate) return;
    setSelectedTemplateId(pendingTemplate.id);
    setTemplateEditorText(pendingTemplate.text || '');
    setShowPermissionPopup(false);
    setShowTemplateEditor(true);
    setPendingTemplate(null);
  };

  const openChannelWithText = async (channelName, textToCopy) => {
    const url = getChannelUrl(channelName);
    try {
      await navigator.clipboard.writeText(textToCopy || '');
    } catch (e) {
      // ignore clipboard permission failures
    }
    if (url) window.open(url, '_blank');
  };

  const handleUseEditedTemplate = async () => {
    const editedText = String(templateEditorText || '').trim();
    if (!editedText || !selectedTemplateId) return;
    setShowTemplateEditor(false);
    await submitReviewAndOpenChannels({
      text: editedText,
      templateId: selectedTemplateId,
      requireConsent: true,
      suppressChannelPopup: true,
      showExternalOptions: false,
    });
  };

  const getChannelUrl = (channelName) => {
    const normalized = String(channelName || '').toLowerCase();
    const configured = Array.isArray(business?.review_platforms)
      ? business.review_platforms.find((p) => String(p.name || '').toLowerCase().includes(normalized))
      : null;
    if (configured && configured.url) return configured.url;
    if (normalized === 'google') {
      if (business?.google_review_url) return business.google_review_url;
      return `https://www.google.com/search?q=${encodeURIComponent(business?.name || '')}+reviews`;
    }
    if (normalized === 'tripadvisor') {
      return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(business?.name || '')}`;
    }
    return null;
  };

  const sharePlatforms = useMemo(() => {
    const configured = Array.isArray(business?.review_platforms)
      ? business.review_platforms
        .filter((p) => p && String(p.name || '').trim().length > 0)
        .map((p) => String(p.name).trim())
      : [];
    const base = configured.length > 0 ? configured : ['Google', 'TripAdvisor'];
    const seen = new Set();
    return base.filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [business?.review_platforms]);

  const submitReviewAndOpenChannels = async ({ text, templateId = null, requireConsent = false, autoOpenChannel = null, suppressChannelPopup = false, showExternalOptions: nextShowExternalOptions = true }) => {
    if (!text.trim() || !rating) return;
    if (requireConsent && !consentAccepted) {
      setShowTemplateAssist(true);
      setShowPermissionPopup(true);
      return;
    }
    setSubmitting(true);
    try {
      const requestBody = {
        rating,
        reviewText: text.trim(),
        consentAccepted: requireConsent ? consentAccepted : (consentAccepted === true),
      };
      if (Number.isInteger(templateId) && templateId > 0) {
        requestBody.templateId = templateId;
      }

      const response = await api.post(`/${businessId}/reviews`, requestBody);
      const savedRevokeToken = String(response?.data?.revokeToken || '').trim();
      try {
        if (window.isSecureContext && navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text.trim());
        }
      } catch (_e) {
        // Ignore clipboard permission/runtime errors.
      }
      setLastSavedReview(text.trim());
      setLastSavedReviewId(response?.data?.review?.id || null);
      setRevokeToken(savedRevokeToken);
      setRevokeAvailable(Boolean(response?.data?.revokeAvailable) || Boolean(savedRevokeToken));
      setShowExternalOptions(nextShowExternalOptions);
      setSuccessMessage('Review submitted.');
      if (Number.isInteger(templateId) && templateId > 0) {
        setShowTemplateAssist(false);
        setBusyThanksVisible(true);
      }
      if (suppressChannelPopup) {
        setShowChannelPopup(false);
      } else if (autoOpenChannel) {
        await openChannelWithText(autoOpenChannel, text.trim());
      } else {
        setShowChannelPopup(true);
      }
      if (typeof refresh === 'function') await refresh(businessId);
    } catch (err) {
      console.error('Error submitting review', err);
      const backendMessage = err?.response?.data?.message
        || (Array.isArray(err?.response?.data?.errors) && err.response.data.errors[0]?.msg)
        || null;
      setSuccessMessage(backendMessage || 'Could not save your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOwnReview = async () => {
    if (!ownReviewText.trim()) return;
    await submitReviewAndOpenChannels({
      text: ownReviewText,
      templateId: null,
      requireConsent: false,
    });
  };

  const handleCompose = async () => {
    setComposeStep(0);
    setComposeQuestions([]);
    setComposeQuestionsSource('');
    setComposeQuestionsError('');
    setComposeAnswers({});
    setComposeSkipped({});
    setComposeQuestionsLoading(true);
    setShowComposeModal(true);
    try {
      const res = await api.get(`/${businessId}/reviews/compose/questions`);
      const loadedQuestions = normalizeComposeQuestions(res?.data?.questions);
      if (loadedQuestions.length === 0) {
        throw new Error('No compose questions available');
      }
      setComposeQuestions(loadedQuestions);
      setComposeQuestionsSource(String(res?.data?.source || ''));
    } catch (err) {
      console.error('Error loading compose questions', err);
      setComposeQuestions([]);
      setComposeQuestionsError(err?.response?.data?.message || 'Could not load compose questions right now.');
    } finally {
      setComposeQuestionsLoading(false);
    }
  };

  const handlePolishOwnReview = async () => {
    if (!ownReviewText.trim()) return;
    setPolishLoading(true);
    try {
      const res = await api.post(`/${businessId}/reviews/polish`, {
        reviewText: ownReviewText.trim(),
      });
      const polished = String(res?.data?.reviewText || '').trim();
      if (polished) {
        setOwnReviewText(polished);
        setSuccessMessage('Review polished successfully.');
      } else {
        setSuccessMessage('Could not polish review right now.');
      }
    } catch (err) {
      setSuccessMessage('Could not polish review right now.');
    } finally {
      setPolishLoading(false);
    }
  };

  const composeQuestionCount = composeQuestions.length;
  const answeredComposeCount = composeQuestions.filter((q) => String(composeAnswers[q.key] || '').trim().length > 0).length;
  const currentComposeQuestion = composeQuestions[composeStep] || null;
  const composeQuestionsLeft = currentComposeQuestion ? Math.max(composeQuestionCount - composeStep - 1, 0) : 0;

  const handleComposeAnswerChange = (key, value) => {
    if (!key) return;
    setComposeAnswers((prev) => ({ ...prev, [key]: value }));
    if (value && value.trim().length > 0) {
      setComposeSkipped((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleToggleSkipComposeQuestion = (key) => {
    if (!key) return;
    setComposeSkipped((prev) => {
      const next = !prev[key];
      return { ...prev, [key]: next };
    });
    setComposeAnswers((prev) => ({ ...prev, [key]: '' }));
  };

  const resetComposeModal = () => {
    setShowComposeModal(false);
    setComposeQuestions([]);
    setComposeQuestionsSource('');
    setComposeQuestionsError('');
    setComposeQuestionsLoading(false);
    setComposeAnswers({});
    setComposeSkipped({});
    setComposeStep(0);
    setComposeLoading(false);
  };

  const handleComposeNext = () => {
    setComposeStep((prev) => Math.min(prev + 1, Math.max(composeQuestionCount - 1, 0)));
  };

  const handleComposeBack = () => {
    setComposeStep((prev) => Math.max(prev - 1, 0));
  };

  const handleGenerateComposeReview = async () => {
    if (answeredComposeCount < 1 || composeQuestionCount < 1) return;
    setComposeLoading(true);
    try {
      const answersPayload = {};
      for (const q of composeQuestions) {
        const v = String(composeAnswers[q.key] || '').trim();
        if (v) answersPayload[q.key] = v;
      }
      const skippedKeys = composeQuestions.filter((q) => composeSkipped[q.key]).map((q) => q.key);
      const res = await api.post(`/${businessId}/reviews/compose`, {
        answers: answersPayload,
        skippedKeys,
      });
      const generated = String(res?.data?.reviewText || '').trim();
      if (generated) {
        setOwnReviewText(generated);
        setSuccessMessage('AI draft added to your review box.');
        resetComposeModal();
      } else {
        setSuccessMessage('Could not generate a review right now.');
      }
    } catch (err) {
      setSuccessMessage(err?.response?.data?.message || 'Could not generate a review right now.');
    } finally {
      setComposeLoading(false);
    }
  };

  const handlePostToChannel = async (channelName) => {
    if (lastSavedReviewId) {
      try {
        await api.post(`/${businessId}/reviews/${lastSavedReviewId}/metadata`, {
          platformAction: 'platform_clicked',
          platformName: channelName,
        });
      } catch (_e) {
        // Non-blocking metadata update.
      }
    }
    await openChannelWithText(channelName, lastSavedReview || ownReviewText || '');
    setShowChannelPopup(false);
  };

  const handleSkipPostSubmitPlatforms = async () => {
    if (lastSavedReviewId) {
      try {
        await api.post(`/${businessId}/reviews/${lastSavedReviewId}/metadata`, {
          platformAction: 'skipped',
        });
      } catch (_e) {
        // Non-blocking metadata update.
      }
    }
    setShowChannelPopup(false);
  };

  // Loading state
  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress color="primary" />
    </Box>
  );
  
  // Business not found
  if (businessError) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={2}>
      <Alert severity="error">{businessError}</Alert>
    </Box>
  );
  
  // API error
  if (error) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={2}>
      <Alert severity="error">Error: {error}</Alert>
    </Box>
  );

  return (
    <Box 
      className="App" 
      sx={{ 
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 8% 0%, rgba(16, 185, 129, 0.14) 0%, rgba(16, 185, 129, 0) 38%),
          radial-gradient(circle at 92% 4%, rgba(30, 60, 114, 0.12) 0%, rgba(30, 60, 114, 0) 42%),
          ${scrollBg}
        `,
        transition: 'background 300ms linear',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, textAlign: 'left' }}>
        {/* Business Logo and Welcome Message */}
        {businessLogoSrc && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
            <Box
              component="img"
              src={businessLogoSrc}
              alt={business?.name || 'Business Logo'}
              sx={{
                height: { xs: 68, md: 84 },
                width: 'auto',
                borderRadius: 2,
                boxShadow: '0 10px 28px rgba(23, 37, 84, 0.14)',
              }}
            />
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="h4" sx={{ color: '#13243f', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                {business?.name || 'Review'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#475569', mt: 0.5 }}>
                {business?.welcome_message || 'Share your experience in a few words.'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Business Name Header (if no logo configured) */}
        {!businessLogoSrc && business?.name && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ color: '#13243f', fontWeight: 700, letterSpacing: '-0.01em' }}>
              {business.name}
            </Typography>
            <Typography variant="body1" sx={{ color: '#475569', mt: 1 }}>
              {business?.welcome_message || 'Share your experience in a few words.'}
            </Typography>
          </Box>
        )}

        {/* Admin Button - visible only for logged-out visitors */}
        {authResolved && !isLoggedIn && (
          <Box sx={{ position: 'fixed', bottom: { xs: 76, sm: 16 }, right: { xs: 10, sm: 16 }, zIndex: 1000 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => window.location.hash = `#/business/${businessId}/admin`}
              sx={{
                opacity: 0.7,
                '&:hover': { opacity: 1 },
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 999,
              }}
            >
              Admin
            </Button>
          </Box>
        )}

        <Snackbar
          open={!!successMessage}
          autoHideDuration={3000}
          onClose={() => setSuccessMessage('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccessMessage('')} severity={isErrorMessage ? 'error' : 'success'}>
            {successMessage}
          </Alert>
        </Snackbar>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            background: 'rgba(255, 255, 255, 0.74)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.10)',
            p: { xs: 2, md: 3 },
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#13243f', letterSpacing: '-0.01em' }}>
                Share Your Review
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', mt: 0.4 }}>
                Write your own feedback, or tap <strong>I&apos;m busy</strong> below to choose a template that best matches your experience.
              </Typography>
            </Box>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              border: '1px solid rgba(203, 213, 225, 0.65)',
              backgroundColor: '#ffffff',
              boxShadow: '0 10px 22px rgba(15, 23, 42, 0.06)',
              mb: 2.5,
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.6, fontWeight: 600, color: '#334155' }}>
                  Rating
                </Typography>
                <Rating value={rating} onChange={(_, v) => setRating(v || 0)} />
              </Box>
              <FormControlLabel
                sx={{ mt: -0.5 }}
                control={
                  <Checkbox
                    size="small"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    I consent to this review being used in marketing/public content.
                  </Typography>
                }
              />
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Tell others what stood out about your visit..."
                  value={ownReviewText}
                  onChange={(e) => setOwnReviewText(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#fff',
                    },
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    mt: 1.2,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleCompose}
                    sx={{
                      borderColor: 'rgba(16, 185, 129, 0.6)',
                      color: '#059669',
                      backgroundColor: 'rgba(236, 253, 245, 0.95)',
                      borderRadius: 999,
                      flex: { xs: '1 1 auto', sm: '0 0 auto' },
                      minWidth: { xs: '48%', sm: 0 },
                      '&:hover': {
                        borderColor: '#059669',
                        backgroundColor: 'rgba(220, 252, 231, 0.95)',
                      },
                    }}
                  >
                    Compose
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handlePolishOwnReview}
                    disabled={!ownReviewText.trim() || polishLoading}
                    sx={{
                      borderColor: 'rgba(16, 185, 129, 0.6)',
                      color: '#059669',
                      backgroundColor: 'rgba(236, 253, 245, 0.95)',
                      borderRadius: 999,
                      flex: { xs: '1 1 auto', sm: '0 0 auto' },
                      minWidth: { xs: '48%', sm: 0 },
                      '&:hover': {
                        borderColor: '#059669',
                        backgroundColor: 'rgba(220, 252, 231, 0.95)',
                      },
                      '&.Mui-disabled': {
                        borderColor: 'rgba(148, 163, 184, 0.45)',
                        color: 'rgba(100, 116, 139, 0.9)',
                        backgroundColor: 'rgba(241, 245, 249, 0.85)',
                      },
                    }}
                  >
                    {polishLoading ? 'Polishing...' : 'Polish'}
                  </Button>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {ownReviewText.trim().length} characters
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleSubmitOwnReview}
                  disabled={submitting || !rating || !ownReviewText.trim()}
                  sx={{ minWidth: 120, borderRadius: 2 }}
                >
                  Review
                </Button>
              </Box>
            </Stack>
          </Paper>

          <Button
            variant={showTemplateAssist ? 'contained' : 'outlined'}
            onClick={() => {
              setShowTemplateAssist((prev) => {
                const next = !prev;
                if (next) setBusyThanksVisible(false);
                return next;
              });
            }}
            sx={{ mb: showTemplateAssist ? 2.5 : 1 }}
          >
            I&apos;m busy
          </Button>

          {!showTemplateAssist && busyThanksVisible && (
            <Alert
              severity="success"
              sx={{
                mb: 2,
                borderRadius: 2,
                border: '1px solid rgba(16, 185, 129, 0.4)',
                backgroundColor: 'rgba(236, 253, 245, 0.9)',
                color: '#065f46',
              }}
            >
              Thank you for Feedback
            </Alert>
          )}

          {showTemplateAssist && (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Suggested Templates
                </Typography>
                <Chip
                  size="small"
                  label="Tap any template to edit"
                  color="primary"
                  variant="outlined"
                  sx={{ maxWidth: '100%' }}
                />
              </Stack>

              {visibleTemplates.length > 1 ? (
                <Grid container spacing={1.5}>
                  {visibleTemplates.map((template) => (
                    <Grid item xs={12} md={6} key={template.id}>
                      <Card
                        sx={{
                          borderRadius: 2.5,
                          border: '1px solid',
                          borderColor: selectedTemplateId === template.id ? 'rgba(16, 185, 129, 0.65)' : 'rgba(203, 213, 225, 0.95)',
                          cursor: 'pointer',
                          opacity: 1,
                          boxShadow: selectedTemplateId === template.id ? '0 12px 24px rgba(16, 185, 129, 0.16)' : '0 6px 14px rgba(15, 23, 42, 0.05)',
                          transition: 'all 160ms ease',
                          '&:hover': {
                            borderColor: 'rgba(16, 185, 129, 0.8)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 14px 28px rgba(16, 185, 129, 0.16)',
                          },
                        }}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.55 }}>
                            {template.text}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Card sx={{ borderRadius: 2.5, opacity: 1, border: '1px solid rgba(203, 213, 225, 0.95)', boxShadow: '0 6px 14px rgba(15, 23, 42, 0.05)' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.55 }}>
                      {visibleTemplates[0]?.text || 'No templates available'}
                    </Typography>
                  </CardContent>
                </Card>
              )}

            </>
          )}

          <Typography variant="body2" sx={{ color: '#64748b', mt: 2.5 }}>
            Selecting <strong>Use This Review</strong> saves your review securely within the app.
          </Typography>
        </Paper>

        <Dialog
          open={showChannelPopup}
          onClose={() => {
            if (showExternalOptions) {
              handleSkipPostSubmitPlatforms();
              return;
            }
            setShowChannelPopup(false);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
            Thank you for your valuable review
          </DialogTitle>
          <DialogContent sx={{ pt: 0.5 }}>
            {showExternalOptions ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Please choose a platform below to share it:
                </Typography>
                <Stack direction="column" spacing={1} sx={{ mb: 2.5, width: '100%', maxWidth: 320 }}>
                  {sharePlatforms.map((platformName) => (
                    <Button
                      key={platformName}
                      size="medium"
                      variant="contained"
                      onClick={() => handlePostToChannel(platformName)}
                      sx={{
                        py: 1,
                        width: '100%',
                        borderRadius: 2,
                        px: 2,
                        justifyContent: 'flex-start',
                      }}
                    >
                      <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: '20px 1fr', alignItems: 'center', columnGap: 1 }}>
                        <OpenInNewIcon fontSize="small" />
                        <Box component="span" sx={{ textAlign: 'left' }}>{platformName}</Box>
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your review has been saved in the app.
              </Typography>
            )}
            {revokeAvailable && revokeToken && (
              <Box
                sx={{
                  mt: 0.5,
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  borderRadius: 2,
                  backgroundColor: 'rgba(248, 250, 252, 0.8)',
                  p: 1.5,
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.75 }}>
                  Save this token if you may want to withdraw consent later.
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0f172a',
                    mb: 0.75,
                    wordBreak: 'break-word',
                  }}
                >
                  {revokeToken}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  To remove your review go to reviewhelp.uk/revoke and paste your token.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'center' }}>
            {showExternalOptions ? (
              <Button variant="text" size="medium" onClick={handleSkipPostSubmitPlatforms}>
                Skip
              </Button>
            ) : (
              <Button variant="text" size="medium" onClick={() => setShowChannelPopup(false)}>
                Close
              </Button>
            )}
          </DialogActions>
        </Dialog>

        <Dialog open={showTemplateEditor} onClose={() => setShowTemplateEditor(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Edit this template however you like, then click Use This Review.
            </Typography>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ mb: 0.6, fontWeight: 600, color: '#334155' }}>
                Rating
              </Typography>
              <Rating value={rating} onChange={(_, v) => setRating(v || 0)} />
            </Box>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={6}
              value={templateEditorText}
              onChange={(e) => setTemplateEditorText(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setShowTemplateEditor(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUseEditedTemplate} disabled={!templateEditorText.trim()}>
              Use This Review
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showPermissionPopup} onClose={() => { setShowPermissionPopup(false); setPendingTemplate(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Permission Required</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {CONSENT_STATEMENT}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                />
              }
              label="I understand and give permission"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setShowPermissionPopup(false); setPendingTemplate(null); }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={pendingTemplate ? handleConfirmPermissionForTemplate : () => { setShowPermissionPopup(false); }}
              disabled={!consentAccepted}
            >
              Continue
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showComposeModal} onClose={resetComposeModal} maxWidth="md" fullWidth>
          <DialogTitle>Compose Review With AI</DialogTitle>
          <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
            {composeQuestionsLoading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.2 }}>
                  Loading business-specific compose questions...
                </Typography>
              </Box>
            ) : composeQuestionsError ? (
              <Alert severity="error">{composeQuestionsError}</Alert>
            ) : currentComposeQuestion ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Answer one question at a time. You can skip any question and continue with the rest.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Chip size="small" label={`Question ${composeStep + 1} of ${composeQuestionCount}`} />
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {composeQuestionsLeft} left
                  </Typography>
                </Box>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {currentComposeQuestion.label}
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      placeholder={currentComposeQuestion.placeholder}
                      value={composeAnswers[currentComposeQuestion.key] || ''}
                      onChange={(e) => handleComposeAnswerChange(currentComposeQuestion.key, e.target.value)}
                      disabled={!!composeSkipped[currentComposeQuestion.key]}
                    />
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleToggleSkipComposeQuestion(currentComposeQuestion.key)}
                      >
                        {composeSkipped[currentComposeQuestion.key] ? 'Unskip' : 'Skip'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#64748b' }}>
                  Answered: {answeredComposeCount} / 1 minimum
                  {composeQuestionsSource ? ` (${composeQuestionsSource})` : ''}
                </Typography>
              </>
            ) : (
              <Alert severity="warning">No compose questions available right now.</Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
            <Button sx={{ flex: { xs: '1 1 48%', sm: '0 0 auto' } }} onClick={handleComposeBack} disabled={composeQuestionsLoading || !currentComposeQuestion || composeStep === 0}>
              Back
            </Button>
            <Button sx={{ flex: { xs: '1 1 48%', sm: '0 0 auto' } }} onClick={handleComposeNext} disabled={composeQuestionsLoading || !currentComposeQuestion || composeStep >= composeQuestionCount - 1}>
              Next
            </Button>
            <Button sx={{ flex: { xs: '1 1 48%', sm: '0 0 auto' } }} onClick={resetComposeModal}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateComposeReview}
              disabled={composeQuestionsLoading || !currentComposeQuestion || composeLoading || answeredComposeCount < 1}
              sx={{ flex: { xs: '1 1 48%', sm: '0 0 auto' } }}
            >
              {composeLoading ? 'Generating...' : 'Generate Review'}
            </Button>
          </DialogActions>
        </Dialog>

        <Footer />
      </Container>
    </Box>
  );
}

function RevokeConsentPage() {
  const location = useLocation();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    setToken(String(params.get('token') || '').trim());
  }, [location.search]);

  const handleRevoke = async () => {
    if (!token) {
      setError('Missing revoke token');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/reviews/consent/revoke', { token });
      setResult(res.data || { message: 'Consent revoked successfully' });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not revoke consent with this link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
              Revoke Marketing Consent
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use this page to withdraw permission for marketing/public use of your submitted review.
            </Typography>
            {result ? (
              <Alert severity="success">{result.message || 'Consent revoked successfully'}</Alert>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField
                  fullWidth
                  size="small"
                  label="Revoke token"
                  placeholder="revoke-e8am9le"
                  value={token}
                  onChange={(e) => setToken(String(e.target.value || '').trim())}
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" onClick={handleRevoke} disabled={submitting || !token}>
                  {submitting ? 'Revoking...' : 'Revoke Consent'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

function RevokeReviewPage() {
  const location = useLocation();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    setToken(String(params.get('token') || '').trim());
  }, [location.search]);

  const handleRevokeReview = async () => {
    if (!token) {
      setError('Please enter your revoke token');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/reviews/revoke', { token });
      setResult(res.data || { message: 'Review removed successfully' });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove your review with this token');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 2.5, border: '1px solid rgba(148, 163, 184, 0.3)' }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 1.2, fontWeight: 700 }}>
              Remove Your Review
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Paste your revoke token to permanently remove your submitted review.
            </Typography>
            {result ? (
              <Alert severity="success">{result.message || 'Review removed successfully'}</Alert>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField
                  fullWidth
                  size="small"
                  label="Revoke token"
                  placeholder="revoke-e8am9le"
                  value={token}
                  onChange={(e) => setToken(String(e.target.value || '').trim())}
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" color="error" onClick={handleRevokeReview} disabled={submitting || !token}>
                  {submitting ? 'Removing...' : 'Remove Review'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

// =============================================================================
// Business Admin Page Wrapper
// =============================================================================
function BusinessAdminPage() {
  const { businessId } = useParams();
  return <BusinessAdmin businessId={businessId} />;
}

function ShortLinkRedirectPage() {
  const { shortCode } = useParams();
  const businessId = resolveBusinessIdFromShortCode(shortCode);

  if (businessId) {
    return <Navigate to={`/business/${businessId}`} replace />;
  }

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Invalid Share Link
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          This short link is not valid. Ask the business owner for a new link.
        </Typography>
        <Button variant="contained" onClick={() => { window.location.hash = '#/'; }}>
          Go to Home
        </Button>
      </Paper>
    </Box>
  );
}

function AppLayout() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) setIsLoggedIn(Boolean(data?.session));
      } catch (e) {
        if (active) setIsLoggedIn(false);
      }
    };

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const pathname = location?.pathname || '/';
  const navAllowedPublicPaths = new Set([
    '/pricing',
    '/contact',
    '/signup',
    '/signup-success',
    '/payment-pending',
    '/login',
    '/reset-password',
  ]);
  const showNavBar = !isLoggedIn && navAllowedPublicPaths.has(pathname);

  return (
    <>
      {showNavBar && <NavBar />}
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-success" element={<SignupSuccess />} />
        <Route path="/payment-pending" element={<PaymentPending />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reviews/revoke-consent" element={<RevokeConsentPage />} />
        <Route path="/revoke" element={<RevokeReviewPage />} />
        {/* Business-specific template page - give this URL to customers */}
        {/* Example: http://localhost:3000/#/business/2 for Myra's Fish Bar */}
        <Route path="/business/:businessId" element={<BusinessTemplatePage />} />
        <Route path="/b/:shortCode" element={<ShortLinkRedirectPage />} />
        
        {/* Business-specific admin - give this URL to business owners */}
        {/* Example: http://localhost:3000/#/business/2/admin for Myra's admin */}
        <Route path="/business/:businessId/admin" element={<BusinessAdminPage />} />
        
        {/* Super admin dashboard - for you to manage all businesses */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Simple login route for business owners */}
        <Route path="/login" element={<Login />} />
        
        {/* Catch-all: redirect unknown hashes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

// =============================================================================
// Main App Router
// =============================================================================
export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

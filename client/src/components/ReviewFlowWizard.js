import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Fade,
  Chip,
  IconButton,
  Paper,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import EditIcon from '@mui/icons-material/Edit';
import api from '../api';

/**
 * ReviewFlowWizard - New customer review flow
 * 
 * Flow:
 * 1. Show 10 prompt cards - user selects one (keeps selection joy)
 * 2. Ask 2-3 quick questions with skip option (including negative feedback question for Google compliance)
 * 3. Auto-generate human-like review using OpenRouter
 * 4. Show generated review with Copy & Open Platform buttons
 */

// Questions to ask users - includes negative feedback for Google review gating compliance
const QUESTIONS = [
  {
    id: 'highlight',
    question: "What stood out most during your visit?",
    placeholder: "e.g., friendly staff, great food, nice atmosphere...",
    required: false,
  },
  {
    id: 'specific',
    question: "Any specific dish, service, or moment you'd mention?",
    placeholder: "e.g., the fish and chips were amazing...",
    required: false,
  },
  {
    id: 'negative',
    question: "Was there anything that could have been better?",
    placeholder: "e.g., wait time was a bit long, parking was tricky...",
    required: false,
    isNegative: true, // Flag for Google compliance - we ask about negatives
  },
];

const ReviewFlowWizard = ({ 
  templates, 
  business, 
  businessId, 
  onComplete,
  onRefreshTemplates 
}) => {
  // Wizard step: 'select' | 'questions' | 'generating' | 'review'
  const [step, setStep] = useState('select');
  
  // Selected prompt template
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  
  // Question answers
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Generated review
  const [generatedReview, setGeneratedReview] = useState('');
  const [editedReview, setEditedReview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // UI states
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Get valid review platforms
  const reviewPlatforms = (business?.review_platforms || []).filter(p => p.url && p.url.trim());
  const defaultPlatformUrl = business?.google_review_url || 
    (reviewPlatforms.length > 0 ? reviewPlatforms[0].url : null);

  // Reset copied state after delay
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // ============================================================
  // STEP 1: Prompt Selection
  // ============================================================
  const handleSelectPrompt = (template) => {
    setSelectedPrompt(template);
    setStep('questions');
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  // ============================================================
  // STEP 2: Questions
  // ============================================================
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered, generate review
      handleGenerateReview();
    }
  };

  const handleSkipQuestion = () => {
    // Mark as skipped (empty answer)
    setAnswers(prev => ({ ...prev, [QUESTIONS[currentQuestionIndex].id]: '' }));
    handleNextQuestion();
  };

  const handleBack = () => {
    if (step === 'questions' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (step === 'questions') {
      setStep('select');
      setSelectedPrompt(null);
    } else if (step === 'review') {
      setStep('questions');
      setCurrentQuestionIndex(QUESTIONS.length - 1);
    }
  };

  // ============================================================
  // STEP 3: Generate Review
  // ============================================================
  const handleGenerateReview = async () => {
    setStep('generating');
    setGenerating(true);
    setError(null);

    try {
      const response = await api.post(`/${businessId}/generate-review`, {
        selectedPrompt: selectedPrompt.text,
        answers: answers,
        businessName: business?.name || '',
      });

      if (response.data && response.data.review) {
        setGeneratedReview(response.data.review);
        setEditedReview(response.data.review);
        setStep('review');
      } else {
        throw new Error('No review generated');
      }
    } catch (err) {
      console.error('Error generating review:', err);
      setError('Failed to generate review. Using your selected template instead.');
      // Fallback to the selected prompt
      setGeneratedReview(selectedPrompt.text);
      setEditedReview(selectedPrompt.text);
      setStep('review');
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================
  // STEP 4: Review Actions
  // ============================================================
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedReview);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenPlatform = async (platformUrl = null) => {
    // Copy first
    await handleCopy();

    // Archive the template (mark as used) for rotation
    try {
      if (selectedPrompt && selectedPrompt.id) {
        await api.post(`/${businessId}/templates/${selectedPrompt.id}/use`, {
          modifiedText: editedReview
        });
        // Refresh templates for next user
        if (onRefreshTemplates) {
          onRefreshTemplates();
        }
      }
    } catch (err) {
      console.error('Error archiving template:', err);
    }

    // Open platform URL with no referrer/opener for privacy
    const url = platformUrl || defaultPlatformUrl || 
      `https://www.google.com/search?q=${encodeURIComponent(business?.name || '')}+reviews`;
    if (url) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.opener = null;
        newWindow.location = url;
      }
    }

    if (onComplete) {
      onComplete();
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  // ============================================================
  // RENDER: Step 1 - Prompt Selection
  // ============================================================
  const renderPromptSelection = () => (
    <Fade in={step === 'select'} timeout={300}>
      <Box>
        <Typography 
          variant="h5" 
          sx={{ 
            textAlign: 'center', 
            mb: 1, 
            fontWeight: 600,
            color: 'text.primary'
          }}
        >
          Choose a review style
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            textAlign: 'center', 
            mb: 3, 
            color: 'text.secondary' 
          }}
        >
          Pick the one that best matches your experience
        </Typography>

        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {templates.map((template, index) => (
            <Card
              key={template.id}
              onClick={() => handleSelectPrompt(template)}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px solid transparent',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Chip 
                  label={`Option ${index + 1}`} 
                  size="small" 
                  sx={{ mb: 1, fontSize: '0.7rem' }}
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.primary',
                    lineHeight: 1.6,
                  }}
                >
                  {template.text}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Fade>
  );

  // ============================================================
  // RENDER: Step 2 - Questions
  // ============================================================
  const renderQuestions = () => {
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;

    return (
      <Fade in={step === 'questions'} timeout={300}>
        <Box>
          {/* Progress indicator */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <IconButton onClick={handleBack} size="small">
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                Question {currentQuestionIndex + 1} of {QUESTIONS.length}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ borderRadius: 2, height: 6 }}
            />
          </Box>

          {/* Selected prompt preview */}
          <Paper 
            sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Your selected style:
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              "{selectedPrompt?.text}"
            </Typography>
          </Paper>

          {/* Question */}
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              fontWeight: 600,
              color: currentQuestion.isNegative ? 'text.primary' : 'text.primary'
            }}
          >
            {currentQuestion.question}
          </Typography>

          {currentQuestion.isNegative && (
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mb: 2, 
                color: 'text.secondary',
                fontStyle: 'italic'
              }}
            >
              Your honest feedback helps us improve. Feel free to skip if everything was great!
            </Typography>
          )}

          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={currentQuestion.placeholder}
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            variant="outlined"
            sx={{ mb: 3 }}
          />

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<SkipNextIcon />}
              onClick={handleSkipQuestion}
              sx={{ textTransform: 'none' }}
            >
              Skip
            </Button>
            <Button
              variant="contained"
              onClick={handleNextQuestion}
              sx={{ 
                textTransform: 'none',
                px: 4,
                background: 'linear-gradient(135deg, #10b981, #059669)',
              }}
            >
              {currentQuestionIndex === QUESTIONS.length - 1 ? 'Generate Review' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Fade>
    );
  };

  // ============================================================
  // RENDER: Step 3 - Generating
  // ============================================================
  const renderGenerating = () => (
    <Fade in={step === 'generating'} timeout={300}>
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Creating your review...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Making it sound natural and personal
        </Typography>
      </Box>
    </Fade>
  );

  // ============================================================
  // RENDER: Step 4 - Generated Review
  // ============================================================
  const renderReview = () => (
    <Fade in={step === 'review'} timeout={300}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={handleBack} size="small" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Your Review
          </Typography>
        </Box>

        {error && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              mb: 2, 
              color: 'warning.main' 
            }}
          >
            {error}
          </Typography>
        )}

        {/* Review display/edit area */}
        <Paper 
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            position: 'relative',
          }}
        >
          {isEditing ? (
            <TextField
              fullWidth
              multiline
              rows={5}
              value={editedReview}
              onChange={(e) => setEditedReview(e.target.value)}
              variant="outlined"
            />
          ) : (
            <Typography 
              variant="body1" 
              sx={{ 
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
              }}
            >
              {editedReview}
            </Typography>
          )}
          
          <IconButton 
            onClick={handleEditToggle}
            size="small"
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8,
              bgcolor: 'action.hover',
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Paper>

        {/* Copy confirmation */}
        {copied && (
          <Fade in={copied}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 1,
                mb: 2,
                color: 'success.main'
              }}
            >
              <CheckCircleIcon fontSize="small" />
              <Typography variant="body2">
                Copied to clipboard!
              </Typography>
            </Box>
          </Fade>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Copy button */}
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopy}
            fullWidth
            sx={{ 
              textTransform: 'none',
              py: 1.5,
            }}
          >
            Copy Review
          </Button>

          {/* Platform buttons */}
          {reviewPlatforms.length > 0 ? (
            reviewPlatforms.map((platform, index) => (
              <Button
                key={index}
                variant="contained"
                startIcon={<OpenInNewIcon />}
                onClick={() => handleOpenPlatform(platform.url)}
                fullWidth
                sx={{ 
                  textTransform: 'none',
                  py: 1.5,
                  background: index === 0 
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                }}
              >
                Open {platform.name || 'Review Page'}
              </Button>
            ))
          ) : (
            <Button
              variant="contained"
              startIcon={<OpenInNewIcon />}
              onClick={() => handleOpenPlatform()}
              fullWidth
              sx={{ 
                textTransform: 'none',
                py: 1.5,
                background: 'linear-gradient(135deg, #10b981, #059669)',
              }}
            >
              Open Google Reviews
            </Button>
          )}
        </Box>

        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            textAlign: 'center', 
            mt: 3, 
            color: 'text.secondary' 
          }}
        >
          Thank you for taking the time to leave a review! ❤️
        </Typography>
      </Box>
    </Fade>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {step === 'select' && renderPromptSelection()}
      {step === 'questions' && renderQuestions()}
      {step === 'generating' && renderGenerating()}
      {step === 'review' && renderReview()}
    </Box>
  );
};

export default ReviewFlowWizard;

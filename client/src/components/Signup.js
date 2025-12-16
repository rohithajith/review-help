import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import api from '../api';
import { 
  Box, Button, TextField, Typography, Alert, Chip, Stack,
  ToggleButtonGroup, ToggleButton, FormControl, InputLabel, Select, MenuItem,
  Stepper, Step, StepLabel, Paper, CircularProgress
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';

// Business categories by type
const BUSINESS_CATEGORIES = {
  business: [
    'Restaurant',
    'Cafe/Coffee Shop',
    'Salon/Barbershop',
    'Spa/Wellness',
    'Retail Store',
    'Hotel/B&B',
    'Gym/Fitness Center',
    'Auto Service',
    'Dental/Medical Clinic',
    'Legal/Professional Services',
    'Home Services',
    'Pet Services',
    'Other Business'
  ],
  freelancer: [
    'Hairdresser/Stylist',
    'Nail Technician',
    'Makeup Artist',
    'Massage Therapist',
    'Personal Trainer',
    'Photographer',
    'Tattoo Artist',
    'Tutor/Coach',
    'Consultant',
    'Handyman',
    'Cleaner',
    'Other Freelancer'
  ]
};

export default function Signup() {
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('Starter');

  // Read plan from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
    const plan = params.get('plan');
    if (plan) setSelectedPlan(plan);
    if (params.get('canceled') === 'true') {
      setError('Checkout was canceled. You can try again or choose a different plan.');
    }
  }, []);

  const steps = ['Account', 'Business Type', 'Details'];

  const isOtherCategory = businessCategory === 'Other Business' || businessCategory === 'Other Freelancer';
  const canProceedStep0 = email && password && password.length >= 6;
  const canProceedStep1 = businessType && businessCategory && (!isOtherCategory || customDescription.trim().length >= 10);
  const canSubmit = canProceedStep0 && canProceedStep1 && businessName;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Create account
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ 
        email: String(email).trim(), 
        password: String(password),
        options: {
          emailRedirectTo: window.location.origin + '/#/login'
        }
      });
      
      let session = signUpData?.session || null;
      
      if (signUpErr) {
        if (signUpErr.message?.includes('already registered') || signUpErr.status === 400) {
          // User exists, try sign in
        } else {
          setError(signUpErr.message || JSON.stringify(signUpErr));
          setLoading(false);
          return;
        }
      }

      // If no session from signup, try sign in
      if (!session) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ 
          email: String(email).trim(), 
          password: String(password) 
        });
        if (signInErr) {
          if (signInErr.message?.includes('Email not confirmed')) {
            setError('Please check your email to confirm your account, then try logging in.');
            setLoading(false);
            return;
          }
          setError(signInErr.message || JSON.stringify(signInErr));
          setLoading(false);
          return;
        }
        session = signInData?.session || null;
      }

      const accessToken = session?.access_token || null;
      if (!accessToken) {
        setError('Signup succeeded but no access token was returned');
        setLoading(false);
        return;
      }

      try { localStorage.setItem('supabase_access_token', accessToken); } catch (e) {}
      
      if (api && api.defaults && api.defaults.headers) {
        api.defaults.headers.common = api.defaults.headers.common || {};
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }

      try {
        const headers = { 'Authorization': `Bearer ${accessToken}` };
        // Use custom description as category if "Other" was selected
        const finalCategory = isOtherCategory ? customDescription.trim() : businessCategory;
        const onboardData = {
          business_name: businessName || undefined,
          business_type: businessType,
          business_category: finalCategory,
          plan: selectedPlan
        };
        
        const res = await (api.defaults 
          ? api.post('/users/onboard', onboardData, { headers })
          : fetch('/api/users/onboard', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify(onboardData)
            }).then(r => r.json().then(data => ({ data })))
        );
        const body = res && res.data ? res.data : null;
        
        if (body && body.businessId) {
          // If paid plan, redirect to Stripe checkout
          if (selectedPlan && selectedPlan !== 'Starter' && selectedPlan !== 'Free') {
            try {
              const checkout = await api.post('/payments/create-checkout-session', {
                plan: selectedPlan,
                email: String(email).trim(),
                businessId: body.businessId,
              }, { headers });
              if (checkout?.data?.url) {
                window.location.href = checkout.data.url;
                return;
              }
            } catch (e) {
              console.warn('Failed to create checkout session', e);
            }
          }

          // Redirect to admin dashboard
          window.location.hash = `#/business/${body.businessId}/admin`;
          return;
        }
        setError('Account created but no business was returned. Please refresh and try again.');
      } catch (e) {
        console.warn('Onboarding failed', e);
        setError('Could not finish account creation. Please try again.');
      }

      setLoading(false);
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField 
              fullWidth 
              label="Email" 
              type="email" 
              margin="normal" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <TextField 
              fullWidth 
              label="Password" 
              type="password" 
              margin="normal" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              helperText="At least 6 characters"
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              What type of service do you provide?
            </Typography>
            <ToggleButtonGroup
              value={businessType}
              exclusive
              onChange={(e, val) => {
                if (val) {
                  setBusinessType(val);
                  setBusinessCategory(''); // Reset category when type changes
                }
              }}
              fullWidth
              sx={{ mb: 3 }}
            >
              <ToggleButton value="business" sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={1}>
                  <StorefrontIcon />
                  <Typography variant="body2">Business</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Restaurant, Salon, Store
                  </Typography>
                </Stack>
              </ToggleButton>
              <ToggleButton value="freelancer" sx={{ py: 2 }}>
                <Stack alignItems="center" spacing={1}>
                  <PersonIcon />
                  <Typography variant="body2">Freelancer</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Individual service provider
                  </Typography>
                </Stack>
              </ToggleButton>
            </ToggleButtonGroup>

            {businessType && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  value={businessCategory}
                  label="Category"
                  onChange={(e) => {
                    setBusinessCategory(e.target.value);
                    if (!e.target.value.startsWith('Other')) {
                      setCustomDescription('');
                    }
                  }}
                >
                  {BUSINESS_CATEGORIES[businessType]?.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {isOtherCategory && (
              <TextField
                fullWidth
                label="Describe your service"
                margin="normal"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                required
                multiline
                rows={2}
                placeholder={businessType === 'freelancer' 
                  ? "e.g., Mobile dog groomer specializing in anxious pets" 
                  : "e.g., Family-owned bakery specializing in gluten-free cakes"}
                helperText="Minimum 10 characters. This helps AI generate better templates for your specific service."
                error={customDescription.length > 0 && customDescription.length < 10}
              />
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            <TextField 
              fullWidth 
              label={businessType === 'freelancer' ? 'Your Name / Brand' : 'Business Name'}
              margin="normal" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)}
              required
              helperText="This will appear on your review page"
            />
            
            <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>Summary</Typography>
              <Typography variant="body2" color="text.secondary">
                Type: <strong>{businessType === 'business' ? 'Business' : 'Freelancer'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Category: <strong>{isOtherCategory ? customDescription : businessCategory}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Plan: <strong>{selectedPlan}</strong>
              </Typography>
              <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                ✨ AI will generate personalized review templates for your {(isOtherCategory ? customDescription : businessCategory).toLowerCase()}
              </Typography>
            </Paper>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 4, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Create an account</Typography>
      
      {selectedPlan && selectedPlan !== 'Starter' && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Selected plan:</Typography>
          <Chip label={selectedPlan} color="primary" size="small" />
        </Stack>
      )}
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit}>
        {renderStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            disabled={activeStep === 0} 
            onClick={handleBack}
          >
            Back
          </Button>
          
          {activeStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={activeStep === 0 ? !canProceedStep0 : !canProceedStep1}
            >
              Next
            </Button>
          ) : (
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || !canSubmit}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Creating...' : (selectedPlan !== 'Starter' && selectedPlan !== 'Free' ? 'Create & Continue to Payment' : 'Create Account')}
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );
}

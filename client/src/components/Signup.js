import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import api from '../api';
import { 
  Box, Button, TextField, Typography, Alert, Chip, Stack,
  ToggleButtonGroup, ToggleButton, FormControl, InputLabel, Select, MenuItem,
  Stepper, Step, StepLabel, Paper, CircularProgress, Card, CardContent,
  Grid, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';

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

// Plans data
const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '7-day trial',
    features: ['1 business', '1 review platform', '10 templates', 'Email support'],
    recommended: false,
  },
  {
    name: 'Pro',
    price: '£39',
    period: '/month',
    features: ['2 businesses', '2 platforms', 'Unlimited templates', 'AI generation', 'Priority support'],
    recommended: true,
  },
  {
    name: 'Pro Max',
    price: '£49',
    period: '/month',
    features: ['5 businesses', '3 platforms', 'Unlimited templates', 'Custom branding', 'Priority support'],
    recommended: false,
  },
];

export default function Signup() {
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (plan && PLANS.some(p => p.name === plan)) {
      setSelectedPlan(plan);
    }
    if (params.get('canceled') === 'true') {
      setError('Checkout was canceled. You can try again or choose a different plan.');
    }
  }, []);

  const steps = ['Account', 'Choose Plan', 'Business Type', 'Details'];

  const isOtherCategory = businessCategory === 'Other Business' || businessCategory === 'Other Freelancer';
  
  // Validation for each step
  const isValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password && password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const canProceedStep0 = isValidEmail && isValidPassword && passwordsMatch;
  const canProceedStep1 = selectedPlan;
  const canProceedStep2 = businessType && businessCategory && (!isOtherCategory || customDescription.trim().length >= 5);
  const canSubmit = canProceedStep0 && canProceedStep1 && canProceedStep2 && businessName;

  const handleNext = () => {
    setError(null);
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Create Supabase auth account
      console.log('Signing up with email:', email);
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ 
        email: String(email).trim(), 
        password: String(password),
        options: {
          // Disable email confirmation redirect - we'll handle it differently
          emailRedirectTo: window.location.origin + '/#/login',
          data: {
            // Store signup metadata to use after confirmation
            business_name: businessName,
            business_type: businessType,
            business_category: isOtherCategory ? customDescription.trim() : businessCategory,
            plan: selectedPlan
          }
        }
      });
      
      let session = signUpData?.session || null;
      const user = signUpData?.user || null;
      
      if (signUpErr) {
        console.error('Signup error:', signUpErr);
        // Check if user already exists
        if (signUpErr.message?.includes('already registered') || signUpErr.status === 400) {
          setError('An account with this email already exists. Please log in instead.');
          setLoading(false);
          return;
        } else {
          setError(signUpErr.message || 'Failed to create account. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Check if user was created but needs email confirmation
      // Supabase returns user with identities=[] if email confirmation is pending for an existing user
      // OR returns user with identities but no session if confirmation is required
      if (user && !session) {
        // Check if this is a new user needing confirmation or existing user
        if (user.identities && user.identities.length === 0) {
          // User already exists - they need to login
          setError('An account with this email already exists. Please log in instead.');
          setLoading(false);
          return;
        }
        
        // New user created but email confirmation is required
        // Redirect to success page with pending confirmation message
        console.log('User created, email confirmation required');
        window.location.hash = '#/signup-success?confirmation=pending&email=' + encodeURIComponent(email);
        return;
      }
      
      // If no session and no user, something went wrong
      if (!session && !user) {
        setError('Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      const accessToken = session?.access_token || null;
      if (!accessToken) {
        setError('Account created but could not get access token. Please try logging in.');
        setLoading(false);
        return;
      }

      // Store token
      try { 
        localStorage.setItem('supabase_access_token', accessToken); 
      } catch (e) {
        console.warn('Could not store token:', e);
      }
      
      // Set API authorization header
      if (api && api.defaults && api.defaults.headers) {
        api.defaults.headers.common = api.defaults.headers.common || {};
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }

      // Step 2: Call onboarding endpoint to create business
      try {
        const headers = { 'Authorization': `Bearer ${accessToken}` };
        const finalCategory = isOtherCategory ? customDescription.trim() : businessCategory;
        
        const onboardData = {
          business_name: businessName,
          business_type: businessType,
          business_category: finalCategory,
          plan: selectedPlan
        };
        
        console.log('Calling onboard with:', onboardData);
        
        const res = await api.post('/users/onboard', onboardData, { headers });
        const body = res?.data;
        
        console.log('Onboard response:', body);
        
        if (body && body.businessId) {
          // If paid plan, redirect to Stripe checkout
          if (selectedPlan && selectedPlan !== 'Starter' && selectedPlan !== 'Free') {
            try {
              console.log('Creating checkout session for plan:', selectedPlan);
              const checkout = await api.post('/payments/create-checkout-session', {
                plan: selectedPlan,
                email: String(email).trim(),
                businessId: body.businessId,
              }, { headers });
              
              if (checkout?.data?.url) {
                window.location.href = checkout.data.url;
                return;
              }
            } catch (checkoutErr) {
              console.warn('Failed to create checkout session:', checkoutErr);
              // Continue to dashboard even if checkout fails
            }
          }

          // Redirect to admin dashboard
          window.location.hash = `#/business/${body.businessId}/admin`;
          return;
        }
        
        setError('Account created but failed to set up business. Please try logging in.');
      } catch (onboardErr) {
        console.error('Onboarding failed:', onboardErr);
        setError('Account created but failed to complete setup. Please try logging in.');
      }

      setLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your account to get started
            </Typography>
            <TextField 
              fullWidth 
              label="Email Address" 
              type="email" 
              margin="normal" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              error={email && !isValidEmail}
              helperText={email && !isValidEmail ? 'Please enter a valid email' : ''}
              autoFocus
            />
            <TextField 
              fullWidth 
              label="Password" 
              type="password" 
              margin="normal" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              error={password && !isValidPassword}
              helperText={password && !isValidPassword ? 'Password must be at least 6 characters' : 'At least 6 characters'}
            />
            <TextField 
              fullWidth 
              label="Confirm Password" 
              type="password" 
              margin="normal" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required
              error={confirmPassword && !passwordsMatch}
              helperText={confirmPassword && !passwordsMatch ? 'Passwords do not match' : ''}
            />
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Choose the plan that's right for you
            </Typography>
            <Grid container spacing={2}>
              {PLANS.map((plan) => (
                <Grid item xs={12} md={4} key={plan.name}>
                  <Card 
                    variant={selectedPlan === plan.name ? 'elevation' : 'outlined'}
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedPlan === plan.name ? '2px solid' : '1px solid',
                      borderColor: selectedPlan === plan.name ? 'primary.main' : 'grey.300',
                      position: 'relative',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)',
                      }
                    }}
                    onClick={() => setSelectedPlan(plan.name)}
                  >
                    {plan.recommended && (
                      <Chip 
                        icon={<StarIcon sx={{ fontSize: 14 }} />}
                        label="Recommended" 
                        size="small" 
                        color="primary"
                        sx={{ 
                          position: 'absolute', 
                          top: -10, 
                          left: '50%', 
                          transform: 'translateX(-50%)',
                          fontSize: '0.7rem'
                        }} 
                      />
                    )}
                    <CardContent sx={{ textAlign: 'center', pt: plan.recommended ? 3 : 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {plan.name}
                      </Typography>
                      <Box sx={{ my: 1 }}>
                        <Typography variant="h4" component="span" fontWeight={700}>
                          {plan.price}
                        </Typography>
                        <Typography variant="body2" component="span" color="text.secondary">
                          {plan.period}
                        </Typography>
                      </Box>
                      <List dense sx={{ py: 0 }}>
                        {plan.features.map((feature, idx) => (
                          <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={feature} 
                              primaryTypographyProps={{ variant: 'body2', fontSize: '0.8rem' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                      {selectedPlan === plan.name && (
                        <Chip 
                          label="Selected" 
                          color="primary" 
                          size="small" 
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
              You can upgrade or change your plan anytime
            </Typography>
          </Box>
        );

      case 2:
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
                  setBusinessCategory('');
                  setCustomDescription('');
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
                  ? "e.g., Mobile dog groomer" 
                  : "e.g., Family bakery"}
                helperText="This helps AI generate better templates for you"
              />
            )}
          </Box>
        );

      case 3:
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
              autoFocus
            />
            
            <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                📋 Summary
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Email:</Typography>
                  <Typography variant="body2" fontWeight={500}>{email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Plan:</Typography>
                  <Chip label={selectedPlan} size="small" color="primary" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Type:</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {businessType === 'business' ? 'Business' : 'Freelancer'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Category:</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {isOtherCategory ? customDescription : businessCategory}
                  </Typography>
                </Box>
              </Stack>
              <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
                <Typography variant="caption">
                  ✨ AI will generate personalized review templates for your {businessName || 'business'}
                </Typography>
              </Alert>
            </Paper>
          </Box>
        );
      default:
        return null;
    }
  };

  // Determine if current step can proceed
  const canProceed = () => {
    switch (activeStep) {
      case 0: return canProceedStep0;
      case 1: return canProceedStep1;
      case 2: return canProceedStep2;
      case 3: return canSubmit;
      default: return false;
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>Create Your Account</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Get started with Review-Help in just a few steps
      </Typography>
      
      {error && (
        <Alert 
          severity={error.includes('created') ? 'success' : 'error'} 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label} completed={activeStep > index}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          {renderStepContent(activeStep)}
        </Paper>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            disabled={activeStep === 0 || loading} 
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          {activeStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Continue
            </Button>
          ) : (
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || !canSubmit}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ minWidth: 180 }}
            >
              {loading ? 'Creating Account...' : (
                selectedPlan !== 'Starter' ? 'Create & Continue to Payment' : 'Create Account'
              )}
            </Button>
          )}
        </Box>
      </form>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        Already have an account?{' '}
        <Button 
          variant="text" 
          size="small" 
          onClick={() => window.location.hash = '#/login'}
          sx={{ textTransform: 'none' }}
        >
          Log in
        </Button>
      </Typography>
    </Box>
  );
}

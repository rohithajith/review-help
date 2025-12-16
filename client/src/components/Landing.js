import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  TextField,
  Chip,
  Avatar,
  Fade,
} from '@mui/material';
import {
  Star,
  QrCode2,
  ContentCopy,
  RateReview,
  AutoAwesome,
  Speed,
  Security,
  TrendingUp,
  CheckCircle,
  ArrowForward,
  PlayArrow,
  Restaurant,
  Spa,
  Store,
  LocalCafe,
  Phone,
  Email,
} from '@mui/icons-material';

// Hero Section
function HeroSection() {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #10b981 100%)',
        color: 'white',
        py: { xs: 8, md: 12 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }}
      />

      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Fade in timeout={800}>
              <Box>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '2.2rem', md: '3.2rem' },
                    lineHeight: 1.2,
                    mb: 3,
                  }}
                >
                  Get More{' '}
                  <Box component="span" sx={{ color: '#34d399' }}>
                    5-Star Reviews
                  </Box>{' '}
                  Without the Hassle
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    opacity: 0.9,
                    fontWeight: 400,
                    mb: 4,
                    lineHeight: 1.6,
                  }}
                >
                  Help customers leave authentic Google reviews in seconds.
                  No fake reviews. No automation. Just simple templates they can
                  copy and personalize.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => (window.location.hash = '#/signup')}
                    sx={{
                      bgcolor: '#10b981',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#059669' },
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrow />}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: 'white',
                      px: 3,
                      py: 1.5,
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    See How It Works
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, mt: 4, flexWrap: 'wrap' }}>
                  {['No credit card required', '7-day free trial', 'Cancel anytime'].map((text) => (
                    <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 18, color: '#34d399' }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Fade>
          </Grid>
          <Grid item xs={12} md={6}>
            <Fade in timeout={1200}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {/* Mock phone with app preview */}
                <Paper
                  elevation={20}
                  sx={{
                    width: 280,
                    height: 500,
                    borderRadius: 6,
                    overflow: 'hidden',
                    bgcolor: '#f8f9fa',
                    border: '8px solid #1a1a1a',
                    position: 'relative',
                  }}
                >
                  {/* Phone notch */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 100,
                      height: 24,
                      bgcolor: '#1a1a1a',
                      borderRadius: '0 0 12px 12px',
                      zIndex: 10,
                    }}
                  />
                  {/* App content */}
                  <Box sx={{ p: 2, pt: 5 }}>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: '#10b981', width: 48, height: 48, mx: 'auto', mb: 1 }}>
                        <Restaurant />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e3c72' }}>
                        Joe's Restaurant
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pick a review template
                      </Typography>
                    </Box>
                    {/* Template cards */}
                    {[
                      'Great food and friendly staff — highly recommend!',
                      'Amazing flavors and great portions. We\'ll be back!',
                      'The service was quick and dishes delicious. ⭐⭐⭐⭐⭐',
                    ].map((text, i) => (
                      <Paper
                        key={i}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          bgcolor: i === 0 ? '#e8f5e9' : 'white',
                          border: i === 0 ? '2px solid #10b981' : '1px solid #eee',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>
                          {text}
                        </Typography>
                      </Paper>
                    ))}
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                      sx={{
                        mt: 1,
                        bgcolor: '#10b981',
                        fontSize: '0.75rem',
                        py: 1,
                      }}
                    >
                      Copy & Leave Review
                    </Button>
                  </Box>
                </Paper>
                {/* Floating stats */}
                <Paper
                  elevation={10}
                  sx={{
                    position: 'absolute',
                    top: 40,
                    right: -20,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'white',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp sx={{ color: '#10b981' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        +127%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        More reviews
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
                <Paper
                  elevation={10}
                  sx={{
                    position: 'absolute',
                    bottom: 60,
                    left: -30,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'white',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} sx={{ color: '#fbbf24', fontSize: 16 }} />
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    4.9 avg rating
                  </Typography>
                </Paper>
              </Box>
            </Fade>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

// Problem & Solution Section
function ProblemSolutionSection() {
  const problems = [
    { icon: '😓', title: 'Customers forget to leave reviews', desc: 'Even happy customers rarely take the time to write a review' },
    { icon: '⏰', title: 'No time to ask for reviews', desc: 'You\'re busy running your business, not chasing reviews' },
    { icon: '✍️', title: 'Customers don\'t know what to write', desc: 'Blank review boxes lead to abandoned reviews' },
    { icon: '📉', title: 'Inconsistent review flow', desc: 'Reviews come in bursts, then nothing for months' },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#f8f9fa' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, mb: 2, color: '#1e3c72' }}
          >
            Sound Familiar?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Most local businesses struggle to get consistent reviews. Here's why...
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 6, justifyContent: 'center' }}>
          {problems.map((p, i) => (
            <Grid item xs={12} sm={6} md={3} key={i} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'center',
                  bgcolor: 'white',
                  border: '1px solid #eee',
                  borderRadius: 3,
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: '#ef4444',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 3 }}>
                  <Typography variant="h2" sx={{ mb: 2, fontSize: '3rem' }}>
                    {p.icon}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, minHeight: 48 }}>
                    {p.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Solution */}
        <Paper
          sx={{
            p: { xs: 4, md: 6 },
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            color: 'white',
            borderRadius: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            There's a Better Way ✨
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 700, mx: 'auto', mb: 4 }}>
            Review-Help gives your customers ready-made templates they can copy in one tap.
            No thinking, no typing, just genuine reviews in seconds.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => (window.location.hash = '#/signup')}
            sx={{
              bgcolor: '#10b981',
              px: 4,
              py: 1.5,
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            See It In Action
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      icon: <QrCode2 sx={{ fontSize: 48 }} />,
      title: 'Share Your QR Code',
      desc: 'Print or display your unique QR code at checkout, on receipts, or on table tents.',
    },
    {
      icon: <RateReview sx={{ fontSize: 48 }} />,
      title: 'Customer Picks a Template',
      desc: 'They see 10 ready-made review templates. Pick one, edit if they want.',
    },
    {
      icon: <ContentCopy sx={{ fontSize: 48 }} />,
      title: 'Copy & Paste to Google',
      desc: 'One tap copies the text. Google Reviews opens. They paste and submit.',
    },
    {
      icon: <AutoAwesome sx={{ fontSize: 48 }} />,
      title: 'Endless Fresh Templates',
      desc: 'AI generates new templates continuously as old ones get used — your review page never runs dry.',
    },
  ];

  return (
    <Box id="how-it-works" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Chip label="Simple Process" color="primary" sx={{ mb: 2 }} />
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#1e3c72' }}>
            How It Works
          </Typography>
          <Typography variant="h6" color="text.secondary">
            From scan to 5-star review in under 30 seconds
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
          {steps.map((step, i) => (
            <Grid item xs={12} sm={6} md={3} key={i} sx={{ display: 'flex' }}>
              <Box sx={{ textAlign: 'center', position: 'relative', width: '100%' }}>
                {/* Step number */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: '#10b981',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    zIndex: 1,
                  }}
                >
                  {i + 1}
                </Box>
                <Paper
                  sx={{
                    p: 4,
                    pt: 5,
                    height: '100%',
                    minHeight: 220,
                    borderRadius: 3,
                    border: '2px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: '#10b981',
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(16, 185, 129, 0.15)',
                    },
                  }}
                >
                  <Box sx={{ color: '#10b981', mb: 2 }}>{step.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, minHeight: 32 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    {step.desc}
                  </Typography>
                </Paper>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

// Benefits Section
function BenefitsSection() {
  const benefits = [
    {
      icon: <TrendingUp />,
      title: 'Get More Reviews',
      desc: 'Businesses using Review-Help see an average of 127% more reviews in the first month.',
    },
    {
      icon: <Speed />,
      title: 'Save Hours Every Week',
      desc: 'No more manually asking customers. The QR code does the work for you.',
    },
    {
      icon: <AutoAwesome />,
      title: 'Endless AI Templates',
      desc: 'AI continuously generates fresh templates as old ones get used — you never run out of reviews.',
    },
    {
      icon: <Security />,
      title: '100% Compliant',
      desc: 'Every review is genuine, manual, and fully compliant with Google\'s policies.',
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#f8f9fa' }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Chip label="Why Choose Us" color="primary" sx={{ mb: 2 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, color: '#1e3c72' }}>
              Everything You Need to Grow Your Reviews
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {benefits.map((b, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#e8f5e9', color: '#10b981' }}>{b.icon}</Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {b.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {b.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 4,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #1e3c72 0%, #10b981 100%)',
                color: 'white',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Perfect For
              </Typography>
              <Grid container spacing={2}>
                {[
                  { icon: <Restaurant />, label: 'Restaurants' },
                  { icon: <Spa />, label: 'Salons & Spas' },
                  { icon: <Store />, label: 'Retail Shops' },
                  { icon: <LocalCafe />, label: 'Cafés & Bars' },
                  { icon: <Speed />, label: 'TaskRabbit Pros' },
                  { icon: <TrendingUp />, label: 'Freelancers' },
                ].map((item, i) => (
                  <Grid item xs={6} key={i}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        borderRadius: 2,
                      }}
                    >
                      {item.icon}
                      <Typography variant="body2">{item.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  ✨ Also great for SkillDigger, StarOfService & more
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      period: '7-day trial',
      desc: 'Perfect for trying out',
      features: ['1 business', '1 review platform', '10 active templates', 'Basic analytics', 'Email support'],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Pro',
      price: '£39',
      period: '/month',
      desc: 'For growing businesses',
      features: [
        '2 businesses',
        '2 review platforms (e.g. Google + JustEat)',
        'Unlimited templates',
        'AI template generation',
        'Advanced analytics',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Pro Max',
      price: '£49',
      period: '/month',
      desc: 'For multi-location businesses',
      features: [
        '5 businesses',
        '3 review platforms',
        'Unlimited templates',
        'AI template generation',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For large organizations',
      features: [
        'Unlimited businesses',
        'Unlimited platforms',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        'API access',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <Box id="pricing" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Chip label="Pricing" color="primary" sx={{ mb: 2 }} />
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#1e3c72' }}>
            Simple, Transparent Pricing
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Start free, upgrade when you're ready
          </Typography>
        </Box>

        <Grid container spacing={3} justifyContent="center">
          {plans.map((plan, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  border: plan.popular ? '2px solid #10b981' : '1px solid #eee',
                  borderRadius: 3,
                  overflow: 'visible',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 16px 32px rgba(0,0,0,0.1)',
                  },
                }}
              >
                {plan.popular && (
                  <Chip
                    label="Most Popular"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: '#10b981',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                )}
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {plan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {plan.desc}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {plan.price}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {plan.period}
                    </Typography>
                  </Box>
                  <Button
                    fullWidth
                    variant={plan.popular ? 'contained' : 'outlined'}
                    size="large"
                    onClick={() =>
                      plan.name === 'Enterprise'
                        ? document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
                        : (window.location.hash = '#/signup')
                    }
                    sx={{
                      mb: 3,
                      py: 1.5,
                      ...(plan.popular && {
                        bgcolor: '#10b981',
                        '&:hover': { bgcolor: '#059669' },
                      }),
                    }}
                  >
                    {plan.cta}
                  </Button>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {plan.features.map((f, j) => (
                      <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ fontSize: 18, color: '#10b981' }} />
                        <Typography variant="body2">{f}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

// Contact Section
function ContactSection() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, send to backend
    setSubmitted(true);
  };

  return (
    <Box id="contact" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#f8f9fa' }}>
      <Container maxWidth="lg">
        <Grid container spacing={6}>
          <Grid item xs={12} md={6}>
            <Chip label="Get in Touch" color="primary" sx={{ mb: 2 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#1e3c72' }}>
              Ready to Grow Your Reviews?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Have questions? Want a demo? Our team is here to help you get started.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#e8f5e9', color: '#10b981' }}>
                  <Phone />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Call us
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    +44 7423 077940
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#e8f5e9', color: '#10b981' }}>
                  <Email />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email us
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    info@reviewhelp.uk
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 3 }}>
              {submitted ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Message Sent!
                  </Typography>
                  <Typography color="text.secondary">
                    We'll get back to you within 24 hours.
                  </Typography>
                </Box>
              ) : (
                <form onSubmit={handleSubmit}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Send us a message
                  </Typography>
                  <TextField
                    fullWidth
                    label="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    sx={{ mb: 2 }}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    sx={{ mb: 2 }}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Message"
                    multiline
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    sx={{ mb: 3 }}
                    required
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: '#10b981',
                      py: 1.5,
                      '&:hover': { bgcolor: '#059669' },
                    }}
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

// Final CTA Section
function CTASection() {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 10 },
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        textAlign: 'center',
      }}
    >
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Start Getting More Reviews Today
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
          Try free for 7 days — no credit card required
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => (window.location.hash = '#/signup')}
            sx={{
              bgcolor: '#10b981',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            Start Your Free Trial
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            sx={{
              borderColor: 'rgba(255,255,255,0.5)',
              color: 'white',
              px: 4,
              py: 1.5,
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            Contact Sales
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

// Main Landing Component
export default function Landing() {
  return (
    <Box>
      <HeroSection />
      <ProblemSolutionSection />
      <HowItWorksSection />
      <BenefitsSection />
      <PricingSection />
      <ContactSection />
      <CTASection />
    </Box>
  );
}

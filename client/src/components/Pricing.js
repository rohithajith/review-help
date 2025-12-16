import React from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  Chip,
  Stack,
} from '@mui/material';

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      bullets: ['7-day trial', '1 business', '1 review platform', '10 active templates', 'Basic analytics', 'Email support'],
      tone: 'default',
    },
    {
      name: 'Pro',
      price: '£39',
      bullets: ['2 businesses', '2 review platforms (e.g. Google + JustEat)', 'Unlimited templates', 'AI template generation', 'Advanced analytics', 'Priority support'],
      tone: 'highlight',
      badge: 'Most popular',
    },
    {
      name: 'Pro Max',
      price: '£49',
      bullets: ['5 businesses', '3 review platforms', 'Unlimited templates', 'AI template generation', 'Advanced analytics', 'Priority support', 'Custom branding'],
      tone: 'default',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      bullets: ['Unlimited businesses', 'Unlimited platforms', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'API access'],
      tone: 'outline',
    },
  ];

  return (
    <Box sx={{ py: { xs: 6, md: 10 }, minHeight: '70vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Pricing</Typography>
            <Typography color="text.secondary">Simple, transparent pricing that scales with your business.</Typography>
          </Box>
        </Stack>

        <Grid container spacing={4} alignItems="stretch">
          {plans.map((p) => (
            <Grid item xs={12} md={4} key={p.name}>
              <Card
                elevation={p.tone === 'highlight' ? 8 : 2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: p.tone === 'outline' ? '1px solid' : undefined,
                  borderColor: p.tone === 'outline' ? 'grey.300' : undefined,
                  background: p.tone === 'highlight' ? 'linear-gradient(135deg, #6EE7B7 0%, #3B82F6 100%)' : undefined,
                  color: p.tone === 'highlight' ? 'common.white' : undefined,
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                    {p.badge && (
                      <Chip label={p.badge} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: p.tone === 'highlight' ? 'common.white' : undefined }} />
                    )}
                  </Stack>

                  <Typography variant="h3" sx={{ my: 2, fontWeight: 800 }}>{p.price}</Typography>

                  <List sx={{ pl: 2 }}>
                    {p.bullets.map((b) => (
                      <ListItem key={b} sx={{ py: 0.5 }}>
                        <Typography variant="body2" sx={{ color: p.tone === 'highlight' ? 'rgba(255,255,255,0.95)' : 'text.primary' }}>{b}</Typography>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions sx={{ p: 3 }}>
                  <Button
                    fullWidth
                    variant={p.tone === 'outline' ? 'outlined' : 'contained'}
                    color={p.tone === 'highlight' ? 'primary' : 'primary'}
                    onClick={() => { window.location.hash = `#/signup?plan=${encodeURIComponent(p.name)}`; }}
                    sx={{
                      ...(p.tone === 'highlight' && { bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white' }),
                    }}
                  >
                    Choose
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

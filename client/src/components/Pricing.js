import React from 'react';
import { Container, Box, Typography, Grid, Paper, Button } from '@mui/material';

export default function Pricing() {
  const plans = [
    { name: 'Free', price: 'Free', bullets: ['Up to 1 business', 'Basic templates', 'Community support'] },
    { name: 'Pro', price: '£12/mo', bullets: ['Unlimited businesses', 'AI regeneration', 'Priority email support'] },
    { name: 'Enterprise', price: 'Contact us', bullets: ['SLA & onboarding', 'Custom integrations', 'Dedicated support'] },
  ];

  return (
    <Box sx={{ py: 6, minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>Pricing</Typography>
        <Grid container spacing={3}>
          {plans.map((p) => (
            <Grid item xs={12} md={4} key={p.name}>
              <Paper sx={{ p: 3 }} elevation={2}>
                <Typography variant="h6">{p.name}</Typography>
                <Typography variant="h4" sx={{ my: 2 }}>{p.price}</Typography>
                <ul>
                  {p.bullets.map((b) => <li key={b}><Typography variant="body2">{b}</Typography></li>)}
                </ul>
                <Button variant="contained" onClick={() => window.location.hash = '#/signup'}>Choose</Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

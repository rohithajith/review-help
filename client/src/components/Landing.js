import React from 'react';
import { Container, Box, Typography, Paper, Button } from '@mui/material';

export default function Landing() {
  return (
    <Box sx={{ py: 6, bgcolor: 'background.default', minHeight: '80vh' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }} elevation={3}>
          <Typography variant="h3" gutterBottom>Simple Review Templates</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Generate and manage short review templates for your business. Share a template page with customers, collect great reviews, and keep templates fresh with AI-powered regeneration.
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>For small restaurants and local businesses</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>Fast, lightweight, no vendor lock-in. Manage templates, invite owners, and share a customer-facing link.</Typography>
          <Button variant="contained" color="primary" onClick={() => window.location.hash = '#/signup'}>Get Started</Button>
          <Button variant="text" sx={{ ml: 2 }} onClick={() => window.location.hash = '#/pricing'}>See Pricing</Button>
        </Paper>
      </Container>
    </Box>
  );
}

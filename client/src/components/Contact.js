import React from 'react';
import { Container, Box, Typography, Paper, Link } from '@mui/material';

export default function Contact() {
  return (
    <Box sx={{ py: 6, minHeight: '70vh' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }} elevation={2}>
          <Typography variant="h4" gutterBottom>Contact</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            We're happy to help. Reach out via phone or email and we'll get back to you.
          </Typography>
          <Typography variant="h6">Phone</Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>+44 7423 077940</Typography>
          <Typography variant="h6">Email</Typography>
          <Link href="mailto:rohithajith2405@gmail.com">rohithajith2405@gmail.com</Link>
        </Paper>
      </Container>
    </Box>
  );
}

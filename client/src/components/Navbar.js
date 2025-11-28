import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

export default function NavBar() {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => window.location.hash = '#/'}>
          Review App
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button color="inherit" onClick={() => window.location.hash = '#/pricing'}>Pricing</Button>
          <Button color="inherit" onClick={() => window.location.hash = '#/contact'}>Contact</Button>
          <Button color="inherit" onClick={() => window.location.hash = '#/login'}>Login</Button>
          <Button color="inherit" onClick={() => window.location.hash = '#/signup'}>Sign Up</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
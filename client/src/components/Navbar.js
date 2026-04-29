import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export default function NavBar() {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const isMobileMenuOpen = Boolean(mobileMenuAnchor);
  const navItems = [
    { label: 'Pricing', hash: '#/pricing' },
    { label: 'Contact', hash: '#/contact' },
    { label: 'Login', hash: '#/login' },
    { label: 'Sign Up', hash: '#/signup' },
  ];

  const navigateTo = (hash) => {
    window.location.hash = hash;
    setMobileMenuAnchor(null);
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigateTo('#/')}>
          Review-Help
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {navItems.map((item) => (
            <Button key={item.label} color="inherit" onClick={() => navigateTo(item.hash)}>
              {item.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            aria-label="open menu"
            onClick={(event) => setMobileMenuAnchor(event.currentTarget)}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            anchorEl={mobileMenuAnchor}
            open={isMobileMenuOpen}
            onClose={() => setMobileMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {navItems.map((item) => (
              <MenuItem key={item.label} onClick={() => navigateTo(item.hash)}>
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

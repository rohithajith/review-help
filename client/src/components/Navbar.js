import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Button, Box, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, useMediaQuery, useTheme, Typography } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Listen for scroll events
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Pricing', path: '#/pricing' },
    { label: 'Contact', path: '#/contact' },
    { label: 'Login', path: '#/login' },
    { label: 'Sign Up', path: '#/signup' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path) => {
    window.location.hash = path;
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 250, pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, mb: 2 }}>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton onClick={() => handleNavClick(item.path)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="fixed" 
        color="primary"
        sx={{
          transition: 'all 0.3s ease-in-out',
          boxShadow: scrolled ? '0 2px 10px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              height: 48,
              gap: 1.5,
              overflow: 'hidden',
            }} 
            onClick={() => window.location.hash = '#/'}
          >
            <img 
              src="/logo.png" 
              alt="Review-Help" 
              style={{ 
                height: '40px', 
                width: 'auto',
                objectFit: 'contain',
                flexShrink: 0,
              }} 
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'white',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease-in-out',
                opacity: scrolled ? 0 : 1,
                width: scrolled ? 0 : 'auto',
                marginLeft: scrolled ? -1.5 : 0,
                overflow: 'hidden',
              }}
            >
              Review-Help
            </Typography>
          </Box>
          
          {isMobile ? (
            <IconButton
              color="inherit"
              aria-label="open menu"
              edge="end"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {navItems.map((item) => (
                <Button 
                  key={item.label}
                  color="inherit" 
                  onClick={() => handleNavClick(item.path)}
                  sx={{
                    fontWeight: item.label === 'Sign Up' ? 600 : 400,
                    bgcolor: item.label === 'Sign Up' ? 'rgba(16, 185, 129, 0.9)' : 'transparent',
                    '&:hover': {
                      bgcolor: item.label === 'Sign Up' ? 'rgba(16, 185, 129, 1)' : 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Spacer to prevent content from going under fixed navbar */}
      <Toolbar />
      
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
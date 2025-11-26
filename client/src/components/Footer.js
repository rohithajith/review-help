import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const Footer = () => (
  <Box
    component="footer"
    sx={{
      bgcolor: 'background.paper',
      py: 3,
      mt: 4,
      borderTop: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Container maxWidth="lg">
      <Typography variant="body2" color="text.secondary" align="center">
        © {new Date().getFullYear()} Review Templates. All rights reserved.
      </Typography>
    </Container>
  </Box>
);

export default Footer;
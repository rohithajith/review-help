import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => (
  <footer className="text-center py-3">
    <Container>
      <small>© {new Date().getFullYear()} Review Templates. All rights reserved.</small>
    </Container>
  </footer>
);

export default Footer;
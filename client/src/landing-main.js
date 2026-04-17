import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import './index.css';
import Landing from './components/Landing';

async function clearLegacyServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (!registrations || registrations.length === 0) return;

    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window && typeof window.caches.keys === 'function') {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    }

    if (window.sessionStorage.getItem('legacy-sw-cleared') !== '1') {
      window.sessionStorage.setItem('legacy-sw-cleared', '1');
      window.location.reload();
    }
  } catch (_error) {
    // Ignore cleanup failures.
  }
}

clearLegacyServiceWorkers();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Landing />
    </ThemeProvider>
  </React.StrictMode>
);

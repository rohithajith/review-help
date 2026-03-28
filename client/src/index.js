import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

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

    // Reload once so the page is served without stale SW-controlled assets.
    if (window.sessionStorage.getItem('legacy-sw-cleared') !== '1') {
      window.sessionStorage.setItem('legacy-sw-cleared', '1');
      window.location.reload();
    }
  } catch (error) {
    // Ignore cleanup failures; app should still be usable.
  }
}

clearLegacyServiceWorkers();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

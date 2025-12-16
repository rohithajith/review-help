let axios;
try {
  // require inside try so Jest won't choke on ESM-only axios during test parsing
  // in some environments. If axios can't be required, we'll fall back to a
  // minimal fetch-based client for tests.
  // eslint-disable-next-line global-require
  axios = require('axios');
} catch (e) {
  axios = null;
}

// Force API prefix for all requests in the client. This ensures the
// dev-server proxy (`/api`) is used when REACT_APP_API_URL is not set.
const envApiUrl = typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.trim() : '';
export const apiBase = envApiUrl || '/api';

let api;
// In test environments prefer the fetch-based fallback to avoid issues
// with ESM-only axios builds in the test runner.
if (process.env.NODE_ENV === 'test') {
  axios = null;
}

if (axios && typeof axios.create === 'function') {
  api = axios.create({ baseURL: apiBase });

  // Add request interceptor to include auth token from localStorage
  if (api.interceptors && api.interceptors.request) {
    api.interceptors.request.use((config) => {
      try {
        const token = localStorage.getItem('supabase_access_token');
        if (token) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        // localStorage may not be available
      }
      return config;
    });
  }

  // Helpful logging for failed requests to aid debugging in development.
  if (process.env.NODE_ENV !== 'production' && api.interceptors && api.interceptors.response) {
    api.interceptors.response.use(
      (res) => res,
      (err) => {
        try {
          const config = err.config || {};
          const method = (config.method || 'GET').toUpperCase();
          const url = config.baseURL ? (config.baseURL + (config.url || '')) : (config.url || '');
          if (err.response) {
            console.error(`[API ERROR] ${method} ${url} -> ${err.response.status}`, err.response.data);
          } else {
            console.error(`[API ERROR] ${method} ${url} ->`, err.message || err);
          }
          // attempt to send client error to backend for diagnostics (non-blocking)
          try {
            const payload = {
              level: 'error',
              message: err && err.message ? err.message : 'Unknown API error',
              url: url,
              method,
              status: err.response && err.response.status ? err.response.status : null,
              data: err.response && err.response.data ? err.response.data : undefined,
              stack: err && err.stack ? err.stack : undefined,
              ua: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : null
            };
            // fire-and-forget
            try { fetch(`${apiBase}/_client-log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) { /* ignore */ }
          } catch (e) { /* ignore */ }
        } catch (loggingErr) {
          console.error('Error logging API failure', loggingErr);
        }
        return Promise.reject(err);
      }
    );
  }
} else {
  // Fallback minimal client using fetch so tests and environments without
  // axios can still exercise code paths that call api.get/post/etc.
  const makeUrl = (u) => (u && u.startsWith('http') ? u : `${apiBase}${u}`);
  api = {
    async _sendClientLog(payload) {
      try {
        await fetch(`${apiBase}/_client-log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch (e) {
        // ignore logging failures
      }
    },
      async get(u) {
        try {
          const res = await fetch(makeUrl(u));
          const contentType = res && res.headers && typeof res.headers.get === 'function' ? (res.headers.get('content-type') || '') : '';
          const looksLikeJson = contentType.includes('application/json');
          if (looksLikeJson) {
            try {
              return { data: await res.json(), status: res.status };
            } catch (e) {
              const text = await res.text();
              console.warn('API.get: failed to parse JSON, returning raw text', { url: makeUrl(u), status: res.status, contentType });
              return { data: text, status: res.status };
            }
          }
          return { data: await res.text(), status: res.status };
        } catch (err) {
          try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'GET' }); } catch (e) {}
          throw err;
        }
      },
    async post(u, body) {
      try {
        const res = await fetch(makeUrl(u), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const contentType = res && res.headers && typeof res.headers.get === 'function' ? (res.headers.get('content-type') || '') : '';
        const looksLikeJson = contentType.includes('application/json');
        if (looksLikeJson) {
          try {
            return { data: await res.json(), status: res.status };
          } catch (e) {
            const text = await res.text();
            console.warn('API.post: failed to parse JSON, returning raw text', { url: makeUrl(u), status: res.status, contentType });
            return { data: text, status: res.status };
          }
        }
        return { data: await res.text(), status: res.status };
      } catch (err) {
        try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'POST', body }); } catch (e) {}
        throw err;
      }
    },
    async put(u, body) {
      try {
        const res = await fetch(makeUrl(u), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const contentType = res && res.headers && typeof res.headers.get === 'function' ? (res.headers.get('content-type') || '') : '';
        const looksLikeJson = contentType.includes('application/json');
        if (looksLikeJson) {
          try {
            return { data: await res.json(), status: res.status };
          } catch (e) {
            const text = await res.text();
            console.warn('API.put: failed to parse JSON, returning raw text', { url: makeUrl(u), status: res.status, contentType });
            return { data: text, status: res.status };
          }
        }
        return { data: await res.text(), status: res.status };
      } catch (err) {
        try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'PUT', body }); } catch (e) {}
        throw err;
      }
    },
    async delete(u, opts = {}) {
      const init = { method: 'DELETE' };
      if (opts.data) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(opts.data);
      }
      try {
        const res = await fetch(makeUrl(u), init);
        const contentType = res && res.headers && typeof res.headers.get === 'function' ? (res.headers.get('content-type') || '') : '';
        const looksLikeJson = contentType.includes('application/json');
        if (looksLikeJson) {
          try {
            return { data: await res.json(), status: res.status };
          } catch (e) {
            const text = await res.text();
            console.warn('API.delete: failed to parse JSON, returning raw text', { url: makeUrl(u), status: res.status, contentType });
            return { data: text, status: res.status };
          }
        }
        return { data: await res.text(), status: res.status };
      } catch (err) {
        try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'DELETE', body: opts.data }); } catch (e) {}
        throw err;
      }
    }
  };
}

export default api;

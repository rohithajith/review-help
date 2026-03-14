import axios from 'axios';
import supabase from './lib/supabaseClient';

const metaEnv = (typeof import.meta !== 'undefined' && import.meta && import.meta.env)
  ? import.meta.env
  : {};
const nodeEnv = (typeof process !== 'undefined' && process && process.env)
  ? process.env
  : {};
const mode = String(metaEnv.MODE || nodeEnv.NODE_ENV || 'development').toLowerCase();
const isTestEnv = mode === 'test';
const isProdEnv = metaEnv.PROD === true || mode === 'production';

// Force API prefix for all requests in the client. This ensures the
// dev-server proxy (`/api`) is used when REACT_APP_API_URL is not set.
const envApiUrl = String(
  metaEnv.REACT_APP_API_URL
  || metaEnv.VITE_API_URL
  || nodeEnv.REACT_APP_API_URL
  || ''
).trim();
export const apiBase = envApiUrl || '/api';

let api;
const getSupabaseAccessToken = async () => {
  try {
    if (!supabase || !supabase.auth || typeof supabase.auth.getSession !== 'function') return null;
    const { data } = await supabase.auth.getSession();
    return data && data.session ? (data.session.access_token || null) : null;
  } catch (e) {
    return null;
  }
};
// In test environments prefer the fetch-based fallback for easier mocking.
const axiosClient = isTestEnv ? null : axios;

if (axiosClient && typeof axiosClient.create === 'function') {
  api = axiosClient.create({ baseURL: apiBase });

  // Add request interceptor to include auth token from current Supabase session
  if (api.interceptors && api.interceptors.request) {
    api.interceptors.request.use(async (config) => {
      const existingAuth = config && config.headers && (config.headers['Authorization'] || config.headers['authorization']);
      if (!existingAuth) {
        const token = await getSupabaseAccessToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return config;
    });
  }

  // Helpful logging for failed requests to aid debugging in development.
  if (!isProdEnv && api.interceptors && api.interceptors.response) {
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
  const withAuthHeaders = async (headers = {}) => {
    const token = await getSupabaseAccessToken();
    if (!token) return headers;
    return { ...headers, Authorization: `Bearer ${token}` };
  };
  const parseFetchResponse = async (res, method, url) => {
    const contentType = res && res.headers && typeof res.headers.get === 'function'
      ? (res.headers.get('content-type') || '')
      : '';
    const hasJson = res && typeof res.json === 'function';
    const hasText = res && typeof res.text === 'function';
    const looksLikeJson = contentType.includes('application/json') || (!contentType && hasJson);

    if (looksLikeJson && hasJson) {
      try {
        return { data: await res.json(), status: res.status };
      } catch (e) {
        if (hasText) {
          const text = await res.text();
          console.warn(`API.${method}: failed to parse JSON, returning raw text`, { url, status: res.status, contentType });
          return { data: text, status: res.status };
        }
        return { data: null, status: res.status };
      }
    }

    if (hasText) return { data: await res.text(), status: res.status };
    if (hasJson) return { data: await res.json(), status: res.status };
    return { data: null, status: res.status };
  };
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
        const headers = await withAuthHeaders();
        const res = await fetch(makeUrl(u), { headers });
        return parseFetchResponse(res, 'get', makeUrl(u));
      } catch (err) {
        try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'GET' }); } catch (e) {}
        throw err;
      }
    },
    async post(u, body) {
      try {
        const headers = await withAuthHeaders({ 'Content-Type': 'application/json' });
        const res = await fetch(makeUrl(u), { method: 'POST', headers, body: JSON.stringify(body) });
        return parseFetchResponse(res, 'post', makeUrl(u));
      } catch (err) {
        try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'POST', body }); } catch (e) {}
        throw err;
      }
    },
    async put(u, body) {
      try {
        const headers = await withAuthHeaders({ 'Content-Type': 'application/json' });
        const res = await fetch(makeUrl(u), { method: 'PUT', headers, body: JSON.stringify(body) });
        return parseFetchResponse(res, 'put', makeUrl(u));
      } catch (err) {
        try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'PUT', body }); } catch (e) {}
        throw err;
      }
    },
    async delete(u, opts = {}) {
      const init = { method: 'DELETE' };
      init.headers = await withAuthHeaders();
      if (opts.data) {
        init.headers = await withAuthHeaders({ 'Content-Type': 'application/json' });
        init.body = JSON.stringify(opts.data);
      }
      try {
        const res = await fetch(makeUrl(u), init);
        return parseFetchResponse(res, 'delete', makeUrl(u));
      } catch (err) {
        try { await api._sendClientLog({ message: err && err.message, stack: err && err.stack, url: makeUrl(u), method: 'DELETE', body: opts.data }); } catch (e) {}
        throw err;
      }
    }
  };
}

export default api;

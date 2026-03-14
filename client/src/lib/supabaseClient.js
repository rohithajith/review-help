import { createClient } from '@supabase/supabase-js';

// Supabase client for the frontend. Requires the following env vars to be set
// in the React app build/runtime: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
const metaEnv = (typeof import.meta !== 'undefined' && import.meta && import.meta.env)
  ? import.meta.env
  : {};
const nodeEnv = (typeof process !== 'undefined' && process && process.env)
  ? process.env
  : {};
const SUPABASE_URL = (
  metaEnv.REACT_APP_SUPABASE_URL
  || metaEnv.VITE_SUPABASE_URL
  || nodeEnv.REACT_APP_SUPABASE_URL
  || ''
);
const SUPABASE_ANON_KEY = (
  metaEnv.REACT_APP_SUPABASE_ANON_KEY
  || metaEnv.VITE_SUPABASE_ANON_KEY
  || nodeEnv.REACT_APP_SUPABASE_ANON_KEY
  || ''
);

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase: REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY is not set. Login will not work.');
  // Create a mock supabase client to prevent crashes
  supabase = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      setSession: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      updateUser: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export default supabase;

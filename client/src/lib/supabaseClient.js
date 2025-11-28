import { createClient } from '@supabase/supabase-js';

// Supabase client for the frontend. Requires the following env vars to be set
// in the React app build/runtime: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase: REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY is not set. Login will not work.');
  // Create a mock supabase client to prevent crashes
  supabase = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export default supabase;

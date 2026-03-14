const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.ADMIN_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

function unavailableResult() {
  return {
    data: null,
    error: { message: 'Supabase server client is not configured' },
  };
}

function createUnavailableClient() {
  return {
    auth: {
      getUser: async () => unavailableResult(),
      admin: {
        createUser: async () => unavailableResult(),
      },
    },
  };
}

const supabase = (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  ? createUnavailableClient()
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // keep server-side behavior
    },
  });

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Do not crash process at require-time; auth middleware will fail requests gracefully.
  console.warn('supabaseClient: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — auth routes will return 500/401 until configured');
}

module.exports = supabase;

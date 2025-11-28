const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.ADMIN_SUPABASE_URL || process.env.ADMIN_DATABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // We don't throw here because the app can still run read-only DB calls via pool.
  console.warn('supabaseClient: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — auth middleware may not work');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    // keep server-side behavior
  }
});

module.exports = supabase;

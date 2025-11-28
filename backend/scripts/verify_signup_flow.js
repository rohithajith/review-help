#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const { getAdminPool } = require('../tenantManager');
const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3001';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const email = `test+${Date.now()}@example.com`;
  const password = 'Password123!';
  console.log('Creating Supabase user:', email);

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const userId = createData?.user?.id || createData?.id;
  if (!userId) throw new Error('Supabase admin createUser did not return a user id');

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const token = signInData?.session?.access_token;
  if (!token) throw new Error('Failed to obtain access token after sign-in');

  console.log('Calling backend onboarding endpoint...');
  const response = await fetch(`${BACKEND_BASE_URL}/api/users/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ business_name: `Test Biz ${Date.now()}` }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Onboard endpoint failed: ${response.status} ${JSON.stringify(body)}`);
  }

  console.log('Onboard response:', body);

  const pool = getAdminPool();
  const userRow = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
  const ownerRow = await pool.query('SELECT business_id, role FROM business_owners WHERE user_id = $1', [userId]);
  const bizRow = await pool.query('SELECT id, name FROM businesses WHERE id = $1', [body.businessId]);

  console.log('DB users row:', userRow.rows);
  console.log('DB business_owners row:', ownerRow.rows);
  console.log('DB business row:', bizRow.rows);

  if (pool && typeof pool.end === 'function') await pool.end();

  console.log('\nSignup flow verification succeeded.');
}

main().catch((err) => {
  console.error('Signup flow verification failed:', err);
  process.exit(1);
});

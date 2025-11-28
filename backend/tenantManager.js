const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 for DNS resolution (fixes GCP IPv6 connectivity issues with Supabase)
dns.setDefaultResultOrder('ipv4first');

/**
 * Supabase-first Tenant Manager
 * 
 * This module manages database connections for the Review App.
 * It uses a SINGLE shared Postgres database (Supabase) and scopes
 * data by business_id instead of creating separate tenant databases.
 * 
 * Required environment variables:
 *   ADMIN_DATABASE_URL - Supabase Postgres connection string
 *                        Example: postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
 * 
 * The module automatically handles SSL for Supabase connections.
 */

let adminPool = null;

/**
 * Parse connection string and determine if SSL should be enabled
 */
function getPoolConfig(connectionString) {
  const config = { connectionString };
  
  // Enable SSL for Supabase and other cloud providers
  // Supabase hostnames contain 'supabase.co'
  if (connectionString && (
    connectionString.includes('supabase.co') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('sslmode=verify-full')
  )) {
    config.ssl = { rejectUnauthorized: false };
  }
  
  return config;
}

/**
 * Get the admin/shared database pool.
 * All queries use this single pool; data is scoped by business_id.
 */
function getAdminPool() {
  if (adminPool) return adminPool;
  
  const connectionString = process.env.ADMIN_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'ADMIN_DATABASE_URL must be set. ' +
      'For Supabase: postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres'
    );
  }
  
  console.info('tenantManager: creating Supabase/Postgres pool');
  adminPool = new Pool(getPoolConfig(connectionString));
  
  // Handle pool errors gracefully
  adminPool.on('error', (err) => {
    console.error('Unexpected pool error:', err.message);
  });
  
  return adminPool;
}

/**
 * Ensure all required tables exist in the shared database.
 * Tables include business_id column for multi-tenant data isolation.
 */
async function ensureAdminSchema() {
  const pool = getAdminPool();
  
  // Businesses table (admin registry)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tenant_connection TEXT,
      google_review_url TEXT,
      logo_url TEXT,
      welcome_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Review templates (active templates shown to users)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_templates (
      id SERIAL PRIMARY KEY,
      business_id INTEGER,
      text TEXT NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_review_templates_business_id ON review_templates(business_id)`);
  
  // Backup templates (used to refill active pool)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS backup_templates (
      id SERIAL PRIMARY KEY,
      business_id INTEGER,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_backup_templates_business_id ON backup_templates(business_id)`);
  
  // Archived templates (used reviews, fed to AI for regeneration)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS archived_templates (
      id SERIAL PRIMARY KEY,
      business_id INTEGER,
      text TEXT NOT NULL,
      archived_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_archived_templates_business_id ON archived_templates(business_id)`);

  // Users table for business owners (Supabase auth users are referenced by UUID)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Mapping of business owners (many-to-many) and roles
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_owners (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL,
      user_id UUID NOT NULL,
      role TEXT DEFAULT 'owner',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (business_id, user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_business_owners_business_id ON business_owners(business_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_business_owners_user_id ON business_owners(user_id)`);
  
  console.info('tenantManager: schema ensured (businesses, review_templates, backup_templates, archived_templates)');
}

/**
 * Seed default templates for a specific business.
 * This is idempotent - it won't duplicate existing templates.
 */
async function seedBusinessTemplates(businessId) {
  const pool = getAdminPool();
  
  const activeTemplates = [
    "Great food and friendly staff — highly recommend this restaurant!",
    "Amazing flavors and great portion sizes. We'll be back soon!",
    "The service was quick and the dishes were delicious. Five stars!",
    "Cozy atmosphere and excellent service. Perfect for date night.",
    "Fresh ingredients and a nice variety on the menu. Highly recommend the house special.",
    "We loved the appetizers and the staff were attentive. A must-try place in town.",
    "Outstanding value for the quality. Portions are generous and tasty.",
    "Fantastic experience — food arrived hot and the server was very friendly.",
    "Delicious desserts and a relaxing ambiance. Great spot for family dinners.",
    "Consistently great meals and friendly staff. Our go-to restaurant now.",
  ];
  
  const backupTemplates = [
    "Friendly servers and a lovely vibe — would return for sure.",
    "Quick service and tasty plates; good value for the price.",
    "Lovely setting and attentive staff made our meal enjoyable.",
    "The menu had great variety and everything we tried tasted fresh.",
    "Warm hospitality and consistent quality — highly recommend this place.",
    "Perfect spot for casual dinners; portions and flavor were excellent.",
    "The atmosphere is comfortable and the staff were polite and helpful.",
    "Service was efficient and the dishes arrived hot and well-seasoned.",
    "Good pricing and generous portions — ideal for families.",
    "A memorable meal with excellent service and tasty desserts."
  ];
  
  // Insert active templates (idempotent)
  for (const text of activeTemplates) {
    const { rows } = await pool.query(
      'SELECT 1 FROM review_templates WHERE business_id = $1 AND text = $2 LIMIT 1',
      [businessId, text]
    );
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO review_templates (business_id, text, used, created_at) VALUES ($1, $2, false, NOW())',
        [businessId, text]
      );
    }
  }
  
  // Insert backup templates (idempotent)
  for (const text of backupTemplates) {
    const { rows } = await pool.query(
      'SELECT 1 FROM backup_templates WHERE business_id = $1 AND text = $2 LIMIT 1',
      [businessId, text]
    );
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO backup_templates (business_id, text, created_at) VALUES ($1, $2, NOW())',
        [businessId, text]
      );
    }
  }
  
  console.info(`tenantManager: seeded templates for business_id=${businessId}`);
}

// Legacy functions for backward compatibility (deprecated)
// These are no longer used but kept to avoid breaking imports

async function getTenantPool(businessId) {
  // In shared DB mode, always return the admin pool
  return getAdminPool();
}

async function createTenantDatabase(connectionString, aliasKey) {
  // No longer creates separate databases; just ensure schema and seed
  await ensureAdminSchema();
  if (aliasKey) {
    await seedBusinessTemplates(aliasKey);
  }
  return getAdminPool();
}

module.exports = {
  getAdminPool,
  ensureAdminSchema,
  seedBusinessTemplates,
  // Legacy exports (deprecated)
  getTenantPool,
  createTenantDatabase,
};

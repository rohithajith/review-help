const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 for DNS resolution (fixes GCP IPv6 connectivity issues with Supabase)
dns.setDefaultResultOrder('ipv4first');
const LEGACY_FALLBACK_TEMPLATE_TEXT = 'Thank you for visiting — we appreciate your feedback.';

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
  const explicitRejectUnauthorized = String(process.env.PG_SSL_REJECT_UNAUTHORIZED || '').trim();
  const rejectUnauthorized = explicitRejectUnauthorized
    ? String(explicitRejectUnauthorized).toLowerCase() !== 'false'
    // Keep Supabase connections backwards-compatible in local/dev setups that
    // present custom/self-signed cert chains unless explicitly overridden.
    : !connectionString.includes('supabase.co');
  
  // Enable SSL for Supabase and other cloud providers
  // Supabase hostnames contain 'supabase.co'
  if (connectionString && (
    connectionString.includes('supabase.co') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('sslmode=verify-full')
  )) {
    config.ssl = { rejectUnauthorized };
    // GCP VM currently has no usable IPv6 route to Supabase Postgres.
    // Force IPv4 resolution for PG sockets to avoid ENETUNREACH.
    config.lookup = (hostname, options, callback) => {
      dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
    };
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
      review_platforms JSONB DEFAULT '[{"name": "Google", "url": ""}, {"name": "Booking.com", "url": ""}]'::jsonb,
      plan TEXT DEFAULT 'Starter',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      billing_required BOOLEAN NOT NULL DEFAULT false,
      billing_status TEXT NOT NULL DEFAULT 'active',
      pending_plan TEXT,
      trial_ends_at TIMESTAMP,
      business_type TEXT,
      business_category TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Add review_platforms column if it doesn't exist (for existing databases)
  await pool.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'review_platforms') THEN
        ALTER TABLE businesses ADD COLUMN review_platforms JSONB DEFAULT '[{"name": "Google", "url": ""}, {"name": "Booking.com", "url": ""}]'::jsonb;
      END IF;
    END $$;
  `);

  // Add plan and Stripe columns for subscription management (for existing databases)
  await pool.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'plan') THEN
        ALTER TABLE businesses ADD COLUMN plan TEXT DEFAULT 'Starter';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE businesses ADD COLUMN stripe_customer_id TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE businesses ADD COLUMN stripe_subscription_id TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'billing_required') THEN
        ALTER TABLE businesses ADD COLUMN billing_required BOOLEAN NOT NULL DEFAULT false;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'billing_status') THEN
        ALTER TABLE businesses ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'active';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'pending_plan') THEN
        ALTER TABLE businesses ADD COLUMN pending_plan TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE businesses ADD COLUMN trial_ends_at TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'business_type') THEN
        ALTER TABLE businesses ADD COLUMN business_type TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'business_category') THEN
        ALTER TABLE businesses ADD COLUMN business_category TEXT;
      END IF;
    END $$;
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

  // Customer reviews submitted in-app (My Reviews source of truth)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_reviews (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL,
      template_id INTEGER,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS consent_granted BOOLEAN`);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS consent_granted_at TIMESTAMP`);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS consent_statement_version TEXT`);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS consent_statement_text TEXT`);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS consent_revoked_at TIMESTAMP`);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS consent_token_hash TEXT`);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS consent_token TEXT`);
  await pool.query(`ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS post_submit_metadata JSONB DEFAULT '{}'::jsonb`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customer_reviews_business_id ON customer_reviews(business_id)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_reviews_consent_token_hash ON customer_reviews(consent_token_hash) WHERE consent_token_hash IS NOT NULL`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_reviews_consent_token ON customer_reviews(consent_token) WHERE consent_token IS NOT NULL`);

  // Remove previously auto-inserted fallback phrase from template pools.
  await pool.query(
    `DELETE FROM review_templates
     WHERE lower(trim(text)) = lower(trim($1))`,
    [LEGACY_FALLBACK_TEMPLATE_TEXT]
  );
  await pool.query(
    `DELETE FROM backup_templates
     WHERE lower(trim(text)) = lower(trim($1))`,
    [LEGACY_FALLBACK_TEMPLATE_TEXT]
  );

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

  // Remove orphaned rows before adding FK constraints (safe idempotent cleanup)
  await pool.query(`
    DELETE FROM business_owners bo
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = bo.business_id)
       OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = bo.user_id)
  `);
  await pool.query(`
    DELETE FROM review_templates rt
    WHERE rt.business_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = rt.business_id)
  `);
  await pool.query(`
    DELETE FROM backup_templates bt
    WHERE bt.business_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = bt.business_id)
  `);
  await pool.query(`
    DELETE FROM archived_templates at
    WHERE at.business_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = at.business_id)
  `);
  await pool.query(`
    DELETE FROM customer_reviews cr
    WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = cr.business_id)
  `);
  await pool.query(`
    UPDATE customer_reviews cr
    SET template_id = NULL
    WHERE cr.template_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM review_templates rt WHERE rt.id = cr.template_id)
  `);

  // Strengthen tenant integrity constraints
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_business_owners_business') THEN
        ALTER TABLE business_owners
          ADD CONSTRAINT fk_business_owners_business
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_business_owners_user') THEN
        ALTER TABLE business_owners
          ADD CONSTRAINT fk_business_owners_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_review_templates_business') THEN
        ALTER TABLE review_templates
          ADD CONSTRAINT fk_review_templates_business
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_backup_templates_business') THEN
        ALTER TABLE backup_templates
          ADD CONSTRAINT fk_backup_templates_business
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_archived_templates_business') THEN
        ALTER TABLE archived_templates
          ADD CONSTRAINT fk_archived_templates_business
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_reviews_business') THEN
        ALTER TABLE customer_reviews
          ADD CONSTRAINT fk_customer_reviews_business
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_reviews_template') THEN
        ALTER TABLE customer_reviews
          ADD CONSTRAINT fk_customer_reviews_template
          FOREIGN KEY (template_id) REFERENCES review_templates(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // Query-shape indexes for auth/owner and template retrieval paths
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_business_owners_user_business ON business_owners(user_id, business_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_review_templates_business_used_created ON review_templates(business_id, used, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customer_reviews_business_created ON customer_reviews(business_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users((LOWER(email)))`);

  console.info('tenantManager: schema ensured (businesses, review_templates, backup_templates, archived_templates, customer_reviews+consent)');
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

module.exports = {
  getAdminPool,
  ensureAdminSchema,
  seedBusinessTemplates,
};

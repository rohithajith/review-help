const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Tenant manager: reads tenant connection strings from env or tenants.json
const TENANTS_FILE = path.join(__dirname, 'tenants.json');
let tenantsConfig = {};
try {
  tenantsConfig = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf8'));
} catch (e) {
  tenantsConfig = {};
}

const poolCache = new Map();

function getAdminPool() {
  // Prefer env var, fallback to tenants.json
  const conn = process.env.ADMIN_DATABASE_URL || (tenantsConfig.admin && tenantsConfig.admin.connectionString);
  if (!conn) throw new Error('Admin database connection not configured (set ADMIN_DATABASE_URL or tenants.json)');
  if (!poolCache.has('admin')) {
    poolCache.set('admin', new Pool({ connectionString: conn }));
  }
  return poolCache.get('admin');
}

async function getTenantPool(businessId) {
  const key = `tenant:${businessId}`;
  if (poolCache.has(key)) return poolCache.get(key);

  // lookup in env: TENANT_DB_URL_<businessId>
  const envKey = `TENANT_DB_URL_${businessId}`;
  const conn = process.env[envKey] || (tenantsConfig.tenants && tenantsConfig.tenants[businessId] && tenantsConfig.tenants[businessId].connectionString);
  if (!conn) return null;

  // Create a pool and test connectivity. If the tenant database doesn't exist,
  // attempt to create it via createTenantDatabase which will run migrations and seeding.
  let pool = new Pool({ connectionString: conn });
  try {
    await pool.query('SELECT 1');
    poolCache.set(key, pool);
    return pool;
  } catch (err) {
    try {
      await pool.end().catch(() => {});
    } catch (e) {}
    // Try to create the tenant DB (this will also run migrations/seeds)
    const createdPool = await createTenantDatabase(conn, businessId);
    poolCache.set(key, createdPool);
    return createdPool;
  }
}

/**
 * Create or ensure a tenant database exists and return a connected pool.
 * Attempts to connect to the provided tenant connection string. If the
 * database does not exist, it will connect to the server's default
 * database (usually 'postgres') and run CREATE DATABASE <name>.
 * After the DB exists it will run per-tenant migrations and seed defaults.
 * Returns the pooled client for the tenant.
 */
async function createTenantDatabase(connectionString, aliasKey) {
  // Try to connect directly first
  let tenantPool;
  try {
    tenantPool = new Pool({ connectionString });
    // quick test
    await tenantPool.query('SELECT 1');
    // run migrations and seed
    await runTenantMigrations(tenantPool);
    await seedDefaultTemplates(tenantPool);
    // cache and return
    const url = new URL(connectionString);
    const dbName = url.pathname ? url.pathname.replace(/^\//, '') : '';
    const key = `tenant:${dbName || connectionString}`;
    poolCache.set(key, tenantPool);
    if (aliasKey) {
      poolCache.set(`tenant:${aliasKey}`, tenantPool);
    }
    return tenantPool;
  } catch (err) {
    // If connection failed because DB does not exist, attempt to create it
    // Postgres error code for invalid_catalog_name is 3D000; however, connection
    // errors may vary. We'll attempt a create using admin connection derived
    // from the connection string by connecting to the default 'postgres' DB.
    try {
      if (tenantPool) {
        await tenantPool.end().catch(() => {});
      }
    } catch (e) {}

    // parse components from connectionString
    let parsed;
    try {
      parsed = new URL(connectionString);
    } catch (e) {
      throw new Error('Invalid tenant connection string');
    }

    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '') : null;
    if (!dbName) throw err; // nothing we can do

    // Build admin-level connection string to 'postgres' database on same host
    const adminUrl = new URL(connectionString);
    adminUrl.pathname = '/postgres';
    const adminConn = adminUrl.toString();

    const adminPool = new Pool({ connectionString: adminConn });
    try {
      // create database
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
    } catch (createErr) {
      // if it already exists or other error, rethrow original error
      await adminPool.end().catch(() => {});
      throw createErr;
    }
    await adminPool.end().catch(() => {});

    // now try to connect again
    tenantPool = new Pool({ connectionString });
    await tenantPool.query('SELECT 1');
    await runTenantMigrations(tenantPool);
    await seedDefaultTemplates(tenantPool);

    const key = `tenant:${dbName}`;
    poolCache.set(key, tenantPool);
    if (aliasKey) {
      poolCache.set(`tenant:${aliasKey}`, tenantPool);
    }
    return tenantPool;
  }
}

async function runTenantMigrations(pool) {
  // Minimal migrations: ensure review_templates and archived_templates exist
  const createTemplates = `
    CREATE TABLE IF NOT EXISTS review_templates (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  const createArchived = `
    CREATE TABLE IF NOT EXISTS archived_templates (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      archived_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(createTemplates);
  await pool.query(createArchived);
}

async function seedDefaultTemplates(pool) {
  const templates = [
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
    "Thanks for visiting! Please leave us a review."
  ];

  try {
    // Insert any templates that do not already exist (idempotent)
    for (const t of templates) {
      const { rows } = await pool.query('SELECT 1 FROM review_templates WHERE text = $1 LIMIT 1', [t]);
      if (!rows || rows.length === 0) {
        await pool.query('INSERT INTO review_templates (text, used, created_at) VALUES ($1, false, NOW())', [t]);
      }
    }
  } catch (e) {
    // ignore seeding errors; don't crash the startup
    console.warn('Warning: failed to seed default templates', e && e.message ? e.message : e);
  }
}

module.exports = { getTenantPool, getAdminPool, createTenantDatabase };

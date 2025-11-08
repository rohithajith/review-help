"use strict";
// Example script to seed tenant databases and admin registry. Requires
// ADMIN_DATABASE_URL and TENANT_DB_URL_<id> env vars or backend/tenants.json.
const { getAdminPool, getTenantPool } = require('./tenantManager');

async function seed() {
  try {
    const admin = getAdminPool();
    await admin.query(`CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tenant_connection TEXT NOT NULL,
      google_review_url TEXT,
      logo_url TEXT,
      welcome_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    // Example: iterate tenants.json tenants
    const tenants = require('./tenants.json').tenants || {};
    for (const [id, info] of Object.entries(tenants)) {
      const tenantName = info.name || `Tenant ${id}`;
      // register in admin DB if not exists (use tenant_connection field)
      const res = await admin.query('SELECT id FROM businesses WHERE tenant_connection = $1', [info.connectionString]);
      if (res.rowCount === 0) {
        await admin.query('INSERT INTO businesses (name, tenant_connection, google_review_url, logo_url, welcome_message) VALUES ($1,$2,$3,$4,$5)', [tenantName, info.connectionString, info.google_review_url || null, info.logo_url || null, info.welcome_message || null]);
      }

      // seed tenant DB with templates (getTenantPool is async)
      const pool = await getTenantPool(id);
      if (!pool) continue;
      await pool.query(`CREATE TABLE IF NOT EXISTS review_templates (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS archived_templates (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        archived_at TIMESTAMP DEFAULT NOW()
      )`);
      // insert sample templates if none
      const existing = await pool.query('SELECT COUNT(*) FROM review_templates');
      if (Number(existing.rows[0].count) === 0) {
        await pool.query('INSERT INTO review_templates (text, used) VALUES ($1, $2)', [`Welcome to ${tenantName}! Please leave us a review.`, false]);
      }
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error', err.message);
    process.exit(1);
  }
}

seed();

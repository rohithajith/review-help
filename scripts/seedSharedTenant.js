#!/usr/bin/env node
/**
 * Seed Templates for a Business
 * 
 * Usage:
 *   ADMIN_DATABASE_URL="postgresql://..." BUSINESS_ID=1 node scripts/seedSharedTenant.js
 *   
 *   Or:
 *   ADMIN_DATABASE_URL="postgresql://..." node scripts/seedSharedTenant.js 1
 * 
 * This script is idempotent - it won't duplicate existing templates.
 */

const { Pool } = require('pg');

function getPoolConfig(connectionString) {
  const config = { connectionString };
  if (connectionString && (
    connectionString.includes('supabase.co') ||
    connectionString.includes('sslmode=require')
  )) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

async function main() {
  const adminUrl = process.env.ADMIN_DATABASE_URL;
  const businessId = process.env.BUSINESS_ID || process.argv[2];
  
  if (!adminUrl) {
    console.error('Error: ADMIN_DATABASE_URL must be set');
    console.error('Example: postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres');
    process.exit(2);
  }
  
  if (!businessId) {
    console.error('Error: BUSINESS_ID must be provided as env or first arg');
    console.error('Example: BUSINESS_ID=1 node scripts/seedSharedTenant.js');
    process.exit(2);
  }

  const pool = new Pool(getPoolConfig(adminUrl));
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✓ Connected to database');
    
    // Ensure tables exist
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
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS backup_templates (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_backup_templates_business_id ON backup_templates(business_id)`);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS archived_templates (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        text TEXT NOT NULL,
        archived_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_archived_templates_business_id ON archived_templates(business_id)`);
    
    console.log('✓ Tables verified');

    // Seed active templates
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

    let activeCount = 0;
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
        activeCount++;
      }
    }
    console.log(`✓ Active templates: ${activeCount} new, ${activeTemplates.length - activeCount} existing`);

    // Seed backup templates
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

    let backupCount = 0;
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
        backupCount++;
      }
    }
    console.log(`✓ Backup templates: ${backupCount} new, ${backupTemplates.length - backupCount} existing`);

    console.log(`\n✓ Seeding complete for business_id=${businessId}`);
    process.exit(0);
  } catch (e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch (e) {}
  }
}

main();

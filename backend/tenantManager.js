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

function getTenantPool(businessId) {
  const key = `tenant:${businessId}`;
  if (poolCache.has(key)) return poolCache.get(key);

  // lookup in env: TENANT_DB_URL_<businessId>
  const envKey = `TENANT_DB_URL_${businessId}`;
  const conn = process.env[envKey] || (tenantsConfig.tenants && tenantsConfig.tenants[businessId] && tenantsConfig.tenants[businessId].connectionString);
  if (!conn) return null;

  const pool = new Pool({ connectionString: conn });
  poolCache.set(key, pool);
  return pool;
}

module.exports = { getTenantPool, getAdminPool };

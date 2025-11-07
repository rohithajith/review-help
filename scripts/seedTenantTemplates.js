#!/usr/bin/env node
const path = require('path');
(async () => {
  try {
    const tenantManager = require(path.join(__dirname, '..', 'backend', 'tenantManager'));
    // Load tenants config to find tenant 1 connection
    const tenants = require(path.join(__dirname, '..', 'backend', 'tenants.json'));
    const conn = tenants.tenants && tenants.tenants['1'] && tenants.tenants['1'].connectionString;
    if (!conn) {
      console.error('No tenant connection string for tenant 1 found in tenants.json');
      process.exit(1);
    }
    // createTenantDatabase will create/migrate and seed if needed
    await tenantManager.createTenantDatabase(conn, '1');
    console.log('Tenant 1 templates seeded (idempotent)');
    process.exit(0);
  } catch (e) {
    console.error('Error seeding tenant templates:', e && e.stack ? e.stack : e);
    process.exit(2);
  }
})();

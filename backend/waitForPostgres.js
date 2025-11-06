const { Pool } = require('pg');

async function waitFor(connString, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const pool = new Pool({ connectionString: connString });
      await pool.query('SELECT 1');
      await pool.end();
      return;
    } catch (e) {
      // wait and retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Timed out waiting for Postgres');
}

if (require.main === module) {
  const conn = process.env.ADMIN_DATABASE_URL || process.env.TENANT_DB_URL_1 || 'postgres://appuser:password@localhost:5432/admin_db';
  waitFor(conn).then(() => {
    console.log('Postgres is ready');
    process.exit(0);
  }).catch((err) => {
    console.error('Postgres did not become ready:', err.message);
    process.exit(1);
  });
}

module.exports = waitFor;

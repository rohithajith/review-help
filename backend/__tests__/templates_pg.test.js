// Integration test that runs against a Postgres instance (e.g., Supabase)
// It expects environment variables to point to the Postgres service:
// ADMIN_DATABASE_URL, TENANT_DB_URL_1, TENANT_DB_URL_2

process.env.NODE_ENV = 'test';

// Ensure env is set before requiring the app
const request = require('supertest');
const child = require('child_process');
const { Pool } = require('pg');

const ADMIN_DB = process.env.ADMIN_DATABASE_URL || 'postgres://appuser:password@localhost:5432/admin_db';
const TENANT1 = process.env.TENANT_DB_URL_1 || 'postgres://appuser:password@localhost:5432/tenant1_db';
const TENANT2 = process.env.TENANT_DB_URL_2 || 'postgres://appuser:password@localhost:5432/tenant2_db';

let app;

const exec = (cmd, env = {}) => new Promise((resolve, reject) => {
  child.exec(cmd, { env: { ...process.env, ...env } }, (err, stdout, stderr) => {
    if (err) return reject({ err, stdout, stderr });
    resolve({ stdout, stderr });
  });
});

describe('Postgres tenant integration', () => {
  let adminPool;

  beforeAll(async () => {
    // Configure test DB connection strings (point to your test/supabase DBs)
    process.env.ADMIN_DATABASE_URL = ADMIN_DB;
    process.env.TENANT_DB_URL_1 = TENANT1;
    process.env.TENANT_DB_URL_2 = TENANT2;

    // Note: seeding scripts are disabled in this repo to avoid accidental
    // writes to Supabase. Ensure your test database contains the required
    // tables and test data beforehand. Then require the app.
    app = require('../index');
    adminPool = new Pool({ connectionString: ADMIN_DB });
  }, 60000);

  afterAll(async () => {
    if (adminPool) await adminPool.end();
  });

  test('creates and lists templates per tenant', async () => {
    // get businesses from admin
    const bizRes = await request(app).get('/api/businesses');
    expect(bizRes.status).toBe(200);
    expect(bizRes.body.length).toBeGreaterThanOrEqual(2);

    const biz1 = bizRes.body[0];
    const biz2 = bizRes.body[1];

    // create template in tenant1 via API
    const create1 = await request(app)
      .post(`/api/${biz1.id}/templates`)
      .send({ text: 'Test template restaurant' });
    expect(create1.status).toBe(201);

    const list1 = await request(app).get(`/api/${biz1.id}/templates`);
    expect(list1.status).toBe(200);
    expect(list1.body.find((t) => t.text === 'Test template restaurant')).toBeTruthy();

    // create template in tenant2 via API
    const create2 = await request(app)
      .post(`/api/${biz2.id}/templates`)
      .send({ text: 'Test template nails shop' });
    expect(create2.status).toBe(201);

    const list2 = await request(app).get(`/api/${biz2.id}/templates`);
    expect(list2.status).toBe(200);
    expect(list2.body.find((t) => t.text === 'Test template nails shop')).toBeTruthy();
  }, 30000);
});

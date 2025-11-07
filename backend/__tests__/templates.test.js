const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure test DB is isolated by using same file (for simplicity), but tests try to be idempotent
const app = require('../index');
let db; // require sqlite DB lazily in beforeAll so legacy sqlite driver isn't loaded when tests are skipped

describe.skip('Templates API (multi-tenant) (skipped - legacy sqlite tests)', () => {
  let businessId;

  beforeAll((done) => {
    // Lazy-load sqlite DB for legacy tests
    db = require('../db');
    // Create a business to use for tests
    db.run('INSERT INTO businesses (name) VALUES (?)', ['Test Business'], function (err) {
      if (err) return done(err);
      businessId = this.lastID;
      done();
    });
  });

  afterAll((done) => {
    // Clean up templates and business created by tests
    db.run('DELETE FROM review_templates WHERE business_id = ?', [businessId], () => {
      db.run('DELETE FROM archived_templates WHERE business_id = ?', [businessId], () => {
        db.run('DELETE FROM businesses WHERE id = ?', [businessId], () => done());
      });
    });
  });

  test('create and fetch templates for business', async () => {
    const createRes = await request(app)
      .post(`/api/${businessId}/templates`)
      .send({ text: 'Test template for business' })
      .expect(201);

    expect(createRes.body).toHaveProperty('id');

    const listRes = await request(app).get(`/api/${businessId}/templates`).expect(200);
    const found = listRes.body.find((t) => t.id === createRes.body.id);
    expect(found).toBeDefined();
    expect(found.text).toBe('Test template for business');
  });

  test('use a template archives it', async () => {
    // create
    const createRes = await request(app)
      .post(`/api/${businessId}/templates`)
      .send({ text: 'To be used' })
      .expect(201);

    const id = createRes.body.id;

    await request(app).post(`/api/${businessId}/templates/${id}/use`).expect(200);

    // It should no longer appear in active templates
    const listRes = await request(app).get(`/api/${businessId}/templates`).expect(200);
    const found = listRes.body.find((t) => t.id === id);
    expect(found).toBeUndefined();

    // It should be in archived_templates
    db.get('SELECT * FROM archived_templates WHERE business_id = ? AND text = ?', [businessId, 'To be used'], (err, row) => {
      expect(row).toBeTruthy();
    });
  });
});

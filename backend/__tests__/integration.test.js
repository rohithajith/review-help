const request = require('supertest');

process.env.NODE_ENV = 'test';

jest.mock('../lib/supabaseClient', () => ({
  auth: {
    getUser: jest.fn(async (token) => {
      if (token === 'valid-token') {
        return { data: { user: { id: 'user-1', email: 'owner1@example.com' } }, error: null };
      }
      if (token === 'owner2-token') {
        return { data: { user: { id: 'user-2', email: 'owner2@example.com' } }, error: null };
      }
      return { data: { user: null }, error: { message: 'Invalid token' } };
    }),
    admin: {
      createUser: jest.fn(async () => ({ data: null, error: null })),
    },
  },
}));

jest.mock('../tenantManager', () => {
  const adminBusinesses = [
    {
      id: 1,
      name: "Joe's Restaurant",
      google_review_url: '',
      logo_url: '',
      welcome_message: "Welcome to Joe's",
      review_platforms: [{ name: 'Google', url: '' }],
      plan: 'Starter',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Glam Nails Studio',
      google_review_url: '',
      logo_url: '',
      welcome_message: 'Welcome to Glam',
      review_platforms: [{ name: 'Google', url: '' }],
      plan: 'Starter',
      created_at: new Date().toISOString(),
    },
  ];
  const users = new Map();
  const businessOwners = [
    { business_id: 1, user_id: 'user-1', role: 'owner' },
    { business_id: 2, user_id: 'user-1', role: 'owner' },
    { business_id: 2, user_id: 'user-2', role: 'owner' },
  ];
  const reviewTemplates = [
    { id: 1, business_id: 1, text: 'Seed template for biz 1', used: false, created_at: new Date().toISOString() },
    { id: 2, business_id: 2, text: 'Seed template for biz 2', used: false, created_at: new Date().toISOString() },
  ];

  let nextBusinessId = 3;
  let simulateAdminError = false;

  function findBusiness(id) {
    return adminBusinesses.find((b) => String(b.id) === String(id));
  }

  return {
    getAdminPool() {
      return {
        async query(sql, params = []) {
          if (simulateAdminError) throw new Error('Simulated admin error');
          const statement = String(sql).trim().replace(/\s+/g, ' ').toUpperCase();

          if (statement === 'SELECT 1') {
            return { rows: [{ '?column?': 1 }], rowCount: 1 };
          }

          if (statement.startsWith('INSERT INTO USERS')) {
            const [id, email] = params;
            users.set(String(id), { id, email });
            return { rows: [], rowCount: 1 };
          }

          if (statement.startsWith('INSERT INTO BUSINESS_OWNERS')) {
            const [businessId, userId, role] = params;
            const exists = businessOwners.find(
              (r) => String(r.business_id) === String(businessId) && String(r.user_id) === String(userId)
            );
            if (!exists) {
              businessOwners.push({ business_id: businessId, user_id: String(userId), role: role || 'owner' });
            }
            return { rows: [], rowCount: 1 };
          }

          if (statement.startsWith('INSERT INTO BUSINESSES')) {
            const [name, googleReviewUrl, logoUrl, welcomeMessage] = params;
            const id = nextBusinessId++;
            adminBusinesses.push({
              id,
              name,
              google_review_url: googleReviewUrl || null,
              logo_url: logoUrl || null,
              welcome_message: welcomeMessage || null,
              review_platforms: [{ name: 'Google', url: '' }],
              plan: 'Starter',
              created_at: new Date().toISOString(),
            });
            return { rows: [{ id }], rowCount: 1 };
          }

          if (statement.includes('FROM BUSINESSES B JOIN BUSINESS_OWNERS BO ON BO.BUSINESS_ID = B.ID WHERE BO.USER_ID = $1')) {
            const userId = String(params[0]);
            const ownedIds = new Set(
              businessOwners
                .filter((r) => String(r.user_id) === userId)
                .map((r) => Number(r.business_id))
            );
            const rows = adminBusinesses
              .filter((b) => ownedIds.has(Number(b.id)))
              .map((b) => ({
                id: b.id,
                name: b.name,
                google_review_url: b.google_review_url,
                logo_url: b.logo_url,
                welcome_message: b.welcome_message,
                review_platforms: b.review_platforms,
                plan: b.plan,
                created_at: b.created_at,
              }));
            return { rows, rowCount: rows.length };
          }

          if (statement.startsWith('SELECT ID, NAME, GOOGLE_REVIEW_URL, LOGO_URL, WELCOME_MESSAGE, REVIEW_PLATFORMS, PLAN FROM BUSINESSES WHERE ID = $1')) {
            const found = findBusiness(params[0]);
            if (!found) return { rows: [], rowCount: 0 };
            return {
              rows: [{
                id: found.id,
                name: found.name,
                google_review_url: found.google_review_url,
                logo_url: found.logo_url,
                welcome_message: found.welcome_message,
                review_platforms: found.review_platforms,
                plan: found.plan,
              }],
              rowCount: 1,
            };
          }

          if (statement.startsWith('SELECT ROLE FROM BUSINESS_OWNERS WHERE BUSINESS_ID = $1 AND USER_ID = $2 LIMIT 1')) {
            const [businessId, userId] = params;
            const row = businessOwners.find(
              (r) => String(r.business_id) === String(businessId) && String(r.user_id) === String(userId)
            );
            return row ? { rows: [{ role: row.role }], rowCount: 1 } : { rows: [], rowCount: 0 };
          }

          if (statement.startsWith('SELECT * FROM REVIEW_TEMPLATES WHERE USED = FALSE AND BUSINESS_ID = $1 ORDER BY CREATED_AT DESC')) {
            const businessId = String(params[0]);
            const rows = reviewTemplates.filter((t) => String(t.business_id) === businessId && t.used === false);
            return { rows, rowCount: rows.length };
          }

          return { rows: [], rowCount: 0 };
        },
      };
    },
    ensureAdminSchema: jest.fn(async () => {}),
    seedBusinessTemplates: jest.fn(async () => {}),
    __testHelpers: {
      setSimulateAdminError(val) {
        simulateAdminError = Boolean(val);
      },
    },
  };
});

const app = require('../index');

const authHeader = { Authorization: 'Bearer valid-token' };
const owner2AuthHeader = { Authorization: 'Bearer owner2-token' };

describe('Integration: backend API (mocked tenant manager + auth)', () => {
  jest.setTimeout(20000);

  test('GET /api/businesses requires auth', async () => {
    const res = await request(app).get('/api/businesses');
    expect(res.status).toBe(401);
  });

  test('GET /api/businesses returns businesses for the authenticated owner', async () => {
    const res = await request(app).get('/api/businesses').set(authHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name');
  });

  test('POST /api/businesses creates a business and maps owner', async () => {
    const payload = { name: 'New Tenant Co' };
    const create = await request(app).post('/api/businesses').set(authHeader).send(payload);
    expect([200, 201]).toContain(create.status);
    expect(create.body).toHaveProperty('id');

    const list = await request(app).get('/api/businesses').set(authHeader);
    expect(list.status).toBe(200);
    expect(list.body.some((b) => b.id === create.body.id)).toBe(true);
  });

  test('GET /api/:businessId/templates returns templates for valid businessId', async () => {
    const res = await request(app).get('/api/1/templates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('text');
  });

  test('GET /api/:businessId/templates returns 400 for invalid businessId format', async () => {
    const res = await request(app).get('/api/bad!id/templates');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/:businessId/templates returns empty list for unknown business', async () => {
    const res = await request(app).get('/api/9999/templates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  test('owner-scoped business listing differs per token', async () => {
    const owner1 = await request(app).get('/api/businesses').set(authHeader);
    const owner2 = await request(app).get('/api/businesses').set(owner2AuthHeader);

    expect(owner1.status).toBe(200);
    expect(owner2.status).toBe(200);
    expect(owner1.body.length).toBeGreaterThan(owner2.body.length);
  });

  test('centralized error handler returns 500 when admin pool errors', async () => {
    const tenantManager = require('../tenantManager');
    tenantManager.__testHelpers.setSimulateAdminError(true);

    const res = await request(app).get('/api/businesses').set(authHeader);
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');

    tenantManager.__testHelpers.setSimulateAdminError(false);
  });
});

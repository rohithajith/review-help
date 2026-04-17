jest.mock('../tenantManager', () => ({
  getAdminPool: jest.fn(),
}));

const { getAdminPool } = require('../tenantManager');
const templatesController = require('../controllers/templatesController');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('review consent flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submitReview rejects template-based request when consentAccepted is missing/false', async () => {
    const req = {
      db: { query: jest.fn() },
      businessId: '2',
      body: { templateId: 9, rating: 5, reviewText: 'Great service' },
    };
    const res = makeRes();
    const next = jest.fn();

    await templatesController.submitReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Consent is required before submitting a template-based review' });
    expect(req.db.query).not.toHaveBeenCalled();
  });

  test('submitReview stores consent metadata and returns revoke token', async () => {
    const dbQuery = jest.fn(async (sql) => {
      if (sql.includes('SELECT id FROM review_templates')) return { rowCount: 1, rows: [{ id: 9 }] };
      if (sql.startsWith('INSERT INTO customer_reviews')) {
        return {
          rowCount: 1,
          rows: [{
            id: 77,
            business_id: '2',
            template_id: 9,
            rating: 5,
            review_text: 'Great service',
            created_at: new Date().toISOString(),
            consent_granted: true,
            consent_granted_at: new Date().toISOString(),
            consent_revoked_at: null,
          }],
        };
      }
      if (sql.includes('SELECT * FROM backup_templates')) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [] };
    });
    const req = {
      db: { query: dbQuery },
      businessId: '2',
      protocol: 'http',
      get: () => 'localhost:3004',
      body: { templateId: 9, rating: 5, reviewText: 'Great service', consentAccepted: true },
    };
    const res = makeRes();
    const next = jest.fn();

    await templatesController.submitReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('revokeToken');
    expect(payload.revokeToken).toMatch(/^revoke-[a-z0-9]{6,8}$/);
    expect(payload).toHaveProperty('revokeAvailable', true);
    expect(payload).toHaveProperty('consentStatementVersion', 'v1');
    expect(payload.review).toHaveProperty('consent_granted', true);
    expect(next).not.toHaveBeenCalled();
  });

  test('submitReview accepts own review without consent', async () => {
    const dbQuery = jest.fn(async (sql) => {
      if (sql.startsWith('INSERT INTO customer_reviews')) {
        return {
          rowCount: 1,
          rows: [{
            id: 101,
            business_id: '2',
            template_id: null,
            rating: 5,
            review_text: 'Own review',
            created_at: new Date().toISOString(),
            consent_granted: false,
            consent_granted_at: null,
            consent_revoked_at: null,
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    });
    const req = {
      db: { query: dbQuery },
      businessId: '2',
      protocol: 'http',
      get: () => 'localhost:3004',
      body: { rating: 5, reviewText: 'Own review' },
    };
    const res = makeRes();
    const next = jest.fn();

    await templatesController.submitReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.review).toHaveProperty('consent_granted', false);
    expect(payload).toHaveProperty('revokeToken', null);
    expect(payload).toHaveProperty('revokeAvailable', false);
    expect(next).not.toHaveBeenCalled();
  });

  test('revokeConsentByToken is idempotent', async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 77, consent_revoked_at: null }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 77, consent_revoked_at: new Date().toISOString() }] }),
    };
    getAdminPool.mockReturnValue(pool);
    const req = { body: { token: 'revoke-e8am9le' } };
    const res = makeRes();
    const next = jest.fn();

    await templatesController.revokeConsentByToken(req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Consent revoked successfully',
      revoked: true,
      alreadyRevoked: false,
    }));

    pool.query.mockReset();
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 77, consent_revoked_at: new Date().toISOString() }] });
    const res2 = makeRes();
    await templatesController.revokeConsentByToken(req, res2, next);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Consent already revoked',
      revoked: true,
      alreadyRevoked: true,
    }));
  });
});

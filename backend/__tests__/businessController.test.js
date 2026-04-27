jest.mock('../tenantManager', () => ({
  getAdminPool: jest.fn(),
}));

const { getAdminPool } = require('../tenantManager');
const businessController = require('../controllers/businessController');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('businessController.updateBusiness compose_questions validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 for invalid compose_questions payload', async () => {
    const req = {
      businessId: '2',
      body: {
        compose_questions: [{ label: 'Only one', placeholder: 'Too short' }],
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await businessController.updateBusiness(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('compose_questions'),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid compose_questions payload and updates business', async () => {
    const poolQuery = jest.fn(async () => ({
      rows: [{
        id: 2,
        name: 'Nails by Shandon',
        compose_questions: [
          { key: 'visit_purpose', label: 'Q1', placeholder: 'P1' },
          { key: 'service_quality', label: 'Q2', placeholder: 'P2' },
          { key: 'staff_experience', label: 'Q3', placeholder: 'P3' },
          { key: 'specific_highlight', label: 'Q4', placeholder: 'P4' },
          { key: 'overall_recommendation', label: 'Q5', placeholder: 'P5' },
        ],
      }],
    }));
    getAdminPool.mockReturnValue({ query: poolQuery });

    const req = {
      businessId: '2',
      body: {
        compose_questions: [
          { label: 'Q1', placeholder: 'P1' },
          { label: 'Q2', placeholder: 'P2' },
          { label: 'Q3', placeholder: 'P3' },
          { label: 'Q4', placeholder: 'P4' },
          { label: 'Q5', placeholder: 'P5' },
        ],
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await businessController.updateBusiness(req, res, next);

    expect(poolQuery).toHaveBeenCalledTimes(1);
    expect(poolQuery.mock.calls[0][0]).toMatch(/compose_questions/i);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });
});

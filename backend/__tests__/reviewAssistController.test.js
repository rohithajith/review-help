jest.mock('../services/reviewAssistService', () => ({
  composeFromAnswers: jest.fn(),
  polishReview: jest.fn(),
  getComposeQuestions: jest.fn(),
  sanitizeComposeQuestions: jest.fn(),
}));

const reviewAssistService = require('../services/reviewAssistService');
const templatesController = require('../controllers/templatesController');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('review assist controller handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('composeReview returns 400 when no answers are provided', async () => {
    const req = { body: { answers: {}, skippedKeys: [] } };
    const res = makeRes();
    await templatesController.composeReview(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('composeReview returns generated text', async () => {
    reviewAssistService.composeFromAnswers.mockResolvedValue('The room was clean and staff were attentive.');
    const req = {
      body: {
        answers: {
          stay_purpose: 'Holiday',
          room_cleanliness: 'Very clean room',
          staff_service: 'Helpful staff',
        },
        skippedKeys: [],
      },
    };
    const res = makeRes();
    await templatesController.composeReview(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ reviewText: 'The room was clean and staff were attentive.' });
  });

  test('polishReview returns 400 on empty text', async () => {
    const req = { body: { reviewText: '   ' } };
    const res = makeRes();
    await templatesController.polishReview(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('polishReview returns polished text', async () => {
    reviewAssistService.polishReview.mockResolvedValue('The stay was comfortable, and the team was polite.');
    const req = { body: { reviewText: 'stay was good and staff nice' } };
    const res = makeRes();
    await templatesController.polishReview(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ reviewText: 'The stay was comfortable, and the team was polite.' });
  });

  test('getComposeQuestions returns compose questions payload', async () => {
    reviewAssistService.getComposeQuestions.mockResolvedValue({
      questions: [
      { key: 'visit_purpose', label: 'Q1', placeholder: 'P1' },
      { key: 'service_quality', label: 'Q2', placeholder: 'P2' },
      { key: 'staff_experience', label: 'Q3', placeholder: 'P3' },
      { key: 'specific_highlight', label: 'Q4', placeholder: 'P4' },
      { key: 'overall_recommendation', label: 'Q5', placeholder: 'P5' },
      ],
      source: 'db',
    });

    const req = {
      businessId: '2',
      db: {
        query: jest.fn(async () => ({
          rows: [{
            id: 2,
            name: 'Nails by Shandon',
            business_type: 'freelancer',
            business_category: 'Nail Technician',
            welcome_message: 'Share your nail appointment experience in a few words.',
            review_platforms: [{ name: 'Google', url: '' }],
            compose_questions: null,
          }],
        })),
      },
    };
    const res = makeRes();
    await templatesController.getComposeQuestions(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'db' }));
    expect(reviewAssistService.getComposeQuestions).toHaveBeenCalled();
  });

  test('getComposeQuestions returns 404 when business profile is missing', async () => {
    const req = {
      businessId: '999',
      db: { query: jest.fn(async () => ({ rows: [] })) },
    };
    const res = makeRes();
    await templatesController.getComposeQuestions(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getComposeQuestions returns fallback questions when db compose questions are missing', async () => {
    reviewAssistService.getComposeQuestions.mockResolvedValue({
      questions: [
        { key: 'visit_purpose', label: 'Q1', placeholder: 'P1' },
        { key: 'service_quality', label: 'Q2', placeholder: 'P2' },
        { key: 'staff_experience', label: 'Q3', placeholder: 'P3' },
        { key: 'specific_highlight', label: 'Q4', placeholder: 'P4' },
        { key: 'overall_recommendation', label: 'Q5', placeholder: 'P5' },
      ],
      source: 'fallback',
    });
    const req = {
      businessId: '2',
      db: {
        query: jest.fn(async () => ({
          rows: [{
            id: 2,
            compose_questions: null,
          }],
        })),
      },
    };
    const res = makeRes();
    await templatesController.getComposeQuestions(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'fallback' }));
  });
});

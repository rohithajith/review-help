jest.mock('../services/reviewAssistService', () => ({
  composeFromAnswers: jest.fn(),
  polishReview: jest.fn(),
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
});

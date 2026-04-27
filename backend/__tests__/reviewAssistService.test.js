describe('reviewAssistService', () => {
  const oldFetch = global.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;

  function mockResponseWithText(text) {
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: text } }],
      }),
    };
  }

  beforeEach(() => {
    jest.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  afterAll(() => {
    global.fetch = oldFetch;
    process.env.OPENROUTER_API_KEY = oldKey;
  });

  test('composeFromAnswers retries once when first output violates FTC guardrails', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(mockResponseWithText('This is the best hotel and guaranteed perfect service.'))
      .mockResolvedValueOnce(mockResponseWithText('The room was clean and the staff were helpful throughout my stay.'));
    global.fetch = fetchMock;

    const service = require('../services/reviewAssistService');
    const out = await service.composeFromAnswers({
      answers: {
        stay_purpose: 'Weekend trip',
        room_cleanliness: 'Clean room and quiet at night',
        staff_service: 'Reception was very helpful',
      },
      skippedKeys: [],
    });

    expect(out).toMatch(/clean/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('polishReview fails safely when outputs remain non-compliant', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockResponseWithText('Best hotel ever, guaranteed perfect stay and always flawless.'));
    global.fetch = fetchMock;

    const service = require('../services/reviewAssistService');
    await expect(service.polishReview({ reviewText: 'Good stay.' })).rejects.toThrow('Unable to generate FTC-safe review text');
  });

  test('getComposeQuestions returns admin override when provided', async () => {
    global.fetch = jest.fn();
    const service = require('../services/reviewAssistService');
    service.__private.clearComposeQuestionCache();

    const adminQuestions = [
      { label: 'Q1', placeholder: 'P1' },
      { label: 'Q2', placeholder: 'P2' },
      { label: 'Q3', placeholder: 'P3' },
      { label: 'Q4', placeholder: 'P4' },
      { label: 'Q5', placeholder: 'P5' },
    ];

    const result = await service.getComposeQuestions({
      businessProfile: { id: 1, name: 'Nails by Shandon' },
      adminQuestions,
    });

    expect(result.source).toBe('admin');
    expect(result.questions).toHaveLength(5);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('getComposeQuestions uses cache on repeated calls for same business fingerprint', async () => {
    const questionPayload = JSON.stringify([
      { label: 'What service did you book?', placeholder: 'Gel manicure, BIAB, infill, etc.' },
      { label: 'How did your nails look after the appointment?', placeholder: 'Shape, finish, detail, durability.' },
      { label: 'How was your experience with the technician?', placeholder: 'Friendly, attentive, professional, etc.' },
      { label: 'What stood out most from this visit?', placeholder: 'One specific detail that impressed you.' },
      { label: 'Would you come back or recommend this place?', placeholder: 'Share your overall impression.' },
    ]);
    const fetchMock = jest.fn().mockResolvedValue(mockResponseWithText(questionPayload));
    global.fetch = fetchMock;

    const service = require('../services/reviewAssistService');
    service.__private.clearComposeQuestionCache();

    const businessProfile = {
      id: 22,
      name: 'Nails by Shandon',
      business_type: 'freelancer',
      business_category: 'Nail Technician',
      welcome_message: 'Share your nail appointment experience in a few words.',
      review_platforms: [{ name: 'Google', url: '' }],
    };

    const first = await service.getComposeQuestions({ businessProfile, adminQuestions: null });
    const second = await service.getComposeQuestions({ businessProfile, adminQuestions: null });

    expect(first.source).toBe('ai');
    expect(second.source).toBe('cache');
    expect(second.questions).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('getComposeQuestions falls back safely when AI fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const service = require('../services/reviewAssistService');
    service.__private.clearComposeQuestionCache();

    const result = await service.getComposeQuestions({
      businessProfile: { id: 3, name: 'Mohmed Barber', business_category: 'Salon/Barbershop' },
      adminQuestions: null,
    });

    expect(result.source).toBe('fallback');
    expect(result.questions).toHaveLength(5);
    expect(result.questions.every((q) => q.label && q.key)).toBe(true);
  });
});

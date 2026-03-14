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
});

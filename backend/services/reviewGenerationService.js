/**
 * Review Generation Service
 * 
 * Generates human-like, unique reviews using OpenRouter API.
 * Designed to comply with Google's review gating policies and produce
 * natural, varied language without robotic patterns.
 */

// Use native fetch if available (Node 18+), otherwise require node-fetch
let fetchFn = global.fetch;
let GlobalAbortController = global.AbortController;
if (!fetchFn) {
  try {
    fetchFn = require('node-fetch');
    try { GlobalAbortController = require('node-fetch').AbortController || GlobalAbortController; } catch (e) {}
  } catch (e) {
    throw new Error('No fetch available: please run on Node 18+ or install node-fetch');
  }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// List of diverse, free models for rotation
const PRIMARY_MODEL = 'openai/gpt-oss-120b:free';
const FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
];

// System prompt designed for human-like, non-repetitive reviews
const REVIEW_GENERATION_PROMPT = `You are helping a real customer write their review for a local business.

CRITICAL RULES - You MUST follow these:
1. Write EXACTLY like a real person would - casual, natural, conversational
2. NEVER use em dashes (—), use commas or periods instead
3. NEVER use formal or marketing language
4. NEVER use phrases like "I highly recommend", "exceptional service", "truly remarkable"
5. Keep it SHORT - 2-4 sentences maximum
6. Use simple everyday words a normal person would use
7. Include minor imperfections or casual phrasing that real reviews have
8. If negative feedback is provided, incorporate it naturally and constructively
9. Vary sentence structure - don't start multiple sentences the same way
10. Sound like a text message or casual conversation, not a formal review

BANNED PATTERNS (never use these):
- Em dashes (—)
- "I highly recommend"
- "Exceptional/outstanding/remarkable"
- "Will definitely be back"
- "Can't recommend enough"
- Starting with "I recently visited"
- "The [noun] was impeccable"
- "From start to finish"
- Any corporate-sounding phrases

GOOD EXAMPLES of natural language:
- "Really good fish and chips here. Staff were friendly and the place was clean."
- "Went for lunch yesterday, food came out quick and tasted great. Parking was a bit tricky but worth it."
- "Nice spot for a quick bite. Nothing fancy but the portions are generous and prices are fair."
- "Food was solid, service was quick. Only downside was it got pretty busy around noon."

You will receive:
- A style/tone reference (the customer's selected prompt)
- The customer's answers to questions about their experience
- The business name

Generate ONE short, natural review that sounds like a real person wrote it on their phone.
Output ONLY the review text, nothing else.`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenRouter(messages, modelName) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in env');

  // Randomize temperature and top_p for more human-like variety
  const temperature = 0.85 + Math.random() * 0.25; // 0.85 - 1.1
  const top_p = 0.9 + Math.random() * 0.1; // 0.9 - 1.0
  const freq_penalty = Math.random() < 0.5 ? 0.2 : 0.4;
  const pres_penalty = Math.random() < 0.5 ? 0.1 : 0.3;

  const payload = {
    model: modelName,
    messages,
    temperature,
    top_p,
    max_tokens: 300,
    frequency_penalty: freq_penalty,
    presence_penalty: pres_penalty,
  };

  let resp;
  if (typeof GlobalAbortController === 'function') {
    const controller = new GlobalAbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    resp = await fetchFn(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } else {
    resp = await fetchFn(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!resp.ok) {
    const bodyText = await resp.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${resp.status}: ${bodyText}`);
  }

  const data = await resp.json();
  
  let text;
  if (data?.choices?.[0]?.message?.content) {
    text = data.choices[0].message.content;
  } else if (data?.output?.[0]?.content) {
    text = data.output[0].content;
  } else {
    throw new Error('Unexpected OpenRouter response shape');
  }

  return text.trim();
}

/**
 * Generate a human-like review based on user inputs
 * 
 * @param {Object} params
 * @param {string} params.selectedPrompt - The style/template the user selected
 * @param {Object} params.answers - User's answers to questions
 * @param {string} params.businessName - Name of the business
 * @returns {Promise<string>} Generated review text
 */
async function generateReview({ selectedPrompt, answers, businessName }) {
  // Build the user context
  const userContext = [];
  
  userContext.push(`Business: ${businessName || 'this place'}`);
  userContext.push(`\nStyle reference (match this tone loosely): "${selectedPrompt}"`);
  
  userContext.push(`\nCustomer's notes:`);
  
  if (answers.highlight && answers.highlight.trim()) {
    userContext.push(`- What stood out: ${answers.highlight}`);
  }
  
  if (answers.specific && answers.specific.trim()) {
    userContext.push(`- Specific mention: ${answers.specific}`);
  }
  
  if (answers.negative && answers.negative.trim()) {
    userContext.push(`- Could improve: ${answers.negative}`);
  }

  // If all answers are empty, use a minimal context
  const hasAnyAnswer = Object.values(answers).some(a => a && a.trim());
  if (!hasAnyAnswer) {
    userContext.push(`- (Customer skipped details, write a brief positive review based on the style reference)`);
  }

  const messages = [
    { role: 'system', content: REVIEW_GENERATION_PROMPT },
    { role: 'user', content: userContext.join('\n') },
  ];

  // Always try the primary model first, then fallback in order
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError;

  for (const modelName of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.info(`reviewGenerationService: calling ${modelName} attempt ${attempt}`);
        const review = await callOpenRouter(messages, modelName);

        // Post-process: remove any em dashes that slipped through
        let cleaned = review
          .replace(/—/g, ', ')
          .replace(/\s+/g, ' ')
          .trim();

        // Step 3: Add random human-like quirks (filler, punctuation, etc)
        if (Math.random() < 0.25) cleaned = cleaned.replace(/\./g, () => Math.random() < 0.5 ? '.' : '!');
        if (Math.random() < 0.15) cleaned = cleaned.replace(/\b(and|but|so)\b/gi, m => m + (Math.random() < 0.5 ? ', ' : ' '));
        if (Math.random() < 0.1) cleaned = cleaned.replace(/\bthe\b/gi, m => Math.random() < 0.5 ? m : '');

        // Step 4: If review is too similar to prompt, too generic, or template-like, retry
        const lower = cleaned.toLowerCase();
        const templatePhrases = [
          'template',
          'review generated',
          'this is a review',
          'as an ai',
          'i am an ai',
          'prompt',
          'sample',
          'example',
          'review for',
          'review of',
          'the food was good',
          'the service was good',
          'the experience was good',
        ];
        // Avoid content clustering and template-like phrasing
        if (
          templatePhrases.some(p => lower.includes(p)) ||
          lower === (selectedPrompt || '').toLowerCase().trim() ||
          /\b(thank you for visiting|highly recommend|will definitely be back|from start to finish|outstanding|remarkable|impeccable)\b/i.test(cleaned)
        ) {
          throw new Error('Template/generic pattern detected, retrying');
        }

        // Step 5: (Optional) Check against previous reviews for repetition (future: DB check)

        console.info(`reviewGenerationService: success with ${modelName}`);
        return cleaned;
      } catch (err) {
        console.error(`reviewGenerationService: ${modelName} attempt ${attempt} failed:`, err.message);
        lastError = err;
        if (err.message.includes('404')) break;
        if (attempt < 2) await sleep(1000);
      }
    }
  }

  throw lastError || new Error('All models failed');
}

module.exports = { generateReview };

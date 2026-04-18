// AI review assist service for Compose + Polish.
// Enforces strict FTC-safe constraints with deterministic post-checks.

let fetchFn = global.fetch;
let GlobalAbortController = global.AbortController;
if (!fetchFn) {
  try {
    // eslint-disable-next-line global-require
    fetchFn = require('node-fetch');
    try { GlobalAbortController = require('node-fetch').AbortController || GlobalAbortController; } catch (e) {}
  } catch (e) {
    throw new Error('No fetch available: please run on Node 18+ or install node-fetch');
  }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || 'google/gemma-3-27b-it:free';

const FTC_CONSTRAINTS = `
Hard constraints (must follow):
- Do not fabricate facts, experiences, timing, staff names, room details, or events not present in user input.
- Do not include unverifiable superiority/guarantee claims (e.g., "best", "#1", "guaranteed", "perfect", "always", "never fails").
- Do not include health, safety, legal, or medical assurances unless explicitly provided by user input.
- Do not imply compensation, rewards, gifts, discounts, or incentives for the review.
- Keep tone natural, factual, and balanced; avoid hype or exaggerated claims.
`;

const RISK_PATTERNS = [
  /\b(best|#1|number\s*one|guarantee(?:d)?|perfect|always|never\s+fails?|flawless)\b/i,
  /\b(100%|totally risk[- ]?free|no risk)\b/i,
  /\b(safe|safest|FDA|medically|clinically|legal guarantee)\b/i,
  /\b(paid|sponsored|gifted|discount|voucher|reward|compensated)\b/i,
];

function detectGuardrailViolations(text) {
  const s = String(text || '').trim();
  const hits = [];
  for (const p of RISK_PATTERNS) {
    if (p.test(s)) hits.push(p.toString());
  }
  return hits;
}

function extractText(data) {
  if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    return data.choices[0].message.content;
  }
  if (data && data.output && data.output[0] && data.output[0].content) {
    return data.output[0].content;
  }
  return '';
}

function normalizeReviewText(text) {
  return String(text || '')
    .replace(/^["'`\s]+|["'`\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function callOpenRouter(messages, model) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in env');

  const payload = {
    model,
    messages,
    temperature: 0.6,
    max_tokens: 240,
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
    throw new Error(`OpenRouter HTTP ${resp.status}: ${bodyText.slice(0, 160)}`);
  }
  const data = await resp.json();
  const text = extractText(data);
  if (!text) throw new Error('Empty response from model');
  return text;
}

async function generateWithGuardrails(buildMessages) {
  const models = [MODEL, FALLBACK_MODEL];
  for (const model of models) {
    try {
      const first = normalizeReviewText(await callOpenRouter(buildMessages(null), model));
      const firstViolations = detectGuardrailViolations(first);
      if (firstViolations.length === 0) return first;

      // One strict retry if deterministic checks found risk terms.
      const second = normalizeReviewText(await callOpenRouter(buildMessages({
        previousOutput: first,
        violations: firstViolations,
      }), model));
      const secondViolations = detectGuardrailViolations(second);
      if (secondViolations.length === 0) return second;
    } catch (err) {
      // Try fallback model next.
      console.warn(`reviewAssistService: model ${model} failed: ${err.message}`);
    }
  }
  throw new Error('Unable to generate FTC-safe review text');
}

function buildComposeMessages({ answers, skippedKeys }, strictRetry) {
  const system = `You write customer review drafts for hotels based only on user-provided facts.
${FTC_CONSTRAINTS}
Output only one short review paragraph, 40-90 words, plain text.`;

  const userPayload = {
    answers,
    skippedKeys,
  };
  let user = `Generate a hotel review draft from this JSON input:\n${JSON.stringify(userPayload)}`;
  if (strictRetry && strictRetry.previousOutput) {
    user += `\n\nYour prior output violated constraints (${strictRetry.violations.join(', ')}): "${strictRetry.previousOutput}".
Regenerate safely with stricter factual language.`;
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function buildPolishMessages({ reviewText }, strictRetry) {
  const system = `You polish customer-written hotel reviews for grammar, clarity, and sentence flow.
${FTC_CONSTRAINTS}
Do not add new facts. Keep original meaning. Output plain text only, 30-90 words.`;

  let user = `Polish this review text:\n"${reviewText}"`;
  if (strictRetry && strictRetry.previousOutput) {
    user += `\n\nYour prior output violated constraints (${strictRetry.violations.join(', ')}): "${strictRetry.previousOutput}".
Rewrite safely and factually without hype.`;
  }
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function composeFromAnswers({ answers = {}, skippedKeys = [] }) {
  if (!answers || typeof answers !== 'object') throw new Error('answers must be an object');
  const nonEmpty = Object.values(answers).filter((v) => String(v || '').trim().length > 0);
  if (nonEmpty.length < 1) throw new Error('At least 1 answered question is required');

  return generateWithGuardrails((strictRetry) => buildComposeMessages({ answers, skippedKeys }, strictRetry));
}

async function polishReview({ reviewText }) {
  const text = String(reviewText || '').trim();
  if (!text) throw new Error('reviewText is required');
  return generateWithGuardrails((strictRetry) => buildPolishMessages({ reviewText: text }, strictRetry));
}

module.exports = {
  composeFromAnswers,
  polishReview,
  // exported for tests
  __private: {
    detectGuardrailViolations,
    normalizeReviewText,
  },
};

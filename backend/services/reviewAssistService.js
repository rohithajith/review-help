// AI review assist service for Compose + Polish + Compose Question Generation.
// Enforces strict FTC-safe constraints with deterministic post-checks.

const crypto = require('crypto');

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
const COMPOSE_QUESTION_KEYS = [
  'visit_purpose',
  'service_quality',
  'staff_experience',
  'specific_highlight',
  'overall_recommendation',
];
const COMPOSE_QUESTION_CACHE_TTL_MS = Number(process.env.COMPOSE_QUESTION_CACHE_TTL_MS || 6 * 60 * 60 * 1000);
const composeQuestionCache = new Map();

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

function normalizeQuestionText(value, maxLen) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function normalizePlatforms(reviewPlatforms) {
  if (!Array.isArray(reviewPlatforms)) return [];
  return reviewPlatforms
    .map((platform) => ({
      name: normalizeQuestionText(platform && platform.name, 80),
      url: String(platform && platform.url ? platform.url : '').trim(),
    }))
    .filter((platform) => platform.name || platform.url);
}

function normalizeBusinessProfile(input) {
  const profile = input && typeof input === 'object' ? input : {};
  return {
    id: profile.id == null ? null : String(profile.id),
    name: normalizeQuestionText(profile.name, 120),
    businessType: normalizeQuestionText(profile.business_type || profile.businessType, 80),
    businessCategory: normalizeQuestionText(profile.business_category || profile.businessCategory, 80),
    welcomeMessage: normalizeQuestionText(profile.welcome_message || profile.welcomeMessage, 220),
    reviewPlatforms: normalizePlatforms(profile.review_platforms || profile.reviewPlatforms),
  };
}

function sanitizeComposeQuestions(rawQuestions, { strict = false } = {}) {
  if (!Array.isArray(rawQuestions)) {
    if (strict) throw new Error('compose_questions must be an array');
    return null;
  }
  if (rawQuestions.length !== COMPOSE_QUESTION_KEYS.length) {
    if (strict) throw new Error(`compose_questions must contain exactly ${COMPOSE_QUESTION_KEYS.length} items`);
    return null;
  }

  const normalized = [];
  for (let i = 0; i < COMPOSE_QUESTION_KEYS.length; i += 1) {
    const item = rawQuestions[i];
    if (!item || typeof item !== 'object') {
      if (strict) throw new Error(`compose_questions[${i}] must be an object`);
      return null;
    }
    const label = normalizeQuestionText(item.label, 160);
    const placeholder = normalizeQuestionText(item.placeholder, 200);
    if (!label) {
      if (strict) throw new Error(`compose_questions[${i}].label is required`);
      return null;
    }
    normalized.push({
      key: COMPOSE_QUESTION_KEYS[i],
      label,
      placeholder,
    });
  }
  return normalized;
}

function describeBusiness(profile) {
  const parts = [];
  if (profile.name) parts.push(`name: ${profile.name}`);
  if (profile.businessCategory) parts.push(`category: ${profile.businessCategory}`);
  if (profile.businessType) parts.push(`type: ${profile.businessType}`);
  if (profile.welcomeMessage) parts.push(`welcome message: ${profile.welcomeMessage}`);
  if (Array.isArray(profile.reviewPlatforms) && profile.reviewPlatforms.length > 0) {
    parts.push(`review platforms: ${profile.reviewPlatforms.map((p) => p.name).filter(Boolean).join(', ')}`);
  }
  return parts.length > 0 ? parts.join('; ') : 'generic local business';
}

function deriveExperienceNoun(profile) {
  const value = `${profile.businessCategory} ${profile.businessType}`.toLowerCase();
  if (/(nail|salon|barber|hair|stylist)/i.test(value)) return 'appointment';
  if (/(restaurant|cafe|coffee|bar|food|takeaway|kitchen)/i.test(value)) return 'visit';
  if (/(hotel|bnb|inn|stay|resort)/i.test(value)) return 'stay';
  if (/(clinic|dental|medical|therapy|wellness|spa|massage)/i.test(value)) return 'appointment';
  if (/(gym|fitness|training)/i.test(value)) return 'session';
  return 'experience';
}

function getBusinessAwareFallbackQuestions(rawProfile) {
  const profile = normalizeBusinessProfile(rawProfile);
  const experience = deriveExperienceNoun(profile);
  const category = profile.businessCategory || profile.businessType || 'service';
  const brandName = profile.name ? ` at ${profile.name}` : '';

  return sanitizeComposeQuestions([
    {
      label: `What brought you in for this ${experience}${brandName}?`,
      placeholder: `For example: regular ${category.toLowerCase()}, first-time visit, quick stop, special occasion.`,
    },
    {
      label: `What stood out about the quality of the ${category.toLowerCase()}?`,
      placeholder: 'Mention the detail that mattered most to you.',
    },
    {
      label: `How was the team/service during your ${experience}?`,
      placeholder: 'Friendly, professional, quick, attentive, etc.',
    },
    {
      label: 'What specific result or moment are you happiest with?',
      placeholder: 'Share one concrete outcome other customers would care about.',
    },
    {
      label: `How would you sum up your overall ${experience}?`,
      placeholder: 'Value for money, consistency, and whether you would return.',
    },
  ]);
}

function buildQuestionPromptMessages(rawProfile, strictRetry) {
  const profile = normalizeBusinessProfile(rawProfile);
  const system = `You create customer-facing review composition questions for small businesses.
Generate exactly ${COMPOSE_QUESTION_KEYS.length} questions tailored to the business context.
Each question must help a real customer write an honest review.
Return only a valid JSON array of objects with exactly two keys per item:
- "label": the question text
- "placeholder": a short hint/example for answering
No markdown. No commentary.`;

  let user = `Business context: ${describeBusiness(profile)}.
Create a balanced set of questions that cover purpose, quality, service, specifics, and overall impression.
Keep language plain and applicable to this business category.`;

  if (strictRetry && strictRetry.previousOutput) {
    user += `\n\nYour previous output was invalid for this task: "${strictRetry.previousOutput}". Return strict JSON only.`;
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function parseQuestionArray(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const candidates = [];
  candidates.push(text);
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) candidates.push(arrayMatch[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed)) continue;
      const normalizedInput = parsed.map((item) => {
        if (typeof item === 'string') {
          return { label: item, placeholder: '' };
        }
        if (!item || typeof item !== 'object') return null;
        return {
          label: item.label || item.question || item.prompt || item.text || '',
          placeholder: item.placeholder || item.hint || item.example || '',
        };
      });
      if (normalizedInput.some((item) => item == null)) continue;
      const sanitized = sanitizeComposeQuestions(normalizedInput);
      if (sanitized) return sanitized;
    } catch (err) {
      // Keep trying with other candidates.
    }
  }
  return null;
}

function buildComposeFingerprint(rawProfile) {
  const profile = normalizeBusinessProfile(rawProfile);
  const payload = JSON.stringify({
    id: profile.id || '',
    name: profile.name || '',
    businessType: profile.businessType || '',
    businessCategory: profile.businessCategory || '',
    welcomeMessage: profile.welcomeMessage || '',
    reviewPlatforms: profile.reviewPlatforms.map((p) => p.name || ''),
  });
  return crypto.createHash('sha1').update(payload).digest('hex');
}

function getComposeCacheKey(rawProfile) {
  const profile = normalizeBusinessProfile(rawProfile);
  return profile.id ? `business:${profile.id}` : `anon:${buildComposeFingerprint(profile)}`;
}

function readCachedComposeQuestions(rawProfile) {
  const cacheKey = getComposeCacheKey(rawProfile);
  const fingerprint = buildComposeFingerprint(rawProfile);
  const cached = composeQuestionCache.get(cacheKey);
  if (!cached) return null;
  if (cached.fingerprint !== fingerprint) return null;
  if (Date.now() - cached.createdAt > COMPOSE_QUESTION_CACHE_TTL_MS) return null;
  return cached.questions;
}

function writeCachedComposeQuestions(rawProfile, questions) {
  const cacheKey = getComposeCacheKey(rawProfile);
  const fingerprint = buildComposeFingerprint(rawProfile);
  composeQuestionCache.set(cacheKey, {
    fingerprint,
    questions,
    createdAt: Date.now(),
  });
}

async function callOpenRouter(messages, model, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in env');

  const payload = {
    model,
    messages,
    temperature: options.temperature == null ? 0.6 : options.temperature,
    max_tokens: options.maxTokens == null ? 240 : options.maxTokens,
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

async function generateComposeQuestionsWithAi(rawProfile) {
  const models = [MODEL, FALLBACK_MODEL];
  for (const model of models) {
    try {
      const firstRaw = await callOpenRouter(buildQuestionPromptMessages(rawProfile, null), model, {
        temperature: 0.55,
        maxTokens: 520,
      });
      const firstParsed = parseQuestionArray(firstRaw);
      if (firstParsed) return firstParsed;

      const retryRaw = await callOpenRouter(buildQuestionPromptMessages(rawProfile, {
        previousOutput: normalizeReviewText(firstRaw),
      }), model, {
        temperature: 0.35,
        maxTokens: 520,
      });
      const retryParsed = parseQuestionArray(retryRaw);
      if (retryParsed) return retryParsed;
    } catch (err) {
      console.warn(`reviewAssistService: compose question model ${model} failed: ${err.message}`);
    }
  }
  throw new Error('Unable to generate compose questions');
}

function buildComposeMessages({ answers, skippedKeys, businessProfile }, strictRetry) {
  const businessContext = describeBusiness(normalizeBusinessProfile(businessProfile));
  const system = `You write customer review drafts for local businesses based only on user-provided facts.
Business context: ${businessContext}
${FTC_CONSTRAINTS}
Output only one short review paragraph, 40-90 words, plain text.`;

  const userPayload = {
    answers,
    skippedKeys,
  };
  let user = `Generate a customer review draft from this JSON input:\n${JSON.stringify(userPayload)}`;
  if (strictRetry && strictRetry.previousOutput) {
    user += `\n\nYour prior output violated constraints (${strictRetry.violations.join(', ')}): "${strictRetry.previousOutput}".
Regenerate safely with stricter factual language.`;
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function buildPolishMessages({ reviewText, businessProfile }, strictRetry) {
  const businessContext = describeBusiness(normalizeBusinessProfile(businessProfile));
  const system = `You polish customer-written reviews for grammar, clarity, and sentence flow.
Business context: ${businessContext}
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

async function getComposeQuestions({ businessProfile = {}, adminQuestions = null }) {
  const normalizedAdminQuestions = sanitizeComposeQuestions(adminQuestions);
  if (normalizedAdminQuestions) {
    return { questions: normalizedAdminQuestions, source: 'admin' };
  }

  const cached = readCachedComposeQuestions(businessProfile);
  if (cached) {
    return { questions: cached, source: 'cache' };
  }

  try {
    const generated = await generateComposeQuestionsWithAi(businessProfile);
    writeCachedComposeQuestions(businessProfile, generated);
    return { questions: generated, source: 'ai' };
  } catch (err) {
    console.warn(`reviewAssistService: using compose question fallback: ${err.message}`);
    return { questions: getBusinessAwareFallbackQuestions(businessProfile), source: 'fallback' };
  }
}

async function composeFromAnswers({ answers = {}, skippedKeys = [], businessProfile = null }) {
  if (!answers || typeof answers !== 'object') throw new Error('answers must be an object');
  const nonEmpty = Object.values(answers).filter((v) => String(v || '').trim().length > 0);
  if (nonEmpty.length < 1) throw new Error('At least 1 answered question is required');

  return generateWithGuardrails((strictRetry) => buildComposeMessages({ answers, skippedKeys, businessProfile }, strictRetry));
}

async function polishReview({ reviewText, businessProfile = null }) {
  const text = String(reviewText || '').trim();
  if (!text) throw new Error('reviewText is required');
  return generateWithGuardrails((strictRetry) => buildPolishMessages({ reviewText: text, businessProfile }, strictRetry));
}

module.exports = {
  COMPOSE_QUESTION_KEYS,
  sanitizeComposeQuestions,
  getComposeQuestions,
  composeFromAnswers,
  polishReview,
  // exported for tests
  __private: {
    composeQuestionCache,
    detectGuardrailViolations,
    normalizeReviewText,
    normalizeBusinessProfile,
    parseQuestionArray,
    buildComposeFingerprint,
    getBusinessAwareFallbackQuestions,
    clearComposeQuestionCache: () => composeQuestionCache.clear(),
  },
};

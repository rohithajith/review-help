// Use native fetch if available (Node 18+), otherwise require node-fetch
let fetchFn = global.fetch;
let GlobalAbortController = global.AbortController;
if (!fetchFn) {
  try {
    // eslint-disable-next-line global-require
    fetchFn = require('node-fetch');
    // node-fetch v2 exposes AbortController separately in older versions; try to get it
    try { GlobalAbortController = require('node-fetch').AbortController || GlobalAbortController; } catch (e) {}
  } catch (e) {
    throw new Error('No fetch available: please run on Node 18+ or install node-fetch');
  }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || 'google/gemma-3-27b-it:free';
const SECOND_FALLBACK_MODEL = process.env.OPENROUTER_SECOND_FALLBACK_MODEL || 'openai/gpt-4o-mini';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const SIMILARITY_THRESHOLD = 0.85; // >85% similarity rejected

const SYSTEM_PROMPT = `You are generating review templates for a business based ONLY on real customer written reviews.
The input provided to you will always be 10 user-edited reviews written by real customers.

Your task:
- Learn their tone, sentence structure, emotional style, and level of detail
- Do NOT copy phrases, names, or sentences
- Do NOT repeat or rewrite the same reviews
- Generate 10 brand new, unique Google review templates that feel like they came from similar customers
- Mix themes: service, staff friendliness, atmosphere, pricing, food quality, experience, speed, hospitality, ambiance, etc.
- Keep each template 1–2 sentences maximum
- Sound natural, human, and non-robotic
- Avoid emojis
- Avoid obvious patterns or numbered style sentences
- Ensure no two generated templates sound alike
- Ensure none of them look like the input text itself
- Output must ONLY be a JSON array, nothing else, no explanation, no markdown

Format required:
["template 1", "template 2", ..., "template 10"]`;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function normalizeText(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function trigrams(s) {
  const t = normalizeText(s);
  const arr = [];
  for (let i = 0; i < t.length - 2; i++) {
    arr.push(t.substring(i, i + 3));
  }
  return arr;
}

function diceCoefficient(a, b) {
  if (!a || !b) return 0;
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.length === 0 || B.length === 0) return 0;
  const setA = new Map();
  for (const x of A) setA.set(x, (setA.get(x) || 0) + 1);
  let intersection = 0;
  for (const y of B) {
    const c = setA.get(y) || 0;
    if (c > 0) {
      intersection++;
      setA.set(y, c - 1);
    }
  }
  return (2.0 * intersection) / (A.length + B.length);
}

async function callOpenRouterSingleModel(inputsArray, modelName) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in env');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(inputsArray) }
  ];

  const payload = {
    model: modelName,
    messages,
    temperature: 0.8,
    top_p: 0.95,
    max_tokens: 800
  };

  let resp;
  if (typeof GlobalAbortController === 'function') {
    const controller = new GlobalAbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    resp = await fetchFn(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } else {
    resp = await fetchFn(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  if (!resp.ok) {
    const bodyText = await resp.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${resp.status} ${resp.statusText}: ${bodyText}`);
  }

  const data = await resp.json();
  let text;
  if (data && data.choices && data.choices[0] && data.choices[0].message) {
    text = data.choices[0].message.content;
  } else if (data && data.output && data.output[0] && data.output[0].content) {
    text = data.output[0].content;
  } else if (typeof data === 'string') {
    text = data;
  } else {
    throw new Error('Unexpected OpenRouter response shape');
  }

  if (!text || typeof text !== 'string') throw new Error('Empty response from model');
  return text;
}

async function callOpenRouterWithRetries(inputsArray) {
  const models = Array.from(new Set([MODEL, FALLBACK_MODEL, SECOND_FALLBACK_MODEL].filter(Boolean)));
  
  for (const modelName of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.info(`generationService: calling OpenRouter model=${modelName} attempt ${attempt}`);
        const result = await callOpenRouterSingleModel(inputsArray, modelName);
        console.info(`generationService: success with model=${modelName}`);
        return result;
      } catch (err) {
        console.error(`generationService: ${modelName} attempt ${attempt} failed:`, err && err.message ? err.message : err);
        
        // If it's a 404 (model not found), skip to fallback immediately
        if (err.message && err.message.includes('404')) {
          console.info(`generationService: model ${modelName} not found, trying fallback`);
          break;
        }
        
        if (attempt < MAX_RETRIES) {
          const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
          console.info(`generationService: retrying in ${backoff}ms`);
          await sleep(backoff);
          continue;
        }
        // Exhausted retries for this model, try fallback
        break;
      }
    }
  }
  
  throw new Error('All models failed after retries');
}

function validateGeneratedArray(rawText, inputsArray) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error('Failed to parse model output as JSON');
  }
  if (!Array.isArray(parsed) || parsed.length !== 10) {
    throw new Error('Model must return a JSON array of length 10');
  }
  const seen = new Set();
  for (const s of parsed) {
    if (typeof s !== 'string' || s.trim().length === 0) throw new Error('Each template must be a non-empty string');
    const norm = s.trim();
    if (seen.has(norm)) throw new Error('Duplicate templates in model output');
    seen.add(norm);

    for (const inp of inputsArray) {
      if (typeof inp === 'string' && inp.trim().length > 0) {
        const sim = diceCoefficient(norm, inp);
        if (sim >= SIMILARITY_THRESHOLD) {
          throw new Error('Generated template too similar to input');
        }
      }
    }
  }
  return parsed.map((p) => p.trim());
}

async function generateFromArchived(pool, businessId) {
  console.info('generationService: start generateFromArchived for businessId=', businessId);

  // 1) read 10 archived templates (oldest first) for this business
  const archivedRes = await pool.query('SELECT id, text FROM archived_templates WHERE business_id = $1 ORDER BY archived_at ASC LIMIT 10', [businessId]);
  if (!archivedRes || archivedRes.rowCount < 10) {
    console.info('generationService: not enough archived templates to trigger generation (need 10)');
    return;
  }
  const inputsArray = archivedRes.rows.map(r => r.text);

  // 2) call LLM with retries
  let rawText;
  try {
    rawText = await callOpenRouterWithRetries(inputsArray);
  } catch (llmErr) {
    console.error('generationService: LLM generation failed after retries', llmErr && llmErr.message ? llmErr.message : llmErr);
    return; // do not throw — keep system running
  }

  // 3) validate JSON response
  let generated;
  try {
    generated = validateGeneratedArray(rawText, inputsArray);
  } catch (vErr) {
    console.error('generationService: invalid model output:', vErr && vErr.message ? vErr.message : vErr);
    return;
  }

  // 4) Ensure uniqueness against current DB (review_templates + backup_templates)
  try {
    const existingRows = await pool.query('SELECT text FROM review_templates WHERE business_id = $1 UNION SELECT text FROM backup_templates WHERE business_id = $1', [businessId]);
    const existingSet = new Set((existingRows.rows || []).map(r => (r.text || '').trim().toLowerCase()));

    const finalList = [];
    for (const g of generated) {
      const lower = g.trim().toLowerCase();
      if (!existingSet.has(lower) && !finalList.map(x=>x.toLowerCase()).includes(lower)) {
        finalList.push(g);
      } else {
        console.warn('generationService: filtered duplicate generated template:', g);
      }
    }

    if (finalList.length !== 10) {
      console.error(`generationService: expected 10 unique new templates, got ${finalList.length}. Aborting backup refill.`);
      return;
    }

    // 5) replace backup_templates contents atomically
    await pool.query('BEGIN');
    // clear old backups for this business only
    await pool.query('DELETE FROM backup_templates WHERE business_id = $1', [businessId]);
    for (const t of finalList) {
      await pool.query('INSERT INTO backup_templates (business_id, text, created_at) VALUES ($1, $2, NOW())', [businessId, t]);
    }
    // 6) clear archived_templates for this business
    await pool.query('DELETE FROM archived_templates WHERE business_id = $1', [businessId]);
    await pool.query('COMMIT');

    console.info('generationService: successfully generated and stored 10 new backup templates');
  } catch (dbErr) {
    try { await pool.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('generationService: DB error while storing generated templates', dbErr && dbErr.message ? dbErr.message : dbErr);
    return;
  }
}

module.exports = { generateFromArchived };

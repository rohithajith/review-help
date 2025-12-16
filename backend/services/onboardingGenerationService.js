/**
 * Onboarding Template Generation Service
 * 
 * Generates initial review templates for new businesses based on their
 * business type and category using OpenRouter AI.
 */

// Use native fetch if available (Node 18+)
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
const MODEL = 'openai/gpt-4o-mini';
const FALLBACK_MODEL = 'google/gemma-3-27b-it:free';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

// Business categories organized by type
const BUSINESS_CATEGORIES = {
  business: [
    'Restaurant',
    'Cafe/Coffee Shop',
    'Salon/Barbershop',
    'Spa/Wellness',
    'Retail Store',
    'Hotel/B&B',
    'Gym/Fitness Center',
    'Auto Service',
    'Dental/Medical Clinic',
    'Legal/Professional Services',
    'Home Services',
    'Pet Services',
    'Other Business'
  ],
  freelancer: [
    'Hairdresser/Stylist',
    'Nail Technician',
    'Makeup Artist',
    'Massage Therapist',
    'Personal Trainer',
    'Photographer',
    'Tattoo Artist',
    'Tutor/Coach',
    'Consultant',
    'Handyman',
    'Cleaner',
    'Other Freelancer'
  ]
};

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Build an optimized prompt for generating review templates
 * This single prompt adapts intelligently to any business type/category
 */
function buildPrompt(businessType, category, businessName, count) {
  const isFreelancer = businessType === 'freelancer';
  
  const systemPrompt = `You are a review writing expert. Generate ${count} authentic Google review templates for: "${category}"${businessName ? ` (${businessName})` : ''}.

CRITICAL RULES:
1. Write as REAL customers - casual, genuine, specific
2. Each review: 1-2 sentences, 15-40 words
3. NO emojis, NO hashtags, NO "I recommend"
4. VARY: tone (enthusiastic/calm), focus (service/quality/value/atmosphere), length
5. Be SPECIFIC to "${category}" - mention what matters to customers of this exact service

${isFreelancer ? `FREELANCER FOCUS: Personal touch, individual skill, "she/he listened", booking ease, results` : `BUSINESS FOCUS: Team/staff, atmosphere, consistency, "this place", overall experience`}

GOOD EXAMPLES (adapt style, not content):
- "Finally found someone who actually listens. The results speak for themselves."
- "Third time here and the quality never disappoints. Fair prices too."
- "Wasn't sure what to expect but they exceeded every expectation."

BAD (avoid):
- "I would highly recommend this to anyone looking for..." (cliché)
- "The service was good and the staff was nice." (generic, boring)
- "5 stars! Amazing! Best ever!" (over the top)

OUTPUT: Return ONLY a JSON array of ${count} strings. No markdown, no explanation.
["review 1", "review 2", ...]`;

  return systemPrompt;
}

/**
 * Call OpenRouter API with retries
 */
async function callOpenRouter(prompt, count, model = MODEL) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in env');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.info(`onboardingGenerationService: OpenRouter attempt ${attempt}/${MAX_RETRIES} (${model})`);

      const payload = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: count * 60
      };

      const controller = new GlobalAbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const resp = await fetchFn(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${bodyText.slice(0, 100)}`);
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      
      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array found');
      
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
      
      // Validate and clean templates
      const valid = parsed
        .filter(s => typeof s === 'string' && s.length > 15 && s.length < 250)
        .map(s => s.trim().replace(/^["']|["']$/g, ''));
      
      if (valid.length < count * 0.7) {
        throw new Error(`Only ${valid.length}/${count} valid templates`);
      }
      
      console.info(`onboardingGenerationService: got ${valid.length} valid templates`);
      return valid.slice(0, count);
      
    } catch (err) {
      console.warn(`onboardingGenerationService: attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Try primary model, then fallback model
 */
async function generateTemplatesWithFallback(prompt, count) {
  // Try primary model first
  try {
    return await callOpenRouter(prompt, count, MODEL);
  } catch (err) {
    console.warn(`onboardingGenerationService: primary model failed, trying fallback: ${err.message}`);
  }
  
  // Try fallback model
  return await callOpenRouter(prompt, count, FALLBACK_MODEL);
}

/**
 * Generate initial templates for a new business
 * 
 * @param {object} pool - Database pool
 * @param {number} businessId - Business ID
 * @param {string} businessType - 'business' or 'freelancer'
 * @param {string} category - Business category (e.g., 'Restaurant', 'Hairdresser')
 * @param {string} businessName - Business name (optional)
 * @param {string} plan - Subscription plan ('Starter', 'Pro', 'Pro Max', 'Enterprise')
 * @returns {object} - { success: boolean, mainCount: number, backupCount: number, error?: string }
 */
async function generateOnboardingTemplates(pool, businessId, businessType, category, businessName, plan) {
  console.info(`onboardingGenerationService: generating for business ${businessId} (${category})`);
  
  const result = { success: false, mainCount: 0, backupCount: 0, source: 'none' };
  
  try {
    // Determine counts based on plan
    const mainCount = 10;
    const includeBackup = ['Pro', 'Pro Max', 'Enterprise'].includes(plan);
    const backupCount = includeBackup ? 10 : 0;
    const totalCount = mainCount + backupCount;
    
    // Build optimized prompt
    const prompt = buildPrompt(businessType, category, businessName, totalCount);
    
    // Generate templates
    let templates;
    try {
      templates = await generateTemplatesWithFallback(prompt, totalCount);
      result.source = 'ai';
    } catch (err) {
      console.warn(`onboardingGenerationService: AI failed (${err.message}), using fallback`);
      templates = getFallbackTemplates(businessType, category, totalCount);
      result.source = 'fallback';
    }
    
    // Ensure enough templates
    while (templates.length < totalCount) {
      templates.push(...getFallbackTemplates(businessType, category, totalCount - templates.length));
    }
    
    const mainTemplates = templates.slice(0, mainCount);
    const backupTemplates = templates.slice(mainCount, mainCount + backupCount);
    
    // Save to database
    await pool.query('BEGIN');
    await pool.query('DELETE FROM review_templates WHERE business_id = $1', [businessId]);
    await pool.query('DELETE FROM backup_templates WHERE business_id = $1', [businessId]);
    
    for (const text of mainTemplates) {
      await pool.query(
        'INSERT INTO review_templates (business_id, text, used, created_at) VALUES ($1, $2, false, NOW())',
        [businessId, text]
      );
    }
    
    for (const text of backupTemplates) {
      await pool.query(
        'INSERT INTO backup_templates (business_id, text, created_at) VALUES ($1, $2, NOW())',
        [businessId, text]
      );
    }
    
    await pool.query('COMMIT');
    
    result.success = true;
    result.mainCount = mainTemplates.length;
    result.backupCount = backupTemplates.length;
    
    console.info(`onboardingGenerationService: done - ${result.mainCount} main + ${result.backupCount} backup (${result.source})`);
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (e) {}
    console.error(`onboardingGenerationService: error: ${err.message}`);
    result.error = err.message;
  }
  
  return result;
}

/**
 * Get fallback templates if AI generation fails
 */
function getFallbackTemplates(businessType, category, count) {
  const isFreelancer = businessType === 'freelancer';
  
  const templates = isFreelancer ? [
    "Finally found someone who actually listens and delivers exactly what I asked for.",
    "Been coming here for months now. Consistent quality every single time.",
    "The attention to detail is incredible. You can tell they genuinely care about their work.",
    "Wasn't sure what to expect but the results exceeded my expectations.",
    "So glad a friend recommended them. Best decision I've made in a while.",
    "Professional from start to finish. Made the whole process so easy.",
    "They took the time to understand exactly what I wanted. Really appreciated that.",
    "Third visit and still impressed. The quality never drops.",
    "Fair prices and amazing results. What more could you ask for?",
    "Left feeling so happy with the outcome. Already booked my next appointment.",
    "Such a pleasant experience. Friendly, professional, and talented.",
    "They really know what they're doing. The expertise shows in the results.",
    "Couldn't be happier! The work speaks for itself.",
    "Finally found my go-to person for this. Not going anywhere else.",
    "Took my vague ideas and turned them into exactly what I envisioned.",
    "Quick, efficient, and the quality is top-notch. Highly impressed.",
    "The whole experience was seamless. Communication was excellent throughout.",
    "Worth every penny. The results lasted way longer than expected.",
    "Made me feel comfortable from the moment I walked in. Very welcoming.",
    "Genuine skill and passion for what they do. It really shows."
  ] : [
    "Great atmosphere and even better service. This place gets it right.",
    "The whole team was friendly and professional. Will definitely be back.",
    "Been coming here for a while and the quality never disappoints.",
    "Clean, welcoming, and the staff made us feel right at home.",
    "Finally found a place I can trust. Fair prices and great results.",
    "The attention to detail here is impressive. You can tell they care.",
    "Quick service without sacrificing quality. Exactly what I needed.",
    "This place exceeded my expectations in every way.",
    "Brought friends here and they were just as impressed as I was.",
    "Consistent quality every time we visit. That's hard to find.",
    "The staff went above and beyond to make sure we were satisfied.",
    "Great value for what you get. Will definitely recommend to others.",
    "Such a pleasant experience from start to finish.",
    "Everything was exactly as promised. No surprises, just quality.",
    "This has become our regular spot. The team here is fantastic.",
    "Clean, professional, and the results speak for themselves.",
    "They really take the time to get things right. Much appreciated.",
    "Best in the area. We've tried others but keep coming back here.",
    "The experience was seamless. Everything just worked.",
    "Impressed by how much they care about customer satisfaction."
  ];
  
  // Shuffle to avoid same order every time
  for (let i = templates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [templates[i], templates[j]] = [templates[j], templates[i]];
  }
  
  return templates.slice(0, count);
}

module.exports = {
  generateOnboardingTemplates,
  BUSINESS_CATEGORIES
};

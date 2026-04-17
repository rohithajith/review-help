const { getAdminPool } = require('../tenantManager');
const { BUSINESS_CATEGORIES } = require('../services/onboardingGenerationService');
const { isBillingBypassUser, applyBillingBypassShape } = require('../lib/billingBypass');
const VALID_SIGNUP_PLANS = new Set(['Starter', 'Pro', 'Pro Max']);

function parsePreferredBusinessId(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function listOwnedBusinesses(pool, userId) {
  const { rows } = await pool.query(
    `SELECT b.id, b.name, b.plan, b.google_review_url, b.logo_url, b.welcome_message, b.review_platforms,
            b.billing_required, b.billing_status, b.pending_plan, b.trial_ends_at, bo.role
     FROM business_owners bo
     JOIN businesses b ON bo.business_id = b.id
     WHERE bo.user_id = $1
     ORDER BY b.id`,
    [userId]
  );
  return rows;
}

exports.getMe = async (req, res, next) => {
  try {
    const pool = getAdminPool();
    const user = req.user;
    const userId = req.userId;
    if (!user || !userId) return res.status(401).json({ error: 'Unauthorized' });

    await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email',
      [userId, user.email || null]
    );

    const bypassBilling = isBillingBypassUser(user);
    const businesses = (await listOwnedBusinesses(pool, userId)).map((b) =>
      applyBillingBypassShape(b, bypassBilling)
    );
    const preferredBusinessId = parsePreferredBusinessId(req.query && req.query.businessId);
    const defaultBusinessId = (
      preferredBusinessId && businesses.some((b) => Number(b.id) === preferredBusinessId)
    )
      ? preferredBusinessId
      : (businesses[0] ? Number(businesses[0].id) : null);

    res.json({
      user: { id: userId, email: user.email || null },
      businesses,
      hasBusinesses: businesses.length > 0,
      defaultBusinessId,
    });
  } catch (err) {
    next(err);
  }
};

exports.onboard = async (req, res, next) => {
  try {
    const pool = getAdminPool();
    const user = req.user;
    const userId = req.userId;
    if (!user || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      business_name, 
      google_review_url, 
      logo_url, 
      welcome_message,
      business_type,    // 'business' or 'freelancer'
      business_category, // e.g., 'Restaurant', 'Hairdresser'
      selected_plan
    } = req.body || {};
    const preferredBusinessId = parsePreferredBusinessId(req.body && req.body.businessId);
    const requestedPlan = String(selected_plan || 'Starter').trim();
    const bypassBilling = isBillingBypassUser(user);
    if (!VALID_SIGNUP_PLANS.has(requestedPlan)) {
      return res.status(400).json({ error: 'selected_plan must be one of: Starter, Pro, Pro Max' });
    }

    // Upsert user into users table
    await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email',
      [userId, user.email || null]
    );

    // If user already owns business(es), return an existing one instead of creating another.
    const ownedBusinesses = (await listOwnedBusinesses(pool, userId)).map((b) =>
      applyBillingBypassShape(b, bypassBilling)
    );
    if (ownedBusinesses.length > 0) {
      const selected = (
        preferredBusinessId && ownedBusinesses.some((b) => Number(b.id) === preferredBusinessId)
      )
        ? ownedBusinesses.find((b) => Number(b.id) === preferredBusinessId)
        : ownedBusinesses[0];
      return res.json({ 
        businessId: selected.id, 
        name: selected.name, 
        plan: selected.plan,
        billingRequired: Boolean(selected.billing_required),
        billingStatus: String(selected.billing_status || 'active'),
        pendingPlan: selected.pending_plan || null,
        trialEndsAt: selected.trial_ends_at || null,
        businesses: ownedBusinesses,
        defaultBusinessId: selected.id,
        adminUrl: `/#/business/${selected.id}/admin`, 
        publicUrl: `/#/business/${selected.id}`,
        existing: true
      });
    }

    // Otherwise create a new business for this user
    const rawName = business_name || (user.email ? `${user.email.split('@')[0]}'s Business` : 'New Business');
    const name = String(rawName).trim();
    if (!name || name.length > 120) {
      return res.status(400).json({ error: 'business_name must be between 1 and 120 characters' });
    }

    // Plan is only activated after webhook confirmation.
    // New signups start in pending billing state.
    const actualPlan = 'Starter';
    const billingRequired = !bypassBilling;
    const billingStatus = bypassBilling ? 'active' : 'pending';
    const pendingPlan = bypassBilling ? null : requestedPlan;
    
    const insert = await pool.query(
      `INSERT INTO businesses (
         name, google_review_url, logo_url, welcome_message,
         business_type, business_category, plan,
         billing_required, billing_status, pending_plan
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, plan, billing_required, billing_status, pending_plan, trial_ends_at`,
      [
        name,
        google_review_url || null,
        logo_url || null,
        welcome_message || null,
        business_type || null,
        business_category || null,
        actualPlan,
        billingRequired,
        billingStatus,
        pendingPlan,
      ]
    );
    const businessId = insert.rows[0].id;

    // Map user as owner
    await pool.query('INSERT INTO business_owners (business_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (business_id, user_id) DO NOTHING', [businessId, userId, 'owner']);

    // Return immediately. Template generation happens only after successful payment webhook.
    res.status(201).json({ 
      businessId, 
      name: insert.rows[0].name, 
      plan: actualPlan,
      billingRequired: Boolean(insert.rows[0].billing_required),
      billingStatus: String(insert.rows[0].billing_status || (bypassBilling ? 'active' : 'pending')),
      pendingPlan: insert.rows[0].pending_plan || (bypassBilling ? null : requestedPlan),
      trialEndsAt: insert.rows[0].trial_ends_at || null,
      businesses: [{
        id: businessId,
        name: insert.rows[0].name,
        plan: actualPlan,
        billing_required: billingRequired,
        billing_status: billingStatus,
        pending_plan: pendingPlan,
        trial_ends_at: null,
        role: 'owner',
      }],
      defaultBusinessId: businessId,
      adminUrl: `/#/business/${businessId}/admin`, 
      publicUrl: `/#/business/${businessId}`,
      templatesGenerating: false
    });
  } catch (err) {
    next(err);
  }
};

// Endpoint to get available business categories
exports.getBusinessCategories = (req, res) => {
  res.json(BUSINESS_CATEGORIES);
};

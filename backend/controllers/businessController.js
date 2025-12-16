const { getAdminPool } = require('../tenantManager');
const bcrypt = require('bcryptjs');

/**
 * Business Controller for Supabase Shared DB
 * 
 * Manages business registration and lookup.
 * All businesses share the same Supabase database.
 */

exports.createBusiness = async (req, res, next) => {
  const { name, google_review_url, logo_url, welcome_message } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Business name is required' });
  }

  try {
    const pool = getAdminPool();
    
    // Insert the new business
    const result = await pool.query(
      `INSERT INTO businesses (name, google_review_url, logo_url, welcome_message) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, google_review_url || null, logo_url || null, welcome_message || null]
    );
    
    const businessId = result.rows[0].id;
    // Note: seeding is disabled for Supabase-based deployments. Supabase
    // is the source of truth for templates and should already contain
    // any required data. If you need to seed demo data, use the
    // `scripts/seedSharedTenant.js` helper (or run SQL manually).

    // If request is authenticated, map the creating user as owner
    try {
      const userId = req.userId;
      if (userId) {
        // Ensure user exists in users table (idempotent)
        await pool.query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email', [userId, (req.user && req.user.email) || null]);
        // Map to business_owners
        await pool.query('INSERT INTO business_owners (business_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (business_id, user_id) DO NOTHING', [businessId, userId, 'owner']);
      }
    } catch (mapErr) {
      console.warn('Failed to assign owner mapping for new business:', mapErr && mapErr.message ? mapErr.message : mapErr);
    }

    res.status(201).json({ id: businessId, name });
  } catch (err) {
    next(err);
  }
};

exports.listBusinesses = async (req, res, next) => {
  try {
    const pool = getAdminPool();
    const { rows } = await pool.query(
      'SELECT id, name, google_review_url, logo_url, welcome_message, review_platforms, plan, created_at FROM businesses ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getBusiness = async (req, res, next) => {
  const businessId = req.businessId || req.params.businessId;
  try {
    const pool = getAdminPool();
    const { rows } = await pool.query(
      'SELECT id, name, google_review_url, logo_url, welcome_message, review_platforms, plan FROM businesses WHERE id = $1',
      [businessId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateBusiness = async (req, res, next) => {
  const businessId = req.businessId || req.params.businessId;
  const { name, google_review_url, logo_url, welcome_message, review_platforms } = req.body;
  
  try {
    const pool = getAdminPool();
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (google_review_url !== undefined) {
      updates.push(`google_review_url = $${paramCount++}`);
      values.push(google_review_url);
    }
    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(logo_url);
    }
    if (welcome_message !== undefined) {
      updates.push(`welcome_message = $${paramCount++}`);
      values.push(welcome_message);
    }
    if (review_platforms !== undefined) {
      updates.push(`review_platforms = $${paramCount++}`);
      values.push(JSON.stringify(review_platforms));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(businessId);
    const sql = `UPDATE businesses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// Create a dummy owner user in Supabase Auth and map to this business
exports.createDummyOwner = async (req, res, next) => {
  try {
    const allow = process.env.ALLOW_DUMMY_OWNER === 'true' || process.env.NODE_ENV !== 'production';
    if (!allow) return res.status(403).json({ error: 'Dummy owner creation is disabled in production' });

    const pool = getAdminPool();
    const businessId = req.businessId || req.params.businessId;
    if (!businessId) return res.status(400).json({ error: 'businessId is required' });

    const email = (req.body && req.body.email) ? String(req.body.email).trim() : `dummy+${businessId}@example.com`;
    const password = (req.body && req.body.password) ? String(req.body.password) : `Password123!`;

    const supabase = require('../lib/supabaseClient');
    if (!supabase || !supabase.auth || !supabase.auth.admin || typeof supabase.auth.admin.createUser !== 'function') {
      return res.status(500).json({ error: 'Supabase admin client not available on server' });
    }

    // create user via Supabase admin API
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      return res.status(500).json({ error: 'Failed to create Supabase user', detail: error.message || error });
    }
    const user = data.user || data;
    const userId = user.id;

    // persist in users table and mapping
    await pool.query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email', [userId, email]);
    await pool.query('INSERT INTO business_owners (business_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (business_id, user_id) DO NOTHING', [businessId, userId, 'owner']);

    res.status(201).json({ message: 'Dummy owner created', user: { id: userId, email }, password: password });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// Business Admin Authentication
// =============================================================================

/**
 * Set or update admin credentials for a business
 * POST /:businessId/admin/credentials
 */
exports.setAdminCredentials = async (req, res, next) => {
  const businessId = req.businessId || req.params.businessId;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    const pool = getAdminPool();
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Upsert credentials
    await pool.query(`
      INSERT INTO business_admin_credentials (business_id, username, password_hash, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (business_id) 
      DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, updated_at = NOW()
    `, [businessId, username, passwordHash]);

    res.json({ success: true, message: 'Admin credentials saved' });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify admin credentials for a business
 * POST /:businessId/admin/login
 */
exports.verifyAdminLogin = async (req, res, next) => {
  const businessId = req.businessId || req.params.businessId;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = getAdminPool();

    // Get stored credentials
    const { rows } = await pool.query(
      'SELECT username, password_hash FROM business_admin_credentials WHERE business_id = $1',
      [businessId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Admin credentials not configured for this business' });
    }

    const storedUsername = rows[0].username;
    const storedHash = rows[0].password_hash;

    // Verify username
    if (username !== storedUsername) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate a simple session token (in production, use JWT)
    const token = Buffer.from(`${businessId}:${username}:${Date.now()}`).toString('base64');

    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      businessId: parseInt(businessId)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Check if admin credentials exist for a business
 * GET /:businessId/admin/has-credentials
 */
exports.hasAdminCredentials = async (req, res, next) => {
  const businessId = req.businessId || req.params.businessId;

  try {
    const pool = getAdminPool();
    const { rows } = await pool.query(
      'SELECT 1 FROM business_admin_credentials WHERE business_id = $1',
      [businessId]
    );

    res.json({ hasCredentials: rows.length > 0 });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// Plan Management
// =============================================================================

/**
 * Get the plan for a business
 * GET /:businessId/plan
 */
exports.getPlan = async (req, res, next) => {
  const businessId = req.businessId || req.params.businessId;

  try {
    const pool = getAdminPool();
    const { rows } = await pool.query(
      'SELECT plan, stripe_customer_id, stripe_subscription_id FROM businesses WHERE id = $1',
      [businessId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const { plan, stripe_customer_id, stripe_subscription_id } = rows[0];
    const { getPlanLimits } = require('../middleware/planMiddleware');

    res.json({
      plan: plan || 'Starter',
      limits: getPlanLimits(plan || 'Starter'),
      stripeCustomerId: stripe_customer_id || null,
      stripeSubscriptionId: stripe_subscription_id || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update the plan for a business (admin/owner only)
 * PUT /:businessId/plan
 */
exports.updatePlan = async (req, res, next) => {
  const businessId = req.businessId || req.params.businessId;
  const { plan } = req.body;

  const validPlans = ['Starter', 'Free', 'Pro', 'Pro Max', 'Enterprise'];
  if (!plan || !validPlans.includes(plan)) {
    return res.status(400).json({ error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
  }

  try {
    const pool = getAdminPool();
    const { rows } = await pool.query(
      'UPDATE businesses SET plan = $1 WHERE id = $2 RETURNING plan',
      [plan, businessId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const { getPlanLimits } = require('../middleware/planMiddleware');

    res.json({
      success: true,
      plan: rows[0].plan,
      limits: getPlanLimits(rows[0].plan),
    });
  } catch (err) {
    next(err);
  }
};

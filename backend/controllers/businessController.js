const { getAdminPool, seedBusinessTemplates } = require('../tenantManager');

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
    // Seed default templates for this business
    await seedBusinessTemplates(businessId);

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
      'SELECT id, name, google_review_url, logo_url, welcome_message, created_at FROM businesses ORDER BY id'
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
      'SELECT id, name, google_review_url, logo_url, welcome_message FROM businesses WHERE id = $1',
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
  const { name, google_review_url, logo_url, welcome_message } = req.body;
  
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

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

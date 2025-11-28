const { getAdminPool, seedBusinessTemplates } = require('../tenantManager');

exports.onboard = async (req, res, next) => {
  try {
    const pool = getAdminPool();
    const user = req.user;
    const userId = req.userId;
    if (!user || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const { business_name, google_review_url, logo_url, welcome_message } = req.body || {};

    // Upsert user into users table
    await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email',
      [userId, user.email || null]
    );

    // If user already owns a business, return that first one
    const { rows: existing } = await pool.query(
      'SELECT b.id, b.name FROM business_owners bo JOIN businesses b ON bo.business_id = b.id WHERE bo.user_id = $1 ORDER BY b.id LIMIT 1',
      [userId]
    );
    if (existing && existing.length > 0) {
      const biz = existing[0];
      return res.json({ businessId: biz.id, name: biz.name, adminUrl: `/#/business/${biz.id}/admin`, publicUrl: `/#/business/${biz.id}` });
    }

    // Otherwise create a new business for this user
    const name = business_name || (user.email ? `${user.email.split('@')[0]}'s Business` : 'New Business');
    const insert = await pool.query(
      'INSERT INTO businesses (name, google_review_url, logo_url, welcome_message) VALUES ($1, $2, $3, $4) RETURNING id, name',
      [name, google_review_url || null, logo_url || null, welcome_message || null]
    );
    const businessId = insert.rows[0].id;

    // Seed templates for this business
    try { await seedBusinessTemplates(businessId); } catch (e) { console.warn('Failed to seed templates:', e && e.message ? e.message : e); }

    // Map user as owner
    await pool.query('INSERT INTO business_owners (business_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (business_id, user_id) DO NOTHING', [businessId, userId, 'owner']);

    res.status(201).json({ businessId, name: insert.rows[0].name, adminUrl: `/#/business/${businessId}/admin`, publicUrl: `/#/business/${businessId}` });
  } catch (err) {
    next(err);
  }
};

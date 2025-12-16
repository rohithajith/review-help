const { getAdminPool } = require('../tenantManager');
const { generateOnboardingTemplates, BUSINESS_CATEGORIES } = require('../services/onboardingGenerationService');

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
      plan              // e.g., 'Starter', 'Pro', 'Pro Max'
    } = req.body || {};

    // Upsert user into users table
    await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email',
      [userId, user.email || null]
    );

    // If user already owns a business, return that first one
    const { rows: existing } = await pool.query(
      'SELECT b.id, b.name, b.plan FROM business_owners bo JOIN businesses b ON bo.business_id = b.id WHERE bo.user_id = $1 ORDER BY b.id LIMIT 1',
      [userId]
    );
    if (existing && existing.length > 0) {
      const biz = existing[0];
      return res.json({ 
        businessId: biz.id, 
        name: biz.name, 
        plan: biz.plan,
        adminUrl: `/#/business/${biz.id}/admin`, 
        publicUrl: `/#/business/${biz.id}`,
        existing: true
      });
    }

    // Otherwise create a new business for this user
    const name = business_name || (user.email ? `${user.email.split('@')[0]}'s Business` : 'New Business');
    const actualPlan = plan || 'Starter';
    
    const insert = await pool.query(
      `INSERT INTO businesses (name, google_review_url, logo_url, welcome_message, business_type, business_category, plan) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, plan`,
      [name, google_review_url || null, logo_url || null, welcome_message || null, business_type || null, business_category || null, actualPlan]
    );
    const businessId = insert.rows[0].id;

    // Map user as owner
    await pool.query('INSERT INTO business_owners (business_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (business_id, user_id) DO NOTHING', [businessId, userId, 'owner']);

    // Generate AI templates if business type and category are provided
    let templateGeneration = null;
    if (business_type && business_category) {
      // Run template generation asynchronously (don't block the response)
      templateGeneration = generateOnboardingTemplates(pool, businessId, business_type, business_category, name, actualPlan)
        .catch(err => {
          console.error('onboard: template generation failed:', err.message);
          return { success: false, error: err.message };
        });
    }

    // Return immediately, templates will be generated in background
    res.status(201).json({ 
      businessId, 
      name: insert.rows[0].name, 
      plan: actualPlan,
      adminUrl: `/#/business/${businessId}/admin`, 
      publicUrl: `/#/business/${businessId}`,
      templatesGenerating: !!business_type && !!business_category
    });

    // Wait for template generation to complete (non-blocking to response)
    if (templateGeneration) {
      const result = await templateGeneration;
      console.info(`onboard: template generation completed for business ${businessId}:`, result);
    }
  } catch (err) {
    next(err);
  }
};

// Endpoint to get available business categories
exports.getBusinessCategories = (req, res) => {
  res.json(BUSINESS_CATEGORIES);
};

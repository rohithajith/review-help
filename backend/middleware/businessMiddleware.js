const { getAdminPool } = require('../tenantManager');

// Allowed businessId: alphanumeric, hyphen, underscore, max 50 chars
const BUSINESS_ID_RE = /^[A-Za-z0-9_-]{1,50}$/;

/**
 * Business Middleware for Supabase Shared DB
 * 
 * Validates businessId from URL params and attaches:
 *   - req.businessId: the validated business ID
 *   - req.db: the shared Supabase/Postgres pool
 * 
 * All data isolation is done via business_id in queries (not separate DBs).
 */
module.exports = async (req, res, next) => {
  try {
    let { businessId } = req.params;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required in the path' });
    }
    
    businessId = String(businessId).trim();
    if (!BUSINESS_ID_RE.test(businessId)) {
      return res.status(400).json({ error: 'Invalid businessId format' });
    }

    // Use the shared Supabase pool for all requests
    // Data is scoped by business_id in controllers
    const pool = getAdminPool();
    
    req.businessId = businessId;
    req.db = pool;
    next();
  } catch (err) {
    next(err);
  }
};

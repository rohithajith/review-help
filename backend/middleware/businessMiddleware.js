const { getAdminPool } = require('../tenantManager');

// Business IDs are numeric (SERIAL in Postgres).
const BUSINESS_ID_RE = /^[1-9]\d{0,9}$/;

/**
 * Business Middleware for Supabase Shared DB
 * 
 * Validates numeric businessId from URL params and attaches:
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
      return res.status(400).json({ error: 'Invalid businessId format (must be a positive integer)' });
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

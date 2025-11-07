const { getTenantPool, getAdminPool, createTenantDatabase } = require('../tenantManager');

// Allowed businessId: alphanumeric, hyphen, underscore, max 50 chars
const BUSINESS_ID_RE = /^[A-Za-z0-9_-]{1,50}$/;

// Middleware: validate businessId, attach tenant pg Pool as req.db
module.exports = async (req, res, next) => {
  try {
    let { businessId } = req.params;
    if (!businessId) return res.status(400).json({ error: 'businessId is required in the path' });
    businessId = String(businessId).trim();
    if (!BUSINESS_ID_RE.test(businessId)) return res.status(400).json({ error: 'Invalid businessId format' });

    // Lookup the tenant pool using the sanitized id (from tenants.json or env)
    let pool = getTenantPool(businessId);
    if (!pool) {
      // If businessId looks like an integer, try to resolve tenant_connection from admin DB
      const asNum = Number(businessId);
      if (Number.isInteger(asNum) && asNum > 0) {
        try {
          const admin = getAdminPool();
          const { rows } = await admin.query('SELECT tenant_connection FROM businesses WHERE id = $1', [asNum]);
          if (rows && rows.length > 0 && rows[0].tenant_connection) {
            // Ensure tenant DB exists / migrate and get pool (cache under numeric id)
            pool = await createTenantDatabase(rows[0].tenant_connection, String(asNum));
          }
        } catch (e) {
          return next(e);
        }
      }
    }

    if (!pool) return res.status(404).json({ error: 'Tenant database not configured for this businessId' });

    req.businessId = businessId;
    req.db = pool; // pg.Pool
    next();
  } catch (err) {
    next(err);
  }
};

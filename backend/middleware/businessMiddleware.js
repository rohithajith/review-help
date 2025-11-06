const { getTenantPool } = require('../tenantManager');

// Middleware: attach tenant pg Pool to req.db
module.exports = async (req, res, next) => {
  const { businessId } = req.params;
  if (!businessId) return res.status(400).json({ error: 'businessId is required in the path' });
  const idNum = Number(businessId);
  if (!Number.isInteger(idNum) || idNum <= 0) return res.status(400).json({ error: 'Invalid businessId' });

  const pool = getTenantPool(idNum.toString());
  if (!pool) return res.status(404).json({ error: 'Tenant database not configured for this businessId' });

  req.businessId = idNum;
  req.db = pool; // pg.Pool
  next();
};

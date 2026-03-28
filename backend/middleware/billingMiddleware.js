const { getAdminPool } = require('../tenantManager');

function normalizeBusinessId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = async (req, res, next) => {
  try {
    const pool = req.db || getAdminPool();
    const businessId = normalizeBusinessId(
      req.businessId || (req.params && req.params.businessId) || (req.body && req.body.businessId)
    );

    if (!businessId) {
      return res.status(400).json({ error: 'Missing or invalid businessId' });
    }

    const { rows } = await pool.query(
      'SELECT billing_required, billing_status, pending_plan FROM businesses WHERE id = $1',
      [businessId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const billingRequired = Boolean(rows[0].billing_required);
    const billingStatus = String(rows[0].billing_status || 'active').toLowerCase();
    const pendingPlan = rows[0].pending_plan || null;

    req.billingRequired = billingRequired;
    req.billingStatus = billingStatus;
    req.pendingPlan = pendingPlan;

    if (billingRequired && billingStatus !== 'active') {
      return res.status(402).json({
        error: 'Payment required',
        businessId: String(businessId),
        billingStatus,
        pendingPlan,
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};


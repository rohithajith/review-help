/**
 * Plan Middleware - Gate routes by subscription plan level
 */

const { getAdminPool } = require('../tenantManager');

// Plan hierarchy (higher index = more features)
const PLAN_LEVELS = {
  'Starter': 0,
  'Free': 0,
  'Pro': 1,
  'Pro Max': 2,
  'Enterprise': 3,
};

/**
 * Get plan limits for a given plan
 */
function getPlanLimits(plan) {
  const limits = {
    'Starter': { businesses: 1, platforms: 1, templates: 10, aiGeneration: false, customBranding: false },
    'Free': { businesses: 1, platforms: 1, templates: 10, aiGeneration: false, customBranding: false },
    'Pro': { businesses: 2, platforms: 2, templates: Infinity, aiGeneration: true, customBranding: false },
    'Pro Max': { businesses: 5, platforms: 3, templates: Infinity, aiGeneration: true, customBranding: true },
    'Enterprise': { businesses: Infinity, platforms: Infinity, templates: Infinity, aiGeneration: true, customBranding: true },
  };
  return limits[plan] || limits['Starter'];
}

/**
 * Middleware factory to require a minimum plan level
 * @param {string[]} allowedPlans - Array of plan names that are allowed (e.g. ['Pro', 'Pro Max', 'Enterprise'])
 */
function requirePlan(allowedPlans) {
  return async (req, res, next) => {
    try {
      const businessId = req.businessId || req.params.businessId;
      if (!businessId) {
        return res.status(400).json({ error: 'Business ID required' });
      }

      const pool = getAdminPool();
      const { rows } = await pool.query('SELECT plan FROM businesses WHERE id = $1', [businessId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      const currentPlan = rows[0].plan || 'Starter';
      req.businessPlan = currentPlan;
      req.planLimits = getPlanLimits(currentPlan);

      if (!allowedPlans.includes(currentPlan)) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          currentPlan,
          requiredPlans: allowedPlans,
          message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}. Your current plan is ${currentPlan}.`,
        });
      }

      next();
    } catch (err) {
      console.error('requirePlan middleware error:', err);
      next(err);
    }
  };
}

/**
 * Middleware to attach plan info to the request (does not block)
 */
async function attachPlanInfo(req, res, next) {
  try {
    const businessId = req.businessId || req.params.businessId;
    if (!businessId) {
      return next();
    }

    const pool = getAdminPool();
    const { rows } = await pool.query('SELECT plan FROM businesses WHERE id = $1', [businessId]);
    
    if (rows.length > 0) {
      const currentPlan = rows[0].plan || 'Starter';
      req.businessPlan = currentPlan;
      req.planLimits = getPlanLimits(currentPlan);
    }
    next();
  } catch (err) {
    console.warn('attachPlanInfo error:', err.message);
    next();
  }
}

module.exports = {
  requirePlan,
  attachPlanInfo,
  getPlanLimits,
  PLAN_LEVELS,
};

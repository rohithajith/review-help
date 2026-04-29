const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');
const ownerMiddleware = require('../middleware/ownerMiddleware');
const { requireAdminApiKey } = require('../middleware/adminKeyMiddleware');
const templateGenerationJob = require('../jobs/templateGenerationJob');
const { getAdminPool } = require('../tenantManager');


const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const attachBusinessContext = (req, res, next) => {
  req.businessId = req.params.businessId;
  req.db = getAdminPool();
  next();
};
// Create a new business (authenticated users become owner)
router.post('/', authMiddleware, asyncHandler(businessController.createBusiness));

// List businesses for the authenticated owner
router.get('/', authMiddleware, asyncHandler(businessController.listBusinesses));

// =============================================================================
// AI Template Generation Routes (Super Admin)
// =============================================================================

// Get generation status for ALL businesses
router.get('/generation/status', requireAdminApiKey, asyncHandler(async (req, res) => {
  const result = await templateGenerationJob.getGenerationStatus();
  res.json(result);
}));

// Trigger generation for ALL businesses that need it
router.post('/generation/trigger-all', requireAdminApiKey, asyncHandler(async (req, res) => {
  // Run in background, don't block the response
  setImmediate(async () => {
    try {
      await templateGenerationJob.runGenerationJobForAll();
    } catch (err) {
      console.error('[API] Background generation job failed:', err.message);
    }
  });
  
  res.json({ 
    message: 'Generation job triggered for all businesses in background',
    note: 'Check /api/businesses/generation/status for results'
  });
}));

// =============================================================================
// Plan Management Routes
// =============================================================================

// Get plan for a specific business
router.get('/:businessId/plan', authMiddleware, attachBusinessContext, ownerMiddleware, asyncHandler(businessController.getPlan));

// Upload a business logo to persistent storage (Supabase Storage)
router.post('/:businessId/logo', authMiddleware, attachBusinessContext, ownerMiddleware, asyncHandler(businessController.uploadLogo));

// Update plan for a business (owner only in production; open in dev for testing)
router.put('/:businessId/plan', authMiddleware, attachBusinessContext, ownerMiddleware, requireAdminApiKey, asyncHandler(businessController.updatePlan));

module.exports = router;

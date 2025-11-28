const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');
const templateGenerationJob = require('../jobs/templateGenerationJob');


const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Create a new business (authenticated users become owner)
router.post('/', authMiddleware, asyncHandler(businessController.createBusiness));

// List all businesses
router.get('/', asyncHandler(businessController.listBusinesses));

// =============================================================================
// AI Template Generation Routes (Super Admin)
// =============================================================================

// Get generation status for ALL businesses
router.get('/generation/status', asyncHandler(async (req, res) => {
  const result = await templateGenerationJob.getGenerationStatus();
  res.json(result);
}));

// Trigger generation for ALL businesses that need it
router.post('/generation/trigger-all', asyncHandler(async (req, res) => {
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
// Business Admin Authentication Routes
// =============================================================================

// Check if business has admin credentials configured
router.get('/:businessId/admin/has-credentials', asyncHandler(businessController.hasAdminCredentials));

// Set/update admin credentials for a business
router.post('/:businessId/admin/credentials', asyncHandler(businessController.setAdminCredentials));

// Verify admin login
router.post('/:businessId/admin/login', asyncHandler(businessController.verifyAdminLogin));

module.exports = router;

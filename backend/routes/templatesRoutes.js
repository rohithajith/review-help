const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router({ mergeParams: true });
const templatesController = require('../controllers/templatesController');
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');
const ownerMiddleware = require('../middleware/ownerMiddleware');
const { requirePlan, attachPlanInfo } = require('../middleware/planMiddleware');
const templateGenerationJob = require('../jobs/templateGenerationJob');

// helper to forward async errors to centralized handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Get all active templates
router.get('/templates', asyncHandler(templatesController.getActiveTemplates));

// Get business details for the current tenant
router.get('/business', asyncHandler(businessController.getBusiness));

// Update business details for the current tenant
router.put('/business', asyncHandler(businessController.updateBusiness));

// Note: this router is mounted under /api/:businessId so templatesController
// uses req.db (attached by businessMiddleware) to talk to that tenant's DB.

// Mark a template as used
router.post('/templates/:id/use', [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.markTemplateAsUsed));

// Create a dummy owner for development/testing (creates Supabase user + maps to business)
// Guarded: only allowed when ALLOW_DUMMY_OWNER=true or NODE_ENV != 'production'
router.post('/owners/dummy', asyncHandler(businessController.createDummyOwner));

// Get all used templates (admin feature)
router.get('/templates/used', authMiddleware, ownerMiddleware, asyncHandler(templatesController.getUsedTemplates));

// Rephrase and return a used template to the active pool (admin feature)
router.post('/templates/:id/rephrase', authMiddleware, ownerMiddleware, [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.rephraseTemplate));

// Create a new template (admin feature)
router.post('/templates', authMiddleware, ownerMiddleware, [body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.createTemplate));

// Bulk delete templates (admin feature) - MUST come before /templates/:id
router.delete('/templates/bulk', authMiddleware, ownerMiddleware, [body('ids').isArray({ min: 1 })], asyncHandler(templatesController.bulkDeleteTemplates));

// Update an existing template (admin feature)
router.put('/templates/:id', authMiddleware, ownerMiddleware, [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.updateTemplate));

// Delete a template (admin feature)
router.delete('/templates/:id', authMiddleware, ownerMiddleware, [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.deleteTemplate));

// Backup templates routes (admin features)
router.get('/templates/backups', authMiddleware, ownerMiddleware, asyncHandler(templatesController.getBackupTemplates));
router.post('/templates/backups', authMiddleware, ownerMiddleware, [body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.createBackupTemplate));
router.put('/templates/backups/:id', authMiddleware, ownerMiddleware, [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.updateBackupTemplate));
router.delete('/templates/backups/:id', authMiddleware, ownerMiddleware, [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.deleteBackupTemplate));

// =============================================================================
// AI Template Generation Routes (Background Job Triggers)
// Requires Pro plan or higher for AI generation
// =============================================================================

// Get generation status for this business
router.get('/templates/generation/status', asyncHandler(async (req, res) => {
  const result = await templateGenerationJob.getGenerationStatus();
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  // Filter to just this business
  const businessStatus = result.businesses.find(b => b.id === parseInt(req.businessId, 10));
  res.json(businessStatus || { error: 'Business not found' });
}));

// Manually trigger generation for this business (requires Pro+ plan)
router.post('/templates/generation/trigger', requirePlan(['Pro', 'Pro Max', 'Enterprise']), asyncHandler(async (req, res) => {
  const businessId = parseInt(req.businessId, 10);
  
  // Run in background, don't block the response
  setImmediate(async () => {
    try {
      await templateGenerationJob.runGenerationForBusiness(businessId);
    } catch (err) {
      console.error(`[API] Background generation failed for business ${businessId}:`, err.message);
    }
  });
  
  res.json({ 
    message: 'Generation job triggered in background',
    businessId,
    note: 'Check /templates/generation/status for results'
  });
}));

module.exports = router;
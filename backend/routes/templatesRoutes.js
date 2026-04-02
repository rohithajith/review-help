const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router({ mergeParams: true });
const rateLimit = require('express-rate-limit');
const templatesController = require('../controllers/templatesController');
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');
const ownerMiddleware = require('../middleware/ownerMiddleware');
const billingMiddleware = require('../middleware/billingMiddleware');
const { requireAdminApiKey } = require('../middleware/adminKeyMiddleware');
const { requirePlan } = require('../middleware/planMiddleware');
const templateGenerationJob = require('../jobs/templateGenerationJob');

// helper to forward async errors to centralized handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ownerWithBilling = [authMiddleware, ownerMiddleware, billingMiddleware];

const publicWriteLimiter = rateLimit({
  windowMs: Number(process.env.PUBLIC_WRITE_WINDOW_MS || 60_000),
  max: Number(process.env.PUBLIC_WRITE_RATE_LIMIT_MAX || 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const publicAiLimiter = rateLimit({
  windowMs: Number(process.env.AI_WINDOW_MS || 60_000),
  max: Number(process.env.AI_RATE_LIMIT_MAX || 12),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please try again later.' },
});
// Get all active templates
router.get('/templates', asyncHandler(templatesController.getActiveTemplates));

// Submit and save an in-app review
router.post(
  '/reviews',
  publicWriteLimiter,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('reviewText').isString().trim().isLength({ min: 1 }),
    body('templateId').optional().isInt({ gt: 0 }),
  ],
  asyncHandler(templatesController.submitReview)
);

// Get all in-app reviews for My Reviews (owner-only)
router.get('/reviews', ...ownerWithBilling, asyncHandler(templatesController.getMyReviews));

// Compose review from guided Q&A answers (public)
router.post(
  '/reviews/compose',
  publicAiLimiter,
  [
    body('answers').isObject(),
    body('skippedKeys').optional().isArray(),
  ],
  asyncHandler(templatesController.composeReview)
);

// Polish review text with AI (public)
router.post(
  '/reviews/polish',
  publicAiLimiter,
  [
    body('reviewText').isString().trim().isLength({ min: 1, max: 2000 }),
  ],
  asyncHandler(templatesController.polishReview)
);

// Revoke consent for a specific review (admin feature)
router.post(
  '/reviews/:id/consent/revoke',
  ...ownerWithBilling,
  [param('id').isInt({ gt: 0 })],
  asyncHandler(templatesController.revokeReviewConsent)
);

// Get business details for the current tenant
router.get('/business', asyncHandler(businessController.getBusiness));

// Update business details for the current tenant (owner only)
router.put('/business', ...ownerWithBilling, asyncHandler(businessController.updateBusiness));

// Verify that current authenticated user can access this business admin
router.get('/admin/access', ...ownerWithBilling, asyncHandler(async (req, res) => {
  res.json({ ok: true, role: req.userRole || 'owner' });
}));

// Note: this router is mounted under /api/:businessId so templatesController
// uses req.db (attached by businessMiddleware) to talk to that tenant's DB.

// Mark a template as used
router.post('/templates/:id/use', ...ownerWithBilling, [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.markTemplateAsUsed));

// Create a dummy owner for development/testing (creates Supabase user + maps to business)
// Guarded: only allowed when ALLOW_DUMMY_OWNER=true or NODE_ENV != 'production'
router.post('/owners/dummy', requireAdminApiKey, asyncHandler(businessController.createDummyOwner));

// Get all used templates (admin feature)
router.get('/templates/used', ...ownerWithBilling, asyncHandler(templatesController.getUsedTemplates));

// Rephrase and return a used template to the active pool (admin feature)
router.post('/templates/:id/rephrase', ...ownerWithBilling, [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.rephraseTemplate));

// Create a new template (admin feature)
router.post('/templates', ...ownerWithBilling, [body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.createTemplate));

// Bulk delete templates (admin feature) - MUST come before /templates/:id
router.delete('/templates/bulk', ...ownerWithBilling, [body('ids').isArray({ min: 1 })], asyncHandler(templatesController.bulkDeleteTemplates));

// Update an existing template (admin feature)
router.put('/templates/:id', ...ownerWithBilling, [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.updateTemplate));

// Delete a template (admin feature)
router.delete('/templates/:id', ...ownerWithBilling, [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.deleteTemplate));

// Backup templates routes (admin features)
router.get('/templates/backups', ...ownerWithBilling, asyncHandler(templatesController.getBackupTemplates));
router.post('/templates/backups', ...ownerWithBilling, [body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.createBackupTemplate));
router.put('/templates/backups/:id', ...ownerWithBilling, [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.updateBackupTemplate));
router.delete('/templates/backups/:id', ...ownerWithBilling, [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.deleteBackupTemplate));

// =============================================================================
// AI Template Generation Routes (Background Job Triggers)
// Requires Pro plan or higher for AI generation
// =============================================================================

// Get generation status for this business
router.get('/templates/generation/status', ...ownerWithBilling, asyncHandler(async (req, res) => {
  const result = await templateGenerationJob.getGenerationStatus();
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  // Filter to just this business
  const businessStatus = result.businesses.find(b => b.id === parseInt(req.businessId, 10));
  res.json(businessStatus || { error: 'Business not found' });
}));

// Manually trigger generation for this business (requires Pro+ plan)
router.post('/templates/generation/trigger', ...ownerWithBilling, requirePlan(['Pro', 'Pro Max', 'Enterprise']), asyncHandler(async (req, res) => {
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

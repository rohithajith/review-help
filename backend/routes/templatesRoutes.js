const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router({ mergeParams: true });
const templatesController = require('../controllers/templatesController');
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');
const ownerMiddleware = require('../middleware/ownerMiddleware');

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

module.exports = router;
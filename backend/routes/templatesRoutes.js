const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router({ mergeParams: true });
const templatesController = require('../controllers/templatesController');
const businessController = require('../controllers/businessController');

// helper to forward async errors to centralized handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Get all active templates
router.get('/templates', asyncHandler(templatesController.getActiveTemplates));

// Get business details for the current tenant
router.get('/business', asyncHandler(businessController.getBusiness));

// Note: this router is mounted under /api/:businessId so templatesController
// uses req.db (attached by businessMiddleware) to talk to that tenant's DB.

// Mark a template as used
router.post('/templates/:id/use', [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.markTemplateAsUsed));

// Get all used templates (admin feature)
router.get('/templates/used', asyncHandler(templatesController.getUsedTemplates));

// Rephrase and return a used template to the active pool (admin feature)
router.post('/templates/:id/rephrase', [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.rephraseTemplate));

// Create a new template (admin feature)
router.post('/templates', [body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.createTemplate));

// Update an existing template (admin feature)
router.put('/templates/:id', [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], asyncHandler(templatesController.updateTemplate));

// Delete a template (admin feature)
router.delete('/templates/:id', [param('id').isInt({ gt: 0 })], asyncHandler(templatesController.deleteTemplate));

// Bulk delete templates (admin feature)
router.delete('/templates/bulk', [body('ids').isArray({ min: 1 })], asyncHandler(templatesController.bulkDeleteTemplates));

module.exports = router;
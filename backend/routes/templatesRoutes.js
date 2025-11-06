const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router({ mergeParams: true });
const templatesController = require('../controllers/templatesController');
const businessController = require('../controllers/businessController');

// Get all active templates
router.get('/templates', templatesController.getActiveTemplates);

// Get business details for the current tenant
router.get('/business', businessController.getBusiness);

// Note: this router is mounted under /api/:businessId so templatesController
// uses req.db (attached by businessMiddleware) to talk to that tenant's DB.

// Mark a template as used
router.post('/templates/:id/use', [param('id').isInt({ gt: 0 })], templatesController.markTemplateAsUsed);

// Get all used templates (admin feature)
router.get('/templates/used', templatesController.getUsedTemplates);

// Rephrase and return a used template to the active pool (admin feature)
router.post('/templates/:id/rephrase', [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], templatesController.rephraseTemplate);

// Create a new template (admin feature)
router.post('/templates', [body('text').isString().trim().isLength({ min: 1 })], templatesController.createTemplate);

// Update an existing template (admin feature)
router.put('/templates/:id', [param('id').isInt({ gt: 0 }), body('text').isString().trim().isLength({ min: 1 })], templatesController.updateTemplate);

// Delete a template (admin feature)
router.delete('/templates/:id', [param('id').isInt({ gt: 0 })], templatesController.deleteTemplate);

// Bulk delete templates (admin feature)
router.delete('/templates/bulk', [body('ids').isArray({ min: 1 })], templatesController.bulkDeleteTemplates);

module.exports = router;
const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templatesController');

// Get all active templates
router.get('/templates', templatesController.getActiveTemplates);

// Mark a template as used
router.post('/templates/:id/use', templatesController.markTemplateAsUsed);

// Get all used templates (admin feature)
router.get('/templates/used', templatesController.getUsedTemplates);

// Rephrase and return a used template to the active pool (admin feature)
router.post('/templates/:id/rephrase', templatesController.rephraseTemplate);

module.exports = router;
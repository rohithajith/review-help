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

 // Create a new template (admin feature)
 router.post('/templates', templatesController.createTemplate);

 // Update an existing template (admin feature)
 router.put('/templates/:id', templatesController.updateTemplate);

 // Delete a template (admin feature)
 router.delete('/templates/:id', templatesController.deleteTemplate);

 // Bulk delete templates (admin feature)
 router.delete('/templates/bulk', templatesController.bulkDeleteTemplates);

 module.exports = router;
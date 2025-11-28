const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');


const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Create a new business (authenticated users become owner)
router.post('/', authMiddleware, asyncHandler(businessController.createBusiness));

// List all businesses
router.get('/', asyncHandler(businessController.listBusinesses));

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

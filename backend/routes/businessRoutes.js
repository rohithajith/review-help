const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');


const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Create a new business (authenticated users become owner)
router.post('/', authMiddleware, asyncHandler(businessController.createBusiness));

// List all businesses
router.get('/', asyncHandler(businessController.listBusinesses));

module.exports = router;

const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Create a new business (public)
router.post('/', asyncHandler(businessController.createBusiness));

// List all businesses
router.get('/', asyncHandler(businessController.listBusinesses));

module.exports = router;

const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

// Create a new business (public)
router.post('/', businessController.createBusiness);

// List all businesses
router.get('/', businessController.listBusinesses);

module.exports = router;

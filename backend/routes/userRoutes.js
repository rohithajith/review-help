const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Get available business categories (public endpoint)
router.get('/business-categories', userController.getBusinessCategories);

// Onboard a signed-in user: create business if none, map owner, return URLs
router.post('/onboard', authMiddleware, userController.onboard);

module.exports = router;

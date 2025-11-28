const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Onboard a signed-in user: create business if none, map owner, return URLs
router.post('/onboard', authMiddleware, userController.onboard);

module.exports = router;

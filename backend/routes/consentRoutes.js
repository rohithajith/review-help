const express = require('express');
const { body } = require('express-validator');
const templatesController = require('../controllers/templatesController');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public consent revocation endpoint using secure token
router.post(
  '/consent/revoke',
  [body('token').isString().trim().isLength({ min: 10 })],
  asyncHandler(templatesController.revokeConsentByToken)
);

// Public review deletion endpoint using revoke token
router.post(
  '/revoke',
  [body('token').isString().trim().isLength({ min: 10 })],
  asyncHandler(templatesController.revokeReviewByToken)
);

module.exports = router;

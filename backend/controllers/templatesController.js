const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { getAdminPool } = require('../tenantManager');
const reviewAssistService = require('../services/reviewAssistService');

const CONSENT_STATEMENT_VERSION = 'v1';
const CONSENT_STATEMENT_TEXT = 'I allow this business to use my review in marketing and public content (for example website, social media, or promotional materials). I can revoke this permission later using my revoke link.';

function hashConsentToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Get all active templates for the tenant
exports.getActiveTemplates = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  try {
    const { rows } = await pool.query('SELECT * FROM review_templates WHERE used = false AND business_id = $1 ORDER BY created_at DESC', [businessId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Submit a customer review directly to My Reviews (in-app review first)
exports.submitReview = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const templateId = req.body.templateId ? Number(req.body.templateId) : null;
  const rating = Number(req.body.rating);
  const reviewText = String(req.body.reviewText || '').trim();
  const consentAccepted = req.body.consentAccepted === true || req.body.consentAccepted === 'true';

  if (templateId && !consentAccepted) {
    return res.status(400).json({ message: 'Consent is required before submitting a template-based review' });
  }

  try {
    if (templateId) {
      const check = await pool.query(
        'SELECT id FROM review_templates WHERE id = $1 AND business_id = $2 LIMIT 1',
        [templateId, businessId]
      );
      if (check.rowCount === 0) {
        return res.status(404).json({ message: 'Template not found for this business' });
      }
    }

    const revokeToken = consentAccepted ? crypto.randomBytes(32).toString('hex') : null;
    const consentTokenHash = revokeToken ? hashConsentToken(revokeToken) : null;

    const inserted = await pool.query(
      `INSERT INTO customer_reviews (
        business_id, template_id, rating, review_text, created_at,
        consent_granted, consent_granted_at, consent_statement_version, consent_statement_text, consent_token_hash
      )
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9)
      RETURNING id, business_id, template_id, rating, review_text, created_at, consent_granted, consent_granted_at, consent_revoked_at`,
      [
        businessId,
        templateId,
        rating,
        reviewText,
        consentAccepted,
        consentAccepted ? new Date() : null,
        consentAccepted ? CONSENT_STATEMENT_VERSION : null,
        consentAccepted ? CONSENT_STATEMENT_TEXT : null,
        consentTokenHash,
      ]
    );
    const host = (typeof req.get === 'function' && req.get('host')) ? req.get('host') : 'localhost';
    const protocol = req.protocol || 'http';

    res.status(201).json({
      message: 'Review taken',
      review: inserted.rows[0],
      revokeConsentUrl: revokeToken ? `${protocol}://${host}/#/reviews/revoke-consent?token=${encodeURIComponent(revokeToken)}` : null,
      revokeAvailable: Boolean(revokeToken),
      consentStatementVersion: consentAccepted ? CONSENT_STATEMENT_VERSION : null,
    });
  } catch (err) {
    next(err);
  }
};

// List all submitted reviews for this business (My Reviews)
exports.getMyReviews = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  try {
    const { rows } = await pool.query(
      `SELECT id, business_id, template_id, rating, review_text, created_at,
              consent_granted, consent_granted_at, consent_revoked_at
       FROM customer_reviews
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [businessId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Compose review via guided answers (public endpoint)
exports.composeReview = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const answers = req.body && typeof req.body.answers === 'object' ? req.body.answers : {};
  const skippedKeys = Array.isArray(req.body && req.body.skippedKeys) ? req.body.skippedKeys : [];
  const nonEmptyCount = Object.values(answers).filter((v) => String(v || '').trim().length > 0).length;

  if (nonEmptyCount < 1) {
    return res.status(400).json({ message: 'Please answer at least 1 question to generate a review.' });
  }

  try {
    const reviewText = await reviewAssistService.composeFromAnswers({ answers, skippedKeys });
    return res.json({ reviewText });
  } catch (err) {
    return res.status(422).json({ message: err.message || 'Could not generate review at the moment.' });
  }
};

// Polish user-provided review text via AI (public endpoint)
exports.polishReview = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const reviewText = String((req.body && req.body.reviewText) || '').trim();
  if (!reviewText) return res.status(400).json({ message: 'reviewText is required' });

  try {
    const polished = await reviewAssistService.polishReview({ reviewText });
    return res.json({ reviewText: polished });
  } catch (err) {
    return res.status(422).json({ message: err.message || 'Could not polish review at the moment.' });
  }
};

// Revoke consent by public token (idempotent)
exports.revokeConsentByToken = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const token = String(req.body.token || '').trim();
  if (!token) return res.status(400).json({ message: 'token is required' });

  try {
    const pool = getAdminPool();
    const tokenHash = hashConsentToken(token);
    const existing = await pool.query(
      'SELECT id, consent_revoked_at FROM customer_reviews WHERE consent_token_hash = $1 LIMIT 1',
      [tokenHash]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: 'Invalid or expired revocation token' });
    }

    if (existing.rows[0].consent_revoked_at) {
      return res.json({
        message: 'Consent already revoked',
        revoked: true,
        alreadyRevoked: true,
      });
    }

    const updated = await pool.query(
      `UPDATE customer_reviews
       SET consent_revoked_at = NOW()
       WHERE consent_token_hash = $1
       RETURNING id, consent_revoked_at`,
      [tokenHash]
    );

    return res.json({
      message: 'Consent revoked successfully',
      revoked: true,
      alreadyRevoked: false,
      reviewId: updated.rows[0].id,
      revokedAt: updated.rows[0].consent_revoked_at,
    });
  } catch (err) {
    next(err);
  }
};

// Mark a template as used, archive the edited text, rotate in a backup, and trigger generation when needed
const generationService = require('../services/generationService');

exports.markTemplateAsUsed = async (req, res, next) => {
  const pool = req.db;
  const id = Number(req.params.id);
  const businessId = req.businessId;

  // validate incoming body (express-validator already added in route)
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const modifiedText = req.body.modifiedText;
  if (!modifiedText || typeof modifiedText !== 'string' || modifiedText.trim().length === 0) {
    return res.status(400).json({ message: 'modifiedText is required' });
  }

  try {
    await pool.query('BEGIN');

    // ensure the template exists in active pool for this business
    const check = await pool.query('SELECT * FROM review_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
    if (check.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Template not found' });
    }

    // 1) archive the edited text (user-provided)
    await pool.query('INSERT INTO archived_templates (business_id, text, archived_at) VALUES ($1, $2, NOW())', [businessId, modifiedText]);

    // 2) attempt to select one backup to promote (we will insert replacement first to maintain count atomically)
    const next = await pool.query('SELECT * FROM backup_templates WHERE business_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE', [businessId]);
    let replaced = false;
    if (next.rowCount > 0) {
      const nextRow = next.rows[0];
      // insert backup into active pool BEFORE removing the active template so the DB never has <10 active after commit
      await pool.query('INSERT INTO review_templates (business_id, text, used, created_at) VALUES ($1, $2, false, NOW())', [businessId, nextRow.text]);
      // delete the backup row we just promoted
      await pool.query('DELETE FROM backup_templates WHERE id = $1 AND business_id = $2', [nextRow.id, businessId]);
      // now remove the original active template
      await pool.query('DELETE FROM review_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
      replaced = true;
    } else {
      // backup empty: insert a safe fallback template so UI never sees <10 active
      const fallback = 'Thank you for visiting — we appreciate your feedback.';
      await pool.query('INSERT INTO review_templates (business_id, text, used, created_at) VALUES ($1, $2, false, NOW())', [businessId, fallback]);
      // remove the original active template after inserting fallback
      await pool.query('DELETE FROM review_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
      replaced = false;
      // schedule an urgent background generation to refill backups
      setImmediate(() => {
        generationService.generateFromArchived(pool, businessId)
          .then(() => console.info('generationService: urgent refill triggered'))
          .catch(err => console.error('generationService urgent refill error:', err && err.stack ? err.stack : err));
      });
    }

    await pool.query('COMMIT');

    // After commit, check archived count; if 10 -> trigger regeneration pipeline
    try {
      const { rows } = await pool.query('SELECT COUNT(*) FROM archived_templates WHERE business_id = $1', [businessId]);
      const count = Number(rows[0].count);
      console.info(`templatesController: archived_templates count=${count}`);
      if (count >= 10) {
        // schedule background generation (non-blocking)
        setImmediate(() => {
          generationService.generateFromArchived(pool, businessId)
            .then(() => console.info('generationService: triggered generation job (background)'))
            .catch(err => console.error('generationService background error:', err && err.stack ? err.stack : err));
        });
      }
    } catch (chkErr) {
      console.error('Error checking archived_templates count after commit', chkErr);
    }

    res.json({ message: 'Template archived and rotated', replaced });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (e) { /* ignore */ }
    next(err);
  }
};

// Get all used templates for the tenant (admin feature)
exports.getUsedTemplates = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  try {
    const { rows } = await pool.query('SELECT * FROM review_templates WHERE used = true AND business_id = $1 ORDER BY created_at DESC', [businessId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

 // Rephrase and return a used template to the active pool (admin feature)
// Rephrase a used or archived template and return to active pool (admin feature)
exports.rephraseTemplate = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const text = req.body.text;
  if (!text) return res.status(400).json({ message: 'Text is required' });
  try {
    const result = await pool.query('INSERT INTO review_templates (business_id, text, used, created_at) VALUES ($1, $2, false, NOW()) RETURNING id', [businessId, text]);
    res.json({ message: 'Template rephrased and returned to active pool', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
};

 // Create a new template (admin feature)
// Create a new template for the tenant
exports.createTemplate = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Template text is required' });
  try {
    const result = await pool.query('INSERT INTO review_templates (business_id, text, used, created_at) VALUES ($1, $2, false, NOW()) RETURNING id', [businessId, text]);
    res.status(201).json({ message: 'Template created successfully', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
};

 // Update an existing template (admin feature)
// Update an existing template for the tenant
exports.updateTemplate = async (req, res, next) => {
  const pool = req.db;
  const { text } = req.body;
  const { id } = req.params;
  const businessId = req.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (!text) return res.status(400).json({ message: 'Template text is required' });
  try {
    const check = await pool.query('SELECT * FROM review_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
    if (check.rowCount === 0) return res.status(404).json({ message: 'Template not found' });
    await pool.query('UPDATE review_templates SET text = $1 WHERE id = $2 AND business_id = $3', [text, id, businessId]);
    res.json({ message: 'Template updated successfully' });
  } catch (err) {
    next(err);
  }
};

 // Delete a template (admin feature)
// Delete a template for the tenant
exports.deleteTemplate = async (req, res, next) => {
  const pool = req.db;
  const { id } = req.params;
  const businessId = req.businessId;
  try {
    const check = await pool.query('SELECT * FROM review_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
    if (check.rowCount === 0) return res.status(404).json({ message: 'Template not found' });
    await pool.query('DELETE FROM review_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    next(err);
  }
};

 // Bulk delete templates (admin feature)
// Bulk delete templates for tenant
exports.bulkDeleteTemplates = async (req, res, next) => {
  const pool = req.db;
  const { ids } = req.body;
  const businessId = req.businessId;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Valid template IDs are required' });
  const sanitized = ids.map((i) => Number(i)).filter(Number.isInteger);
  if (sanitized.length === 0) return res.status(400).json({ message: 'No valid ids supplied' });
  const placeholders = sanitized.map((_, i) => `$${i + 1}`).join(',');
  try {
    // Ensure tenant scoping by business_id
    const sql = `DELETE FROM review_templates WHERE id IN (${placeholders}) AND business_id = $${sanitized.length + 1}`;
    const params = sanitized.concat([businessId]);
    const resq = await pool.query(sql, params);
    res.json({ message: 'Templates deleted successfully', count: resq.rowCount });
  } catch (err) {
    next(err);
  }
};

// -- Backup templates management (admin features) --
exports.getBackupTemplates = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  try {
    const { rows } = await pool.query('SELECT * FROM backup_templates WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.createBackupTemplate = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Template text is required' });
  try {
    const result = await pool.query('INSERT INTO backup_templates (business_id, text, created_at) VALUES ($1, $2, NOW()) RETURNING id', [businessId, text]);
    res.status(201).json({ message: 'Backup template created', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
};

exports.updateBackupTemplate = async (req, res, next) => {
  const pool = req.db;
  const { id } = req.params;
  const { text } = req.body;
  const businessId = req.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (!text) return res.status(400).json({ message: 'Template text is required' });
  try {
    const check = await pool.query('SELECT * FROM backup_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
    if (check.rowCount === 0) return res.status(404).json({ message: 'Backup template not found' });
    await pool.query('UPDATE backup_templates SET text = $1 WHERE id = $2 AND business_id = $3', [text, id, businessId]);
    res.json({ message: 'Backup template updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.deleteBackupTemplate = async (req, res, next) => {
  const pool = req.db;
  const { id } = req.params;
  const businessId = req.businessId;
  try {
    const check = await pool.query('SELECT * FROM backup_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
    if (check.rowCount === 0) return res.status(404).json({ message: 'Backup template not found' });
    await pool.query('DELETE FROM backup_templates WHERE id = $1 AND business_id = $2', [id, businessId]);
    res.json({ message: 'Backup template deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Revoke consent for a specific review (admin feature)
exports.revokeReviewConsent = async (req, res, next) => {
  const pool = req.db;
  const businessId = req.businessId;
  const id = Number(req.params.id);

  try {
    const existing = await pool.query(
      'SELECT id, consent_revoked_at FROM customer_reviews WHERE id = $1 AND business_id = $2 LIMIT 1',
      [id, businessId]
    );
    if (existing.rowCount === 0) return res.status(404).json({ message: 'Review not found' });

    if (existing.rows[0].consent_revoked_at) {
      return res.json({ message: 'Consent already revoked', revoked: true, alreadyRevoked: true });
    }

    const updated = await pool.query(
      `UPDATE customer_reviews
       SET consent_revoked_at = NOW()
       WHERE id = $1 AND business_id = $2
       RETURNING id, consent_revoked_at`,
      [id, businessId]
    );
    return res.json({
      message: 'Consent revoked successfully',
      revoked: true,
      alreadyRevoked: false,
      reviewId: updated.rows[0].id,
      revokedAt: updated.rows[0].consent_revoked_at,
    });
  } catch (err) {
    next(err);
  }
};

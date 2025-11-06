const { validationResult } = require('express-validator');

// Get all active templates for the tenant
exports.getActiveTemplates = async (req, res) => {
  const pool = req.db;
  try {
    const { rows } = await pool.query('SELECT * FROM review_templates WHERE used = false ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark a template as used and archive it
// Mark a template as used and archive it
exports.markTemplateAsUsed = async (req, res) => {
  const pool = req.db;
  const id = Number(req.params.id);
  try {
    // transaction: insert into archived, update original
    await pool.query('BEGIN');
    const check = await pool.query('SELECT * FROM review_templates WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Template not found' });
    }
    const text = check.rows[0].text;
    await pool.query('INSERT INTO archived_templates (text, archived_at) VALUES ($1, NOW())', [text]);
    await pool.query('UPDATE review_templates SET used = true WHERE id = $1', [id]);
    await pool.query('COMMIT');
    res.json({ message: 'Template marked as used and archived' });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
};

// Get all used templates for the tenant (admin feature)
exports.getUsedTemplates = async (req, res) => {
  const pool = req.db;
  try {
    const { rows } = await pool.query('SELECT * FROM review_templates WHERE used = true ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

 // Rephrase and return a used template to the active pool (admin feature)
// Rephrase a used or archived template and return to active pool (admin feature)
exports.rephraseTemplate = async (req, res) => {
  const pool = req.db;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const text = req.body.text;
  if (!text) return res.status(400).json({ message: 'Text is required' });
  try {
    const result = await pool.query('INSERT INTO review_templates (text, used, created_at) VALUES ($1, false, NOW()) RETURNING id', [text]);
    res.json({ message: 'Template rephrased and returned to active pool', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

 // Create a new template (admin feature)
// Create a new template for the tenant
exports.createTemplate = async (req, res) => {
  const pool = req.db;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Template text is required' });
  try {
    const result = await pool.query('INSERT INTO review_templates (text, used, created_at) VALUES ($1, false, NOW()) RETURNING id', [text]);
    res.status(201).json({ message: 'Template created successfully', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

 // Update an existing template (admin feature)
// Update an existing template for the tenant
exports.updateTemplate = async (req, res) => {
  const pool = req.db;
  const { text } = req.body;
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (!text) return res.status(400).json({ message: 'Template text is required' });
  try {
    const check = await pool.query('SELECT * FROM review_templates WHERE id = $1', [id]);
    if (check.rowCount === 0) return res.status(404).json({ message: 'Template not found' });
    await pool.query('UPDATE review_templates SET text = $1 WHERE id = $2', [text, id]);
    res.json({ message: 'Template updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

 // Delete a template (admin feature)
// Delete a template for the tenant
exports.deleteTemplate = async (req, res) => {
  const pool = req.db;
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM review_templates WHERE id = $1', [id]);
    if (check.rowCount === 0) return res.status(404).json({ message: 'Template not found' });
    await pool.query('DELETE FROM review_templates WHERE id = $1', [id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

 // Bulk delete templates (admin feature)
// Bulk delete templates for tenant
exports.bulkDeleteTemplates = async (req, res) => {
  const pool = req.db;
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Valid template IDs are required' });
  const sanitized = ids.map((i) => Number(i)).filter(Number.isInteger);
  if (sanitized.length === 0) return res.status(400).json({ message: 'No valid ids supplied' });
  const placeholders = sanitized.map((_, i) => `$${i + 1}`).join(',');
  try {
    const resq = await pool.query(`DELETE FROM review_templates WHERE id IN (${placeholders})`, sanitized);
    res.json({ message: 'Templates deleted successfully', count: resq.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
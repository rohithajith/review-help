const db = require('../db');

// Get all active templates
exports.getActiveTemplates = (req, res) => {
  const sql = 'SELECT * FROM review_templates WHERE used = 0';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

// Mark a template as used
exports.markTemplateAsUsed = (req, res) => {
  const sqlCheck = 'SELECT * FROM templates WHERE id = ?';
  db.get(sqlCheck, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const sqlUpdate = 'UPDATE templates SET used = 1 WHERE id = ?';
    db.run(sqlUpdate, [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Template marked as used' });
    });
  });
};

// Get all used templates (admin feature)
exports.getUsedTemplates = (req, res) => {
  const sql = 'SELECT * FROM review_templates WHERE used = 1';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

// Rephrase and return a used template to the active pool (admin feature)
exports.rephraseTemplate = (req, res) => {
  const text = req.body.text;
  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }
  const sqlInsert = 'INSERT INTO review_templates (text, used) VALUES (?, 0)';
  db.run(sqlInsert, [text], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Template rephrased and returned to active pool', id: this.lastID });
  });
};
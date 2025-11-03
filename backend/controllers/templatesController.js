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
  const sqlCheck = 'SELECT * FROM review_templates WHERE id = ?';
  db.get(sqlCheck, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const sqlUpdate = 'UPDATE review_templates SET used = 1 WHERE id = ?';
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

 // Create a new template (admin feature)
 exports.createTemplate = (req, res) => {
   const { text } = req.body;
   if (!text) {
     return res.status(400).json({ message: 'Template text is required' });
   }

   const sql = 'INSERT INTO review_templates (text, used) VALUES (?, 0)';
   db.run(sql, [text], function(err) {
     if (err) {
       return res.status(500).json({ error: err.message });
     }
     res.status(201).json({ message: 'Template created successfully', id: this.lastID });
   });
 };

 // Update an existing template (admin feature)
 exports.updateTemplate = (req, res) => {
   const { text } = req.body;
   const { id } = req.params;

   if (!text) {
     return res.status(400).json({ message: 'Template text is required' });
   }

   const sqlCheck = 'SELECT * FROM review_templates WHERE id = ?';
   db.get(sqlCheck, [id], (err, row) => {
     if (err) {
       return res.status(500).json({ error: err.message });
     }
     if (!row) {
       return res.status(404).json({ message: 'Template not found' });
     }

     const sqlUpdate = 'UPDATE review_templates SET text = ? WHERE id = ?';
     db.run(sqlUpdate, [text, id], function(err) {
       if (err) {
         return res.status(500).json({ error: err.message });
       }
       res.json({ message: 'Template updated successfully' });
     });
   });
 };

 // Delete a template (admin feature)
 exports.deleteTemplate = (req, res) => {
   const { id } = req.params;

   const sqlCheck = 'SELECT * FROM review_templates WHERE id = ?';
   db.get(sqlCheck, [id], (err, row) => {
     if (err) {
       return res.status(500).json({ error: err.message });
     }
     if (!row) {
       return res.status(404).json({ message: 'Template not found' });
     }

     const sqlDelete = 'DELETE FROM review_templates WHERE id = ?';
     db.run(sqlDelete, [id], function(err) {
       if (err) {
         return res.status(500).json({ error: err.message });
       }
       res.json({ message: 'Template deleted successfully' });
     });
   });
 };

 // Bulk delete templates (admin feature)
 exports.bulkDeleteTemplates = (req, res) => {
   const { ids } = req.body;

   if (!Array.isArray(ids) || ids.length === 0) {
     return res.status(400).json({ message: 'Valid template IDs are required' });
   }

   const placeholders = ids.map(() => '?').join(',');
   const sqlDelete = `DELETE FROM review_templates WHERE id IN (${placeholders})`;

   db.run(sqlDelete, ids, function(err) {
     if (err) {
       return res.status(500).json({ error: err.message });
     }
     res.json({ message: 'Templates deleted successfully', count: this.changes });
   });
 };
const db = require('../db');

class ReviewTemplate {
  constructor(text, used, createdAt) {
    this.text = text;
    this.used = used || false;
    this.createdAt = createdAt || new Date();
  }

  static async create(text) {
    throw new Error('Use createForBusiness(businessId, text) instead');
  }

  static async findAll() {
    throw new Error('Use findAllForBusiness(businessId) instead');
  }

  static async createForBusiness(businessId, text) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO review_templates (business_id, text, used, created_at) VALUES (?, ?, ?, ?)',
        [businessId, text, 0, new Date()],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve(this.lastID);
        }
      );
    });
  }

  static async findAllForBusiness(businessId, onlyActive = true) {
    return new Promise((resolve, reject) => {
      const sql = onlyActive
        ? 'SELECT * FROM review_templates WHERE business_id = ? AND used = 0'
        : 'SELECT * FROM review_templates WHERE business_id = ?';
      db.all(sql, [businessId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM review_templates WHERE id = ?', [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  static async update(id, text, used) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE review_templates SET text = ?, used = ? WHERE id = ?',
        [text, used, id],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve(this.changes);
        }
      );
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM review_templates WHERE id = ?', [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
}

module.exports = ReviewTemplate;
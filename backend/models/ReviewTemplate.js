const db = require('../db');

class ReviewTemplate {
  constructor(text, used, createdAt) {
    this.text = text;
    this.used = used || false;
    this.createdAt = createdAt || new Date();
  }

  static async create(text) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO review_templates (text, used, created_at) VALUES (?, ?, ?)',
        [text, false, new Date()],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve(this.lastID);
        }
      );
    });
  }

  static async findAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM review_templates', [], (err, rows) => {
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
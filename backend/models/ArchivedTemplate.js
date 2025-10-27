const db = require('../db');

class ArchivedTemplate {
  constructor(text, archivedAt) {
    this.text = text;
    this.archivedAt = archivedAt || new Date();
  }

  static async create(text) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO archived_templates (text, archived_at) VALUES (?, ?)',
        [text, new Date()],
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
      db.all('SELECT * FROM archived_templates', [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM archived_templates WHERE id = ?', [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  static async update(id, text) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE archived_templates SET text = ? WHERE id = ?',
        [text, id],
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
      db.run('DELETE FROM archived_templates WHERE id = ?', [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
}

module.exports = ArchivedTemplate;
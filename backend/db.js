const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./reviewapp.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS review_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  
    CREATE TABLE IF NOT EXISTS archived_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
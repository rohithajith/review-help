const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./reviewapp.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      used INTEGER DEFAULT 0
    )
  `);
});

module.exports = db;
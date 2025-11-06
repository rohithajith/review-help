const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./reviewapp.db');

db.serialize(() => {
  // Businesses table for multi-tenancy
  db.run(`CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    google_review_url TEXT,
    logo_url TEXT,
    welcome_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  // Review templates now include business_id
  db.run(`CREATE TABLE IF NOT EXISTS review_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );`);

  // Archived templates also include business_id
  db.run(`CREATE TABLE IF NOT EXISTS archived_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );`);
});

module.exports = db;
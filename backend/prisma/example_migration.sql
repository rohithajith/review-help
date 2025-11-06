-- Example raw SQL migration for SQLite to add businesses and business_id to templates
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  google_review_url TEXT,
  logo_url TEXT,
  welcome_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE review_templates RENAME TO review_templates_old;

CREATE TABLE review_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

INSERT INTO review_templates (business_id, text, used, created_at)
SELECT 1 as business_id, text, used, created_at FROM review_templates_old;

DROP TABLE review_templates_old;

ALTER TABLE archived_templates RENAME TO archived_templates_old;

CREATE TABLE archived_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

INSERT INTO archived_templates (business_id, text, archived_at)
SELECT 1 as business_id, text, archived_at FROM archived_templates_old;

DROP TABLE archived_templates_old;

COMMIT;

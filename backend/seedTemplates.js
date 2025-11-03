const db = require('./db');

const templates = [
  "Great food and friendly staff — highly recommend this restaurant!",
  "Amazing flavors and great portion sizes. We'll be back soon!",
  "The service was quick and the dishes were delicious. Five stars!",
  "Cozy atmosphere and excellent service. Perfect for date night.",
  "Fresh ingredients and a nice variety on the menu. Highly recommend the house special.",
  "We loved the appetizers and the staff were attentive. A must-try place in town.",
  "Outstanding value for the quality. Portions are generous and tasty.",
  "Fantastic experience — food arrived hot and the server was very friendly.",
  "Delicious desserts and a relaxing ambiance. Great spot for family dinners.",
  "Consistently great meals and friendly staff. Our go-to restaurant now."
];

function seed() {
  db.serialize(() => {
    // Ensure table exists (db.js already creates the table, but double-check)
    db.run(`CREATE TABLE IF NOT EXISTS review_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    db.get('SELECT COUNT(*) as count FROM review_templates', [], (err, row) => {
      if (err) {
        console.error('Error counting templates:', err.message);
        process.exit(1);
      }

      if (row && row.count > 0) {
        console.log(`DB already has ${row.count} templates — skipping seed.`);
        process.exit(0);
      }

      const insert = db.prepare('INSERT INTO review_templates (text, used) VALUES (?, 0)');
      templates.forEach((t) => insert.run(t));
      insert.finalize((err) => {
        if (err) {
          console.error('Error finalizing insert:', err.message);
          process.exit(1);
        }
        console.log(`Seeded ${templates.length} restaurant templates into review_templates.`);
        process.exit(0);
      });
    });
  });
}

seed();

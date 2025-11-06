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
    // Ensure a default business exists and seed templates for it
    db.run(`CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      google_review_url TEXT,
      logo_url TEXT,
      welcome_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    db.get('SELECT id FROM businesses LIMIT 1', [], (err, bizRow) => {
      if (err) {
        console.error('Error counting templates:', err.message);
        process.exit(1);
      }
      if (bizRow && bizRow.id) {
        const businessId = bizRow.id;
        db.get('SELECT COUNT(*) as count FROM review_templates WHERE business_id = ?', [businessId], (err2, row2) => {
          if (err2) {
            console.error('Error counting templates:', err2.message);
            process.exit(1);
          }
          if (row2 && row2.count > 0) {
            console.log(`DB already has ${row2.count} templates — skipping seed.`);
            process.exit(0);
          }

          const insert = db.prepare('INSERT INTO review_templates (business_id, text, used) VALUES (?, ?, 0)');
          templates.forEach((t) => insert.run(businessId, t));
          insert.finalize((err3) => {
            if (err3) {
              console.error('Error finalizing insert:', err3.message);
              process.exit(1);
            }
            console.log(`Seeded ${templates.length} restaurant templates into review_templates for business ${businessId}.`);
            process.exit(0);
          });
        });
      } else {
        // Create a default business and then seed
        db.run('INSERT INTO businesses (name, google_review_url, logo_url, welcome_message) VALUES (?, ?, ?, ?)',
          ['Default Business', null, null, 'Welcome!'], function (bizErr) {
            if (bizErr) {
              console.error('Error creating default business', bizErr.message);
              process.exit(1);
            }
            const businessId = this.lastID;
            const insert = db.prepare('INSERT INTO review_templates (business_id, text, used) VALUES (?, ?, 0)');
            templates.forEach((t) => insert.run(businessId, t));
            insert.finalize((err4) => {
              if (err4) {
                console.error('Error finalizing insert:', err4.message);
                process.exit(1);
              }
              console.log(`Created default business ${businessId} and seeded ${templates.length} templates.`);
              process.exit(0);
            });
        });
      }
    });
  });
}

seed();

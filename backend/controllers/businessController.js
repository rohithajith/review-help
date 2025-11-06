const { getAdminPool } = require('../tenantManager');

// Business registry is stored in an admin database. The admin pool is
// configured via ADMIN_DATABASE_URL or backend/tenants.json
exports.createBusiness = async (req, res) => {
  const { name, google_review_url, logo_url, welcome_message, tenant_connection } = req.body;
  if (!name) return res.status(400).json({ error: 'Business name is required' });
  if (!tenant_connection) return res.status(400).json({ error: 'tenant_connection (Postgres connection string) is required to register a business' });
  try {
    const pool = getAdminPool();
    // ensure table exists
    await pool.query(`CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tenant_connection TEXT NOT NULL,
      google_review_url TEXT,
      logo_url TEXT,
      welcome_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    const result = await pool.query('INSERT INTO businesses (name, tenant_connection, google_review_url, logo_url, welcome_message) VALUES ($1,$2,$3,$4,$5) RETURNING id', [name, tenant_connection, google_review_url || null, logo_url || null, welcome_message || null]);
    res.status(201).json({ id: result.rows[0].id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listBusinesses = async (req, res) => {
  try {
    const pool = getAdminPool();
    await pool.query(`CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tenant_connection TEXT NOT NULL,
      google_review_url TEXT,
      logo_url TEXT,
      welcome_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    const { rows } = await pool.query('SELECT id, name, google_review_url, logo_url, welcome_message, created_at FROM businesses ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBusiness = async (req, res) => {
  const businessId = req.businessId || Number(req.params.businessId);
  try {
    const pool = getAdminPool();
    const { rows } = await pool.query('SELECT id, name, google_review_url, logo_url, welcome_message, tenant_connection FROM businesses WHERE id = $1', [businessId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Business not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

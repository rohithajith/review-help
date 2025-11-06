// import 'bootstrap/dist/css/bootstrap.min.css';
const express = require('express');
const cors = require('cors');
const templatesRoutes = require('./routes/templatesRoutes');
const businessRoutes = require('./routes/businessRoutes');
const businessMiddleware = require('./middleware/businessMiddleware');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Basic rate limiting for APIs
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Load .env if present
require('dotenv').config();
const { getAdminPool } = require('./tenantManager');
// Ensure admin pool can be created (will throw if misconfigured)
try {
  const admin = getAdminPool();
  admin.query('SELECT 1').catch(() => {});
  console.log('Admin Postgres pool configured');
} catch (e) {
  console.warn('Admin Postgres pool not configured:', e.message);
}

// Public business routes (create/list businesses)
app.use('/api/businesses', businessRoutes);

// Tenant-scoped routes mounted under /api/:businessId
app.use('/api/:businessId', businessMiddleware, templatesRoutes);

app.get('/', (req, res) => {
  res.send('Review App Backend');
});

// Start the server only if not required by tests
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
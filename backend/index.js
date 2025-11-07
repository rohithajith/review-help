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

// Simple request logger that includes businessId when present
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const businessId = req.businessId || (req.params && req.params.businessId) || '-';
    console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} businessId=${businessId} status=${res.statusCode} ${duration}ms`);
  });
  next();
});

// Basic rate limiting for APIs
// Rate limiter: keep a low limit in production but be permissive during local development
const rateLimitMax = process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : (process.env.NODE_ENV === 'production' ? 60 : 1000);
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting only in production by default. For local development
// we avoid blocking the developer workflow. An operator can still set
// `RATE_LIMIT_MAX` to enforce limits in non-production environments.
if (process.env.NODE_ENV === 'production' || process.env.RATE_LIMIT_MAX) {
  app.use('/api', apiLimiter);
}

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

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  // don't leak internal error details in production -- show message and code
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// Start the server only if not required by tests
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
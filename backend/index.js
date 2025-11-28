// Load .env if present (must be before other requires that use env vars)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const templatesRoutes = require('./routes/templatesRoutes');
const businessRoutes = require('./routes/businessRoutes');
const userRoutes = require('./routes/userRoutes');
const logsRoutes = require('./routes/logsRoutes');
const businessMiddleware = require('./middleware/businessMiddleware');
const rateLimit = require('express-rate-limit');
const { getAdminPool, ensureAdminSchema } = require('./tenantManager');
const cronScheduler = require('./jobs/cronScheduler');

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
const rateLimitMax = process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : (process.env.NODE_ENV === 'production' ? 60 : 1000);
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === 'production' || process.env.RATE_LIMIT_MAX) {
  app.use('/api', apiLimiter);
}

// Initialize Supabase/Postgres connection and ensure schema exists
(async () => {
  try {
    const pool = getAdminPool();
    await pool.query('SELECT 1');
    console.log('✓ Connected to Supabase/Postgres');
    
    // Ensure all required tables exist
    await ensureAdminSchema();
    console.log('✓ Database schema ready');

    // Initialize cron jobs for background processing
    cronScheduler.initializeCronJobs();
  } catch (e) {
    console.error('✗ Database connection failed:', e.message);
    console.error('  Make sure ADMIN_DATABASE_URL is set correctly');
  }
})();

// Public business routes (create/list businesses)
app.use('/api/businesses', businessRoutes);

// User routes (onboarding, profile sync)
app.use('/api/users', userRoutes);

// Client error logs ingestion (POST) and retrieval (GET)
app.use('/api/_client-log', logsRoutes);

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
// Load .env if present (must be before other requires that use env vars)
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const templatesRoutes = require('./routes/templatesRoutes');
const businessRoutes = require('./routes/businessRoutes');
const userRoutes = require('./routes/userRoutes');
const logsRoutes = require('./routes/logsRoutes');
const consentRoutes = require('./routes/consentRoutes');
const businessMiddleware = require('./middleware/businessMiddleware');
const { getAdminPool, ensureAdminSchema } = require('./tenantManager');
const cronScheduler = require('./jobs/cronScheduler');
const paymentsRoutes = require('./routes/paymentsRoutes');

const app = express();
const PORT = process.env.PORT || 5002;
let infraInitPromise = null;
const clientDistDir = path.resolve(__dirname, '../client/dist');
const hasBuiltClient = fs.existsSync(path.join(clientDistDir, 'index.html'));

function normalizeOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!/^https?:$/i.test(url.protocol)) return '';
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (e) {
    return '';
  }
}

function getAllowedOrigins() {
  const configured = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((v) => normalizeOrigin(v))
    .filter(Boolean);
  const frontend = normalizeOrigin(process.env.FRONTEND_URL);
  if (frontend) configured.push(frontend);

  if (process.env.NODE_ENV !== 'production') {
    configured.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:3004');
  }
  return new Set(configured);
}

const allowedOrigins = getAllowedOrigins();
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (normalized && allowedOrigins.has(normalized)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'stripe-signature'],
  maxAge: 60 * 60 * 24,
};

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'production' ? 120 : 1000)),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/payments/webhook',
  message: { error: 'Too many requests, please try again later.' },
});

async function initializeInfrastructure() {
  if (infraInitPromise) return infraInitPromise;

  infraInitPromise = (async () => {
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

  return infraInitPromise;
}

// Middleware
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // The landing page is embedded in a same-origin iframe at "/",
  // so DENY breaks the initial app shell in production.
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Stripe webhook needs raw body for signature verification - must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '5mb' }));
app.use('/api', apiLimiter);

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

// Initialize DB/cron in non-test environments.
if (process.env.NODE_ENV !== 'test') {
  initializeInfrastructure();
}

// Public business routes (create/list businesses)
app.use('/api/businesses', businessRoutes);

// User routes (onboarding, profile sync)
app.use('/api/users', userRoutes);

// Payments
app.use('/api/payments', paymentsRoutes);

// Client error logs ingestion (POST) and retrieval (GET)
app.use('/api/_client-log', logsRoutes);

// Public review consent routes (token-based revocation)
app.use('/api/reviews', consentRoutes);

// Tenant-scoped routes mounted under /api/:businessId
app.use('/api/:businessId', businessMiddleware, templatesRoutes);

if (hasBuiltClient) {
  app.use(express.static(clientDistDir));
  app.get('/', (req, res) => {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Review App Backend');
  });
}

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  const isProd = process.env.NODE_ENV === 'production';
  const status = err && err.status ? err.status : 500;
  const fallbackMessage = status >= 500 ? 'Internal server error' : 'Request failed';
  const safeMessage = (isProd && status >= 500)
    ? 'Internal server error'
    : (err && err.message ? err.message : fallbackMessage);
  res.status(status).json({ error: safeMessage });
});

// Start the server only if not required by tests
if (require.main === module) {
  initializeInfrastructure().finally(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
}

module.exports = app;
module.exports.initializeInfrastructure = initializeInfrastructure;

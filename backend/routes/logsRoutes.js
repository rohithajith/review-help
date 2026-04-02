const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdminApiKey } = require('../middleware/adminKeyMiddleware');

const router = express.Router();
const bodyParser = express.json({ limit: '128kb' });
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'errors.log');
const SENSITIVE_KEY_RE = /(authorization|password|token|secret|api[_-]?key|cookie)/i;
const SENSITIVE_VALUE_RE = /(bearer\s+[a-z0-9._-]+|sk_(?:live|test)_[a-z0-9]+|whsec_[a-z0-9]+)/ig;

const ingestLimiter = rateLimit({
  windowMs: Number(process.env.LOG_INGEST_WINDOW_MS || 60_000),
  max: Number(process.env.LOG_INGEST_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log requests, please try again later.' },
});

const readLimiter = rateLimit({
  windowMs: Number(process.env.LOG_READ_WINDOW_MS || 60_000),
  max: Number(process.env.LOG_READ_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log read requests, please try again later.' },
});

function sanitizeForLog(value, depth = 0) {
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeForLog(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? '[redacted]' : sanitizeForLog(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string') {
    const redacted = value.replace(SENSITIVE_VALUE_RE, '[redacted]');
    if (redacted.length > 4000) return `${redacted.slice(0, 4000)}...[truncated]`;
    return redacted;
  }
  return value;
}

function appendLog(entry) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
}

router.post('/', ingestLimiter, bodyParser, (req, res) => {
  try {
    const payload = sanitizeForLog(req.body || {});
    payload._received = {
      ts: new Date().toISOString(),
      ip: req.ip,
      path: req.originalUrl,
    };
    appendLog(payload);
    res.status(202).json({ status: 'ok' });
  } catch (error) {
    appendLog({ type: 'client-log-failed', message: error && error.message });
    res.status(500).json({ error: 'failed to record client log' });
  }
});

router.get('/', readLimiter, authMiddleware, requireAdminApiKey, (req, res) => {
  try {
    const lines = Math.min(1000, Math.max(10, parseInt(req.query.lines || '200', 10)));
    if (!fs.existsSync(LOG_FILE)) return res.json([]);
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const arr = data.split(/\r?\n/).filter(Boolean);
    const slice = arr.slice(-lines).map((line) => {
      try { return JSON.parse(line); }
      catch (e) { return { raw: line }; }
    }).reverse();
    res.json(slice);
  } catch (error) {
    res.status(500).json({ error: 'failed to read logs' });
  }
});

module.exports = router;

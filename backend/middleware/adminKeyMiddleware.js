const crypto = require('crypto');

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length === 0 || right.length === 0) return false;
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hasValidAdminKey(req) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false;
  const provided = req.headers['x-admin-key'];
  return safeEqual(provided, expected);
}

function requireAdminApiKey(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return res.status(403).json({ error: 'ADMIN_API_KEY is not configured' });
  }
  if (!hasValidAdminKey(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

module.exports = {
  hasValidAdminKey,
  requireAdminApiKey,
};

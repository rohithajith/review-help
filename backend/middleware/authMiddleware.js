const supabase = require('../lib/supabaseClient');

/**
 * Auth middleware
 * Expects `Authorization: Bearer <access_token>` header from client (Supabase session access token)
 * Verifies token with Supabase and attaches `req.user` and `req.userId`.
 */
module.exports = async (req, res, next) => {
  try {
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = auth.split(' ')[1];

    // Use supabase admin client to get user
    if (!supabase || !supabase.auth || typeof supabase.auth.getUser !== 'function') {
      return res.status(500).json({ error: 'Supabase client not configured on server' });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error && /not configured/i.test(String(error.message || ''))) {
      return res.status(500).json({ error: 'Supabase auth is not configured on server' });
    }
    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = data.user;
    req.userId = data.user.id;
    // Optionally persist user record in our users table (idempotent)
    // We'll do this lazily in owner middleware / business creation where needed.

    next();
  } catch (err) {
    next(err);
  }
};

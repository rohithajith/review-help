/**
 * Owner middleware ensures the authenticated user (req.userId) is an owner/admin
 * for the current business (req.businessId). Requires `req.db` and `req.userId`.
 */
module.exports = async (req, res, next) => {
  try {
    const pool = req.db;
    const businessId = req.businessId;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!pool) return res.status(500).json({ error: 'DB pool not available' });

    const { rows } = await pool.query('SELECT role FROM business_owners WHERE business_id = $1 AND user_id = $2 LIMIT 1', [businessId, userId]);
    if (!rows || rows.length === 0) {
      return res.status(403).json({ error: 'User is not an owner for this business' });
    }
    // attach role
    req.userRole = rows[0].role || 'owner';
    next();
  } catch (err) {
    next(err);
  }
};

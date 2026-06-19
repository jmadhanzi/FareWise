const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, query: qv, validationResult } = require('express-validator');

router.use(requireAdmin);

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [drivers, riders, rides, revenue, ridesByStatus, subsByPlan] = await Promise.all([
    query('SELECT COUNT(*) FROM drivers'),
    query("SELECT COUNT(*) FROM users WHERE role = 'rider'"),
    query('SELECT COUNT(*) FROM rides'),
    query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'"),
    query(`
      SELECT status, COUNT(*) AS count FROM rides
      GROUP BY status ORDER BY count DESC
    `),
    query(`
      SELECT plan_type, COUNT(*) AS count,
             SUM(amount_paid_usd) AS revenue
      FROM subscriptions WHERE status = 'active'
      GROUP BY plan_type
    `),
  ]);

  res.json({
    stats: {
      total_drivers: parseInt(drivers.rows[0].count),
      total_riders: parseInt(riders.rows[0].count),
      total_rides: parseInt(rides.rows[0].count),
      total_revenue_usd: parseFloat(revenue.rows[0].total),
    },
    rides_by_status: ridesByStatus.rows,
    subscriptions_by_plan: subsByPlan.rows,
  });
}));

// ── Users (riders) ───────────────────────────────────────────────────────────
router.get('/users', [
  qv('role').optional().isIn(['rider', 'driver', 'admin']),
  qv('search').optional().isString().trim(),
  qv('page').optional().isInt({ min: 1 }).toInt(),
  qv('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const role = req.query.role || 'rider';
  const search = req.query.search || '';
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;

  const searchParam = search ? `%${search}%` : null;

  const usersResult = await query(
    `SELECT
       u.id, u.phone, u.full_name, u.role, u.is_active, u.created_at,
       COUNT(r.id) AS total_rides,
       COALESCE(SUM(r.actual_fare), 0) AS total_spent
     FROM users u
     LEFT JOIN rides r ON (
       CASE WHEN u.role = 'rider' THEN r.rider_id = u.id
            WHEN u.role = 'driver' THEN r.driver_id = u.id
            ELSE FALSE END
     ) AND r.status = 'completed'
     WHERE u.role = $1
       AND ($2::text IS NULL OR u.phone ILIKE $2 OR u.full_name ILIKE $2)
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $3 OFFSET $4`,
    [role, searchParam, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM users
     WHERE role = $1
       AND ($2::text IS NULL OR phone ILIKE $2 OR full_name ILIKE $2)`,
    [role, searchParam]
  );

  res.json({
    users: usersResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
    pages: Math.ceil(countResult.rows[0].count / limit),
  });
}));

// ── Ban / unban user ─────────────────────────────────────────────────────────
router.put('/users/:id/ban', [
  body('is_active').isBoolean(),
  body('reason').optional().isString().trim().isLength({ max: 500 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { is_active, reason } = req.body;
  const { id } = req.params;

  const result = await query(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, phone, full_name, is_active',
    [is_active, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    message: is_active ? 'User reactivated' : 'User banned',
    user: result.rows[0],
    reason,
  });
}));

// ── Drivers ───────────────────────────────────────────────────────────────────
router.get('/drivers', asyncHandler(async (req, res) => {
  const status = req.query.status;
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE d.approval_status = $${params.length}`;
  }

  const result = await query(
    `SELECT d.*, u.phone, u.full_name, u.is_active, u.created_at AS user_created_at,
            s.status AS subscription_status, s.plan_type, s.expires_at
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN subscriptions s ON s.driver_id = d.id AND s.status = 'active'
     ${where}
     ORDER BY d.created_at DESC`,
    params
  );

  res.json({ drivers: result.rows });
}));

router.put('/drivers/:id', [
  body('approval_status').isIn(['approved', 'rejected', 'suspended']),
  body('rejection_reason').optional().isString().trim().isLength({ max: 500 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { approval_status, rejection_reason } = req.body;
  const { id } = req.params;

  const result = await query(
    `UPDATE drivers SET approval_status = $1, rejection_reason = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, user_id, approval_status`,
    [approval_status, rejection_reason || null, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Driver not found' });
  }

  // Notify driver via FCM if approved
  if (approval_status === 'approved') {
    try {
      const { getMessaging } = require('../config/firebase');
      const messaging = getMessaging();
      const tokenRes = await query(
        'SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL',
        [result.rows[0].user_id]
      );
      if (tokenRes.rows.length > 0 && messaging) {
        await messaging.send({
          token: tokenRes.rows[0].fcm_token,
          notification: {
            title: 'Account Approved! 🎉',
            body: 'Your FareWise driver account has been approved. You can now go online and accept rides.',
          },
        });
      }
    } catch (_) {
      // FCM failure is non-fatal
    }
  }

  res.json({ driver: result.rows[0] });
}));

// ── Rides ─────────────────────────────────────────────────────────────────────
router.get('/rides', asyncHandler(async (req, res) => {
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const params = [limit, offset];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE r.status = $${params.length}`;
  }

  const result = await query(
    `SELECT r.*,
            ru.phone AS rider_phone, ru.full_name AS rider_name,
            du.phone AS driver_phone, du.full_name AS driver_name
     FROM rides r
     JOIN users ru ON ru.id = r.rider_id
     LEFT JOIN users du ON du.id = r.driver_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM rides r ${where}`,
    status ? [status] : []
  );

  res.json({
    rides: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  });
}));

// ── Disputes ──────────────────────────────────────────────────────────────────
router.get('/disputes', asyncHandler(async (req, res) => {
  const status = req.query.status || 'open';
  const result = await query(
    `SELECT d.*, r.pickup_address, r.destination_address, r.actual_fare,
            ru.phone AS reporter_phone, ru.full_name AS reporter_name
     FROM disputes d
     JOIN rides r ON r.id = d.ride_id
     JOIN users ru ON ru.id = d.reported_by
     WHERE d.status = $1
     ORDER BY d.created_at DESC`,
    [status]
  );
  res.json({ disputes: result.rows });
}));

router.put('/disputes/:id', [
  body('status').isIn(['resolved', 'dismissed']),
  body('resolution').isString().trim().isLength({ min: 10, max: 1000 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { status, resolution } = req.body;
  const result = await query(
    `UPDATE disputes SET status = $1, resolution = $2, resolved_by = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [status, resolution, req.user.id, req.params.id]
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });
  res.json({ dispute: result.rows[0] });
}));

// ── Subscriptions ─────────────────────────────────────────────────────────────
router.get('/subscriptions', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT s.*, u.phone, u.full_name
     FROM subscriptions s
     JOIN drivers d ON d.id = s.driver_id
     JOIN users u ON u.id = d.user_id
     ORDER BY s.created_at DESC
     LIMIT 100`
  );
  res.json({ subscriptions: result.rows });
}));

module.exports = router;

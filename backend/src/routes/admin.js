const router = require('express').Router();
const { body, query: qv, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { supabase } = require('../config/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/v1/admin/dashboard
router.get('/dashboard', ...requireAdmin, asyncHandler(async (req, res) => {
  const [usersRes, driversRes, ridesRes, subsRes, revenueRes] = await Promise.all([
    supabase.from('users').select('id, role', { count: 'exact', head: true }),
    supabase.from('drivers').select('id, approval_status', { count: 'exact', head: false }),
    supabase.from('rides').select('id, status, final_fare', { count: 'exact', head: false }),
    supabase.from('subscriptions').select('id, status, amount_usd', { count: 'exact', head: false }),
    supabase.from('payments').select('amount, status').eq('status', 'completed')
  ]);

  const drivers = driversRes.data || [];
  const rides = ridesRes.data || [];
  const subs = subsRes.data || [];
  const revenue = revenueRes.data || [];

  res.json({
    users: {
      total: usersRes.count,
      riders: (usersRes.data || []).filter(u => u.role === 'rider').length,
      drivers: (usersRes.data || []).filter(u => u.role === 'driver').length
    },
    drivers: {
      total: drivers.length,
      pending: drivers.filter(d => d.approval_status === 'pending').length,
      approved: drivers.filter(d => d.approval_status === 'approved').length,
      rejected: drivers.filter(d => d.approval_status === 'rejected').length,
      suspended: drivers.filter(d => d.approval_status === 'suspended').length
    },
    rides: {
      total: rides.length,
      completed: rides.filter(r => r.status === 'completed').length,
      cancelled: rides.filter(r => r.status === 'cancelled').length,
      active: rides.filter(r => ['driver_assigned', 'driver_en_route', 'arrived', 'in_progress'].includes(r.status)).length
    },
    subscriptions: {
      total: subs.length,
      active: subs.filter(s => s.status === 'active').length,
      expired: subs.filter(s => s.status === 'expired').length,
      monthly_revenue: subs.filter(s => s.status === 'active').reduce((sum, s) => sum + parseFloat(s.amount_usd || 0), 0).toFixed(2)
    },
    revenue: {
      total_usd: revenue.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)
    }
  });
}));

// GET /api/v1/admin/drivers — list all drivers
router.get('/drivers', ...requireAdmin,
  [qv('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended']),
   qv('page').optional().isInt({ min: 1 }),
   qv('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    let q = supabase.from('drivers')
      .select(`*, user:users!user_id(full_name, phone, profile_photo_url, created_at)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) q = q.eq('approval_status', status);
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ drivers: data, total: count, page: +page, limit: +limit });
  })
);

// PUT /api/v1/admin/drivers/:id/approve
router.put('/drivers/:id/approve', ...requireAdmin,
  [body('action').isIn(['approved', 'rejected', 'suspended']),
   body('notes').optional().trim()],
  validate,
  asyncHandler(async (req, res) => {
    const { action, notes } = req.body;
    const updates = {
      approval_status: action,
      approval_notes: notes,
      approved_by: req.user.id
    };
    if (action === 'approved') updates.approved_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('drivers').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    // Notify driver via FCM
    const { data: driver } = await supabase
      .from('drivers').select('user:users!user_id(fcm_token, full_name)').eq('id', req.params.id).single();
    if (driver?.user?.fcm_token) {
      const { sendPushNotification } = require('../services/notificationService');
      const messages = {
        approved: { title: 'Account Approved! 🎉', body: 'Your FareWise driver account is now active. Go online and start earning!' },
        rejected: { title: 'Application Update', body: `Your driver application was not approved. ${notes || 'Contact support for details.'}` },
        suspended: { title: 'Account Suspended', body: 'Your account has been suspended. Contact support.' }
      };
      await sendPushNotification(driver.user.fcm_token, messages[action]);
    }
    res.json({ message: `Driver ${action}`, driver: data });
  })
);

// GET /api/v1/admin/rides — list all rides
router.get('/rides', ...requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  let q = supabase.from('rides')
    .select(`
      *, 
      rider:users!rider_id(full_name, phone),
      driver:drivers!driver_id(vehicle_plate, user:users!user_id(full_name))
    `, { count: 'exact' })
    .order('requested_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq('status', status);
  const { data, error, count } = await q;
  if (error) throw error;
  res.json({ rides: data, total: count, page: +page, limit: +limit });
}));

// GET /api/v1/admin/disputes
router.get('/disputes', ...requireAdmin, asyncHandler(async (req, res) => {
  const { status = 'open', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from('disputes')
    .select(`*, raised_by_user:users!raised_by(full_name, phone), ride:rides(id, pickup_address, destination_address, final_fare)`, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  res.json({ disputes: data, total: count, page: +page, limit: +limit });
}));

// PUT /api/v1/admin/disputes/:id/resolve
router.put('/disputes/:id/resolve', ...requireAdmin,
  [body('resolution').trim().notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution: req.body.resolution,
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'Dispute resolved', dispute: data });
  })
);

// PUT /api/v1/admin/users/:id/ban
router.put('/users/:id/ban', ...requireAdmin,
  [body('reason').trim().notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    await supabase.from('users').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'User banned' });
  })
);

// GET /api/v1/admin/subscriptions
router.get('/subscriptions', ...requireAdmin, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let q = supabase.from('subscriptions')
    .select(`*, driver:drivers!driver_id(vehicle_plate, user:users!user_id(full_name, phone))`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq('status', status);
  const { data, error, count } = await q;
  if (error) throw error;
  res.json({ subscriptions: data, total: count, page: +page, limit: +limit });
}));

module.exports = router;

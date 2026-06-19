const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireAuth, requireDriver, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { supabase } = require('../config/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/v1/drivers/profile
router.get('/profile', ...requireDriver, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('drivers')
    .select(`
      *,
      user:users!user_id(full_name, phone, profile_photo_url, fcm_token, emergency_contact)
    `)
    .eq('user_id', req.user.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Driver profile not found' });
  res.json(data);
}));

// PUT /api/v1/drivers/profile
router.put('/profile', ...requireDriver,
  [
    body('vehicle_make').optional().trim().notEmpty(),
    body('vehicle_model').optional().trim().notEmpty(),
    body('vehicle_plate').optional().trim().toUpperCase(),
    body('base_fare').optional().isFloat({ min: 0.5, max: 50 }),
    body('per_km_rate').optional().isFloat({ min: 0.1, max: 10 }),
    body('minimum_fare').optional().isFloat({ min: 0.5, max: 20 }),
    body('surge_enabled').optional().isBoolean(),
    body('surge_multiplier').optional().isFloat({ min: 1.0, max: 5.0 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const driverFields = [
      'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_plate',
      'vehicle_color', 'vehicle_photo_url', 'base_fare', 'per_km_rate',
      'minimum_fare', 'surge_enabled', 'surge_multiplier'
    ];
    const userFields = ['full_name', 'profile_photo_url', 'emergency_contact', 'whatsapp_number'];

    const driverUpdates = {};
    const userUpdates = {};
    driverFields.forEach(f => { if (req.body[f] !== undefined) driverUpdates[f] = req.body[f]; });
    userFields.forEach(f => { if (req.body[f] !== undefined) userUpdates[f] = req.body[f]; });

    const { data: driver } = await supabase
      .from('drivers').select('id').eq('user_id', req.user.id).single();

    if (Object.keys(driverUpdates).length > 0) {
      await supabase.from('drivers').update(driverUpdates).eq('id', driver.id);
    }
    if (Object.keys(userUpdates).length > 0) {
      await supabase.from('users').update(userUpdates).eq('id', req.user.id);
    }
    res.json({ message: 'Profile updated' });
  })
);

// POST /api/v1/drivers/onboard — initial onboarding
router.post('/onboard', ...requireAuth, asyncHandler(async (req, res) => {
  const { vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color,
          license_number, national_id_number } = req.body;

  if (!vehicle_make || !vehicle_plate || !license_number) {
    return res.status(400).json({ error: 'Vehicle details and license required' });
  }

  const { data: existing } = await supabase
    .from('drivers').select('id').eq('user_id', req.user.id).single();
  if (existing) return res.status(409).json({ error: 'Driver profile already exists' });

  const { data, error } = await supabase
    .from('drivers')
    .insert({
      user_id: req.user.id,
      vehicle_make, vehicle_model, vehicle_year, vehicle_plate,
      vehicle_color, license_number, national_id_number,
      approval_status: 'pending'
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('users').update({ role: 'driver' }).eq('id', req.user.id);
  res.status(201).json({ message: 'Application submitted. Await approval.', driver: data });
}));

// PUT /api/v1/drivers/availability — toggle online/offline
router.put('/availability', ...requireDriver,
  [
    body('is_online').isBoolean(),
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { is_online, lat, lng, heading } = req.body;
    const { data: driver } = await supabase
      .from('drivers').select('id, approval_status').eq('user_id', req.user.id).single();

    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });
    if (driver.approval_status !== 'approved') {
      return res.status(403).json({ error: 'Account not yet approved by admin' });
    }

    const updates = {
      is_online,
      last_location_update: new Date().toISOString()
    };
    if (lat) updates.current_lat = lat;
    if (lng) updates.current_lng = lng;
    if (heading !== undefined) updates.heading = heading;

    await supabase.from('drivers').update(updates).eq('id', driver.id);
    res.json({ is_online, message: is_online ? 'You are now online' : 'You are now offline' });
  })
);

// PUT /api/v1/drivers/location — GPS ping (every 4 seconds)
router.put('/location', ...requireDriver,
  [
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { lat, lng, heading, speed } = req.body;
    const { data: driver } = await supabase
      .from('drivers').select('id').eq('user_id', req.user.id).single();
    await supabase.from('drivers').update({
      current_lat: lat,
      current_lng: lng,
      heading,
      last_location_update: new Date().toISOString()
    }).eq('id', driver.id);
    res.json({ updated: true });
  })
);

// GET /api/v1/drivers/earnings
router.get('/earnings', ...requireDriver, asyncHandler(async (req, res) => {
  const { period = 'week' } = req.query;
  const { data: driver } = await supabase
    .from('drivers').select('id').eq('user_id', req.user.id).single();

  const intervals = { today: '1 day', week: '7 days', month: '30 days', all: '3650 days' };
  const interval = intervals[period] || '7 days';

  const { data: rides, error } = await supabase
    .from('rides')
    .select('id, final_fare, currency, payment_method, completed_at, distance_km')
    .eq('driver_id', driver.id)
    .eq('status', 'completed')
    .gte('completed_at', new Date(Date.now() - parseInt(interval) * 24 * 3600000).toISOString())
    .order('completed_at', { ascending: false });
  if (error) throw error;

  const total = rides.reduce((sum, r) => sum + (parseFloat(r.final_fare) || 0), 0);
  const totalDistance = rides.reduce((sum, r) => sum + (parseFloat(r.distance_km) || 0), 0);

  res.json({
    period,
    total_earnings_usd: total.toFixed(2),
    total_rides: rides.length,
    total_distance_km: totalDistance.toFixed(1),
    rides
  });
}));

// GET /api/v1/drivers/subscription-status
router.get('/subscription-status', ...requireDriver, asyncHandler(async (req, res) => {
  const { data: driver } = await supabase
    .from('drivers').select('id').eq('user_id', req.user.id).single();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('driver_id', driver.id)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .single();
  if (!sub) return res.json({ active: false, message: 'No active subscription' });
  const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24));
  res.json({ active: true, subscription: sub, days_remaining: Math.max(0, daysLeft) });
}));

// GET /api/v1/drivers/nearby — find nearby online drivers (for riders)
router.get('/nearby', ...requireAuth, asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const { data, error } = await supabase
    .from('drivers')
    .select(`
      id, current_lat, current_lng, heading,
      vehicle_make, vehicle_model, vehicle_plate, vehicle_color,
      base_fare, per_km_rate, minimum_fare, average_rating, rating_count,
      user:users!user_id(full_name, profile_photo_url)
    `)
    .eq('is_online', true)
    .eq('approval_status', 'approved')
    .not('current_lat', 'is', null);
  if (error) throw error;

  const nearby = data.filter(d => {
    const dist = haversine(parseFloat(lat), parseFloat(lng), d.current_lat, d.current_lng);
    d.distance_km = dist;
    return dist <= radius;
  }).sort((a, b) => a.distance_km - b.distance_km);

  res.json(nearby);
}));

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;

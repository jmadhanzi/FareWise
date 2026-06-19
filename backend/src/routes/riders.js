const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireAuth, requireRider } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { supabase } = require('../config/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/v1/riders/profile
router.get('/profile', ...requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, full_name, profile_photo_url, emergency_contact, whatsapp_number, created_at')
    .eq('id', req.user.id)
    .single();
  if (error) throw error;
  res.json(data);
}));

// PUT /api/v1/riders/profile
router.put('/profile', ...requireAuth,
  [
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('emergency_contact').optional().matches(/^\+?[1-9]\d{1,14}$/),
    body('whatsapp_number').optional().matches(/^\+?[1-9]\d{1,14}$/)
  ],
  validate,
  asyncHandler(async (req, res) => {
    const allowed = ['full_name', 'profile_photo_url', 'emergency_contact', 'whatsapp_number'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  })
);

// GET /api/v1/riders/rides — ride history
router.get('/rides', ...requireAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from('rides')
    .select(`
      id, status, pickup_address, destination_address,
      final_fare, currency, payment_method, payment_status,
      distance_km, actual_duration_mins, requested_at, completed_at,
      driver:drivers!driver_id(
        id, vehicle_plate, vehicle_make, vehicle_model,
        user:users!user_id(full_name, profile_photo_url)
      ),
      rating:ratings(rating, comment)
    `, { count: 'exact' })
    .eq('rider_id', req.user.id)
    .order('requested_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  res.json({ rides: data, total: count, page: +page, limit: +limit });
}));

// GET /api/v1/riders/rides/:id — single ride with share link
router.get('/rides/:id', ...requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('rides')
    .select(`
      *,
      driver:drivers!driver_id(
        id, vehicle_plate, vehicle_make, vehicle_model, vehicle_color,
        average_rating, rating_count,
        user:users!user_id(full_name, profile_photo_url, phone)
      ),
      rating:ratings(rating, comment)
    `)
    .eq('id', req.params.id)
    .eq('rider_id', req.user.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Ride not found' });
  res.json(data);
}));

// POST /api/v1/riders/fcm-token
router.post('/fcm-token', ...requireAuth,
  [body('token').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    await supabase.from('users').update({ fcm_token: req.body.token }).eq('id', req.user.id);
    res.json({ message: 'Token updated' });
  })
);

module.exports = router;

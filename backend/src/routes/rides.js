const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireAuth, requireRider, requireDriver } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const rideService = require('../services/rideService');
const { supabase } = require('../config/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/v1/rides/request
router.post('/request', ...requireAuth,
  [
    body('pickup_lat').isFloat({ min: -90, max: 90 }),
    body('pickup_lng').isFloat({ min: -180, max: 180 }),
    body('pickup_address').trim().notEmpty(),
    body('destination_lat').isFloat({ min: -90, max: 90 }),
    body('destination_lng').isFloat({ min: -180, max: 180 }),
    body('destination_address').trim().notEmpty(),
    body('payment_method').isIn(['ecocash', 'onemoney', 'cash']),
    body('requested_driver_id').optional().isUUID()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const ride = await rideService.requestRide(req.user.id, req.body);
    res.status(201).json(ride);
  })
);

// GET /api/v1/rides/:id — get ride status
router.get('/:id', ...requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('rides')
    .select(`
      *,
      driver:drivers!driver_id(
        id, current_lat, current_lng, heading,
        vehicle_make, vehicle_model, vehicle_plate, vehicle_color,
        average_rating, rating_count,
        user:users!user_id(full_name, profile_photo_url, phone)
      )
    `)
    .eq('id', req.params.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Ride not found' });
  res.json(data);
}));

// GET /api/v1/rides/share/:token — public trip sharing (no auth needed)
router.get('/share/:token', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('rides')
    .select(`
      id, status, pickup_address, destination_address,
      started_at, estimated_duration_mins,
      driver:drivers!driver_id(
        current_lat, current_lng, heading,
        vehicle_make, vehicle_model, vehicle_plate, vehicle_color,
        user:users!user_id(full_name)
      )
    `)
    .eq('trip_share_token', req.params.token)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Trip not found' });
  res.json(data);
}));

// POST /api/v1/rides/:id/cancel
router.post('/:id/cancel', ...requireAuth,
  [body('reason').optional().trim()],
  asyncHandler(async (req, res) => {
    const result = await rideService.cancelRide(req.params.id, req.user, req.body.reason);
    res.json(result);
  })
);

// POST /api/v1/rides/:id/accept — driver accepts ride
router.post('/:id/accept', ...requireDriver, asyncHandler(async (req, res) => {
  const result = await rideService.acceptRide(req.params.id, req.user.id);
  res.json(result);
}));

// POST /api/v1/rides/:id/decline — driver declines ride
router.post('/:id/decline', ...requireDriver, asyncHandler(async (req, res) => {
  const result = await rideService.declineRide(req.params.id, req.user.id);
  res.json(result);
}));

// POST /api/v1/rides/:id/arrived — driver has arrived at pickup
router.post('/:id/arrived', ...requireDriver, asyncHandler(async (req, res) => {
  const result = await rideService.markArrived(req.params.id, req.user.id);
  res.json(result);
}));

// POST /api/v1/rides/:id/start — ride starts
router.post('/:id/start', ...requireDriver, asyncHandler(async (req, res) => {
  const result = await rideService.startRide(req.params.id, req.user.id);
  res.json(result);
}));

// POST /api/v1/rides/:id/complete — ride completed
router.post('/:id/complete', ...requireDriver,
  [body('final_fare').isFloat({ min: 0.5 })],
  validate,
  asyncHandler(async (req, res) => {
    const result = await rideService.completeRide(req.params.id, req.user.id, req.body.final_fare);
    res.json(result);
  })
);

// POST /api/v1/rides/:id/rate — rider rates driver
router.post('/:id/rate', ...requireAuth,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ max: 500 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { data: ride } = await supabase
      .from('rides').select('id, rider_id, driver_id, status').eq('id', req.params.id).single();
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.rider_id !== req.user.id) return res.status(403).json({ error: 'Not your ride' });
    if (ride.status !== 'completed') return res.status(400).json({ error: 'Ride not completed' });

    const { data, error } = await supabase
      .from('ratings')
      .insert({
        ride_id: ride.id,
        from_rider_id: req.user.id,
        to_driver_id: ride.driver_id,
        rating: req.body.rating,
        comment: req.body.comment
      })
      .select()
      .single();
    if (error?.code === '23505') return res.status(409).json({ error: 'Already rated' });
    if (error) throw error;
    res.status(201).json({ message: 'Thank you for your feedback!', rating: data });
  })
);

// POST /api/v1/rides/:id/sos — emergency SOS
router.post('/:id/sos', ...requireAuth, asyncHandler(async (req, res) => {
  const result = await rideService.triggerSOS(req.params.id, req.user.id);
  res.json(result);
}));

module.exports = router;

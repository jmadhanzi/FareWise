const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireDriver, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { supabase } = require('../config/database');
const paymentService = require('../services/paymentService');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/v1/subscriptions/plans
router.get('/plans', (req, res) => {
  res.json([
    {
      id: 'standard',
      name: 'Standard Driver',
      price_usd: parseFloat(process.env.SUBSCRIPTION_STANDARD_USD || 20),
      features: [
        'Keep 100% of every fare',
        'Unlimited rides',
        'Go online/offline anytime',
        'Earnings dashboard',
        'Rider ratings',
        'WhatsApp integration'
      ],
      recommended: true
    },
    {
      id: 'premium',
      name: 'Premium Driver',
      price_usd: parseFloat(process.env.SUBSCRIPTION_PREMIUM_USD || 35),
      features: [
        'Everything in Standard',
        'Premium badge on profile',
        'Priority matching for riders',
        'Advanced earnings analytics',
        'Dedicated support line'
      ],
      recommended: false
    }
  ]);
});

// POST /api/v1/subscriptions/subscribe
router.post('/subscribe', ...requireDriver,
  [
    body('plan_type').isIn(['standard', 'premium']),
    body('payment_method').isIn(['ecocash', 'onemoney', 'zimswitch', 'visa']),
    body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/)
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { data: driver } = await supabase
      .from('drivers').select('id, approval_status').eq('user_id', req.user.id).single();
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const plans = { standard: 20, premium: 35 };
    const amount = plans[req.body.plan_type];

    const result = await paymentService.initiatePayment(req.user, {
      amount,
      payment_method: req.body.payment_method,
      payment_type: 'subscription',
      phone: req.body.phone || req.user.phone,
      plan_type: req.body.plan_type
    });
    res.json(result);
  })
);

// GET /api/v1/subscriptions/my
router.get('/my', ...requireDriver, asyncHandler(async (req, res) => {
  const { data: driver } = await supabase
    .from('drivers').select('id').eq('user_id', req.user.id).single();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('driver_id', driver.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

module.exports = router;

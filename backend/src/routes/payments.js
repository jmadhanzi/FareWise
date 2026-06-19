const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireAuth, requireDriver } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const paymentService = require('../services/paymentService');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/v1/payments/initiate — initiate EcoCash/OneMoney payment
router.post('/initiate', ...requireAuth,
  [
    body('amount').isFloat({ min: 0.5 }),
    body('payment_method').isIn(['ecocash', 'onemoney', 'zimswitch', 'visa']),
    body('payment_type').isIn(['ride_fare', 'subscription', 'onboarding_fee']),
    body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/),
    body('ride_id').optional().isUUID(),
    body('subscription_id').optional().isUUID()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await paymentService.initiatePayment(req.user, req.body);
    res.json(result);
  })
);

// POST /api/v1/payments/paynow/result — Paynow IPN webhook
router.post('/paynow/result', asyncHandler(async (req, res) => {
  await paymentService.handlePaynowIPN(req.body);
  res.status(200).send('OK');
}));

// GET /api/v1/payments/paynow/return — user redirect after Paynow
router.get('/paynow/return', asyncHandler(async (req, res) => {
  const { reference, paynowreference, status } = req.query;
  const result = await paymentService.checkPaynowStatus(paynowreference);
  const deepLink = `farewise://payment/${result.status}?ref=${paynowreference}`;
  res.redirect(deepLink);
}));

// GET /api/v1/payments/check/:reference — poll payment status
router.get('/check/:reference', ...requireAuth, asyncHandler(async (req, res) => {
  const result = await paymentService.checkPaynowStatus(req.params.reference);
  res.json(result);
}));

// GET /api/v1/payments/history
router.get('/history', ...requireAuth, asyncHandler(async (req, res) => {
  const { supabase } = require('../config/database');
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  res.json(data);
}));

module.exports = router;

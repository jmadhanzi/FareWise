const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { otpLimiter } = require('../middleware/rateLimiter');
const authService = require('../services/authService');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /api/v1/auth/send-otp
router.post('/send-otp',
  otpLimiter,
  [body('phone').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone number required')],
  validate,
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await authService.sendOTP(phone);
    res.json({ message: 'OTP sent', expiresIn: 600, ...result });
  })
);

// POST /api/v1/auth/verify-otp
router.post('/verify-otp',
  [
    body('phone').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit OTP required'),
    body('role').isIn(['rider', 'driver']).withMessage('Role must be rider or driver')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { phone, otp, role } = req.body;
    const result = await authService.verifyOTP(phone, otp, role);
    res.json(result);
  })
);

// POST /api/v1/auth/refresh
router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.json(result);
  })
);

module.exports = router;

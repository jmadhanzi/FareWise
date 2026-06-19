const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone, full_name, role, is_active')
      .eq('id', decoded.userId)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const requireDriver = [authenticate, requireRole('driver')];
const requireRider = [authenticate, requireRole('rider')];
const requireAdmin = [authenticate, requireRole('admin')];
const requireAuth = [authenticate];

module.exports = { authenticate, requireRole, requireDriver, requireRider, requireAdmin, requireAuth };

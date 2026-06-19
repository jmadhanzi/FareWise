const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const smsService = require('./smsService');
const { logger } = require('../config/logger');

const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (phone) => {
  const normalizedPhone = normalizePhone(phone);
  // Clean up old OTPs for this phone
  await supabase.from('otps').delete().eq('phone', normalizedPhone).eq('is_used', false);

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY).toISOString();

  await supabase.from('otps').insert({
    phone: normalizedPhone,
    otp_code: otp,
    expires_at: expiresAt
  });

  // In dev mode, log OTP instead of sending SMS
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
    return { sent: true, dev_otp: otp };
  }

  await smsService.sendSMS(normalizedPhone, `Your FareWise verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`);
  return { sent: true };
};

const verifyOTP = async (phone, otp, role) => {
  const normalizedPhone = normalizePhone(phone);

  const { data: otpRecord, error } = await supabase
    .from('otps')
    .select('*')
    .eq('phone', normalizedPhone)
    .eq('otp_code', otp)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !otpRecord) {
    throw Object.assign(new Error('Invalid or expired OTP'), { statusCode: 400 });
  }

  // Mark OTP as used
  await supabase.from('otps').update({ is_used: true }).eq('id', otpRecord.id);

  // Find or create user
  let { data: user } = await supabase.from('users').select('*').eq('phone', normalizedPhone).single();

  if (!user) {
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({ phone: normalizedPhone, role, is_verified: true })
      .select()
      .single();
    if (createError) throw createError;
    user = newUser;
  } else if (user.role !== role && role === 'driver' && user.role === 'rider') {
    // Allow rider to also register as driver
    await supabase.from('users').update({ role: 'driver' }).eq('id', user.id);
    user.role = 'driver';
  }

  if (!user.is_active) {
    throw Object.assign(new Error('Account suspended. Contact support.'), { statusCode: 403 });
  }

  const token = jwt.sign(
    { userId: user.id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      full_name: user.full_name,
      role: user.role,
      profile_photo_url: user.profile_photo_url,
      is_verified: user.is_verified
    },
    is_new_user: !user.full_name
  };
};

const refreshToken = async (oldToken) => {
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    const { data: user } = await supabase.from('users').select('id, role, is_active').eq('id', decoded.userId).single();
    if (!user || !user.is_active) throw new Error('User not found or suspended');
    const token = jwt.sign(
      { userId: user.id, phone: decoded.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );
    return { token };
  } catch {
    throw Object.assign(new Error('Cannot refresh token'), { statusCode: 401 });
  }
};

const normalizePhone = (phone) => {
  let p = phone.replace(/\s+/g, '');
  if (p.startsWith('07') || p.startsWith('08')) p = '+263' + p.slice(1);
  if (!p.startsWith('+')) p = '+' + p;
  return p;
};

module.exports = { sendOTP, verifyOTP, refreshToken };

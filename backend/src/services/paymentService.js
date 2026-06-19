const axios = require('axios');
const crypto = require('crypto');
const { supabase } = require('../config/database');
const { logger } = require('../config/logger');

const PAYNOW_URL = 'https://www.paynow.co.zw/interface/remotetransaction';
const PAYNOW_QUERY_URL = 'https://www.paynow.co.zw/interface/remotequeryreference';

const initiatePayment = async (user, paymentData) => {
  const { amount, payment_method, payment_type, phone, ride_id, subscription_id, plan_type } = paymentData;

  const reference = `FW-${Date.now()}-${user.id.slice(0, 8)}`;
  const description = getPaymentDescription(payment_type, plan_type);

  // Create payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      ride_id,
      subscription_id,
      amount,
      currency: 'USD',
      payment_type,
      payment_method,
      status: 'pending',
      external_reference: reference,
      metadata: { plan_type, phone }
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  // Skip Paynow in dev mode
  if (process.env.NODE_ENV === 'development' || !process.env.PAYNOW_INTEGRATION_ID) {
    logger.info('[DEV] Payment initiated (skipping Paynow)', { reference, amount, payment_method });
    return {
      payment_id: payment.id,
      reference,
      status: 'pending',
      dev_mode: true,
      message: 'Development mode — payment auto-approved'
    };
  }

  const paynowData = buildPaynowRequest({
    reference,
    amount,
    email: `${user.phone.replace('+', '')}@farewise.co.zw`,
    phone: (phone || user.phone).replace('+263', '0').replace('+', ''),
    description,
    payment_method
  });

  try {
    const response = await axios.post(PAYNOW_URL, new URLSearchParams(paynowData).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    const result = parsePaynowResponse(response.data);

    if (result.status.toLowerCase() === 'ok') {
      await supabase.from('payments').update({
        paynow_hash: result.hash,
        paynow_poll_url: result.pollurl,
        paynow_reference: result.paynowreference,
        status: 'processing'
      }).eq('id', payment.id);

      return {
        payment_id: payment.id,
        reference,
        paynow_reference: result.paynowreference,
        redirect_url: result.redirecturl,
        poll_url: result.pollurl,
        status: 'processing'
      };
    } else {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      throw new Error(`Paynow error: ${result.error || result.status}`);
    }
  } catch (err) {
    logger.error('Paynow initiation failed', { error: err.message });
    throw err;
  }
};

const checkPaynowStatus = async (paynowReference) => {
  if (!process.env.PAYNOW_INTEGRATION_ID) {
    return { status: 'paid', message: 'Dev mode' };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('paynow_reference', paynowReference)
    .single();

  if (!payment?.paynow_poll_url) return { status: 'unknown' };

  const hash = generateHash(`${process.env.PAYNOW_INTEGRATION_ID}${paynowReference}${process.env.PAYNOW_INTEGRATION_KEY}`);
  const response = await axios.post(PAYNOW_QUERY_URL, new URLSearchParams({
    id: process.env.PAYNOW_INTEGRATION_ID,
    reference: paynowReference,
    hash
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const result = parsePaynowResponse(response.data);
  return { status: result.status, paynow_reference: paynowReference };
};

const handlePaynowIPN = async (body) => {
  const result = parsePaynowResponse(body);
  const { paynowreference, status, amount } = result;

  const { data: payment } = await supabase
    .from('payments').select('*').eq('paynow_reference', paynowreference).single();
  if (!payment) return;

  const isPaid = ['paid', 'awaiting delivery'].includes(status?.toLowerCase());

  await supabase.from('payments').update({
    status: isPaid ? 'completed' : 'failed'
  }).eq('id', payment.id);

  if (isPaid && payment.payment_type === 'subscription') {
    const { data: driver } = await supabase
      .from('drivers').select('id').eq('user_id', payment.user_id).single();
    const planType = payment.metadata?.plan_type || 'standard';
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    await supabase.from('subscriptions').insert({
      driver_id: driver.id,
      plan_type: planType,
      amount_usd: payment.amount,
      status: 'active',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      payment_method: payment.payment_method,
      paynow_reference: paynowreference
    });
    logger.info('Subscription activated', { driver_id: driver.id, plan: planType });
  }
};

const buildPaynowRequest = ({ reference, amount, email, phone, description, payment_method }) => {
  const data = {
    id: process.env.PAYNOW_INTEGRATION_ID,
    reference,
    amount: amount.toFixed(2),
    additionalinfo: description,
    returnurl: process.env.PAYNOW_RETURN_URL,
    resulturl: process.env.PAYNOW_RESULT_URL,
    authemail: email,
    status: 'Message'
  };
  if (['ecocash', 'onemoney'].includes(payment_method)) {
    data.method = payment_method;
    data.phone = phone;
  }
  data.hash = generateHashFromFields(data);
  return data;
};

const generateHashFromFields = (data) => {
  const str = Object.values(data).join('') + process.env.PAYNOW_INTEGRATION_KEY;
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
};

const generateHash = (str) => crypto.createHash('md5').update(str).digest('hex').toUpperCase();

const parsePaynowResponse = (responseText) => {
  const result = {};
  if (typeof responseText === 'object') return responseText;
  responseText.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    result[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return result;
};

const getPaymentDescription = (type, plan) => {
  const descriptions = {
    subscription: `FareWise ${plan || 'standard'} subscription - 30 days`,
    ride_fare: 'FareWise ride fare',
    onboarding_fee: 'FareWise driver onboarding fee'
  };
  return descriptions[type] || 'FareWise payment';
};

module.exports = { initiatePayment, checkPaynowStatus, handlePaynowIPN };

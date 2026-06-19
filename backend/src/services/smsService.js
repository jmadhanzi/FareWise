const https = require('https');
const { logger } = require('../config/logger');

const sendSMS = async (phone, message) => {
  if (process.env.NODE_ENV === 'development' || !process.env.AFRICA_TALKING_API_KEY) {
    logger.info(`[DEV SMS] To: ${phone} | Message: ${message}`);
    return { status: 'dev', phone, message };
  }

  const username = process.env.AFRICA_TALKING_USERNAME;
  const apiKey = process.env.AFRICA_TALKING_API_KEY;
  const senderId = process.env.AFRICA_TALKING_SENDER_ID || 'FareWise';

  const body = new URLSearchParams({
    username,
    to: phone,
    message,
    from: senderId
  }).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.africastalking.com',
      port: 443,
      path: '/version1/messaging',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'apiKey': apiKey,
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

module.exports = { sendSMS };

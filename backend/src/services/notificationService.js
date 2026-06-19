const { getMessaging } = require('../config/firebase');
const { logger } = require('../config/logger');

const sendPushNotification = async (fcmToken, { title, body, data = {} }) => {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('[DEV] Push notification (Firebase not configured)', { title, body });
    return;
  }
  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'farewise_rides' }
      }
    };
    const result = await messaging.send(message);
    logger.debug('Push notification sent', { messageId: result });
    return result;
  } catch (err) {
    logger.error('Push notification failed', { error: err.message, token: fcmToken?.slice(0, 20) });
  }
};

const sendMulticastNotification = async (tokens, notification) => {
  const messaging = getMessaging();
  if (!messaging || !tokens.length) return;
  const message = {
    tokens,
    notification,
    android: { priority: 'high' }
  };
  return messaging.sendEachForMulticast(message);
};

module.exports = { sendPushNotification, sendMulticastNotification };

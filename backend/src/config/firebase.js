const admin = require('firebase-admin');
const { logger } = require('./logger');

let firebaseApp;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;
  if (!process.env.FIREBASE_PROJECT_ID) {
    logger.warn('Firebase not configured — real-time features disabled');
    return null;
  }
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    logger.info('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (err) {
    logger.error('Firebase init failed', { error: err.message });
    return null;
  }
};

const getFirebaseDB = () => {
  const app = initFirebase();
  if (!app) return null;
  return admin.database();
};

const getMessaging = () => {
  const app = initFirebase();
  if (!app) return null;
  return admin.messaging();
};

// Initialize on load
initFirebase();

module.exports = { initFirebase, getFirebaseDB, getMessaging };

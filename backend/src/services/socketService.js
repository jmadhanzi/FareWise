const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { query } = require('../config/database');
const { getFirebaseDB } = require('../config/firebase');

let io;

// Track online drivers: driverId -> socketId
const onlineDrivers = new Map();

function init(httpServer) {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // JWT auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
      if (!result.rows.length) return next(new Error('User not found'));
      socket.user = result.rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    logger.info(`Socket connected: ${user.role} ${user.id}`);

    // Each user joins their personal room
    socket.join(`user:${user.id}`);

    if (user.role === 'driver') {
      socket.join('drivers');
      onlineDrivers.set(user.id, socket.id);
    }
    if (user.role === 'rider') {
      socket.join('riders');
    }

    // Driver location update
    socket.on('driver:location', async ({ lat, lng }) => {
      if (user.role !== 'driver') return;
      try {
        // Update DB
        await query(
          'UPDATE drivers SET current_lat = $1, current_lng = $2, last_location_update = NOW() WHERE user_id = $3',
          [lat, lng, user.id]
        );
        // Update Firebase for active rides
        const db = getFirebaseDB();
        if (db) {
          await db.ref(`driver_locations/${user.id}`).set({ lat, lng, ts: Date.now() });
        }
        // Broadcast to any active ride room the driver is in
        const driverResult = await query('SELECT current_ride_id FROM drivers WHERE user_id = $1', [user.id]);
        const activeRideId = driverResult.rows[0]?.current_ride_id;
        if (activeRideId) {
          io.to(`ride:${activeRideId}`).emit('driver:location_update', { lat, lng, driverId: user.id });
        }
      } catch (err) {
        logger.error('driver:location error', { err: err.message });
      }
    });

    // Join a ride room (rider tracking)
    socket.on('ride:join', ({ rideId }) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on('ride:leave', ({ rideId }) => {
      socket.leave(`ride:${rideId}`);
    });

    // Driver accepts/declines via Firebase RT DB — socket events are supplemental
    socket.on('ride:accept', async ({ rideId }) => {
      if (user.role !== 'driver') return;
      try {
        const db = getFirebaseDB();
        if (db) {
          await db.ref(`ride_responses/${rideId}/${user.id}`).set('accepted');
        }
      } catch (err) {
        logger.error('ride:accept socket error', { err: err.message });
      }
    });

    socket.on('ride:decline', async ({ rideId }) => {
      if (user.role !== 'driver') return;
      try {
        const db = getFirebaseDB();
        if (db) {
          await db.ref(`ride_responses/${rideId}/${user.id}`).set('declined');
        }
      } catch (err) {
        logger.error('ride:decline socket error', { err: err.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.role} ${user.id}`);
      if (user.role === 'driver') {
        onlineDrivers.delete(user.id);
      }
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

function getIO() {
  return io;
}

// Send a ride request popup to a specific driver's personal room
function broadcastRideRequest(driverUserId, ride) {
  if (!io) return;
  io.to(`user:${driverUserId}`).emit('ride:new_request', ride);
}

// Notify a specific user (rider or driver) with a generic event
function notifyUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Broadcast to all connected drivers
function broadcastToDrivers(event, data) {
  if (!io) return;
  io.to('drivers').emit(event, data);
}

// Broadcast to a ride room (all parties)
function broadcastToRide(rideId, event, data) {
  if (!io) return;
  io.to(`ride:${rideId}`).emit(event, data);
}

function isDriverOnline(driverUserId) {
  return onlineDrivers.has(driverUserId);
}

module.exports = { init, getIO, broadcastRideRequest, notifyUser, broadcastToDrivers, broadcastToRide, isDriverOnline };

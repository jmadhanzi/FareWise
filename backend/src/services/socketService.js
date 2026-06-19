const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const { getFirebaseDB } = require('../config/firebase');
const { logger } = require('../config/logger');

const connectedUsers = new Map();

const initSocketHandlers = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { data: user } = await supabase
        .from('users').select('id, role').eq('id', decoded.userId).single();
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    connectedUsers.set(id, socket.id);
    logger.debug('Socket connected', { userId: id, role });

    socket.join(`user:${id}`);
    if (role === 'driver') socket.join('drivers');
    if (role === 'rider') socket.join('riders');

    // Driver location update
    socket.on('driver:location', async ({ lat, lng, heading, ride_id }) => {
      if (role !== 'driver') return;
      const { data: driver } = await supabase
        .from('drivers').select('id').eq('user_id', id).single();
      if (!driver) return;

      await supabase.from('drivers').update({
        current_lat: lat, current_lng: lng, heading,
        last_location_update: new Date().toISOString()
      }).eq('id', driver.id);

      const db = getFirebaseDB();
      if (db) {
        await db.ref(`drivers/${driver.id}/location`).set({ lat, lng, heading, ts: Date.now() });
      }

      // Broadcast to rider tracking this ride
      if (ride_id) {
        io.to(`ride:${ride_id}`).emit('driver:location:update', { lat, lng, heading, driver_id: driver.id });
      }
    });

    // Rider joins ride room
    socket.on('ride:join', (ride_id) => {
      socket.join(`ride:${ride_id}`);
    });

    // Driver accepts/declines via socket
    socket.on('ride:accept', async ({ ride_id }) => {
      if (role !== 'driver') return;
      const { data: driver } = await supabase
        .from('drivers').select('id').eq('user_id', id).single();
      const db = getFirebaseDB();
      if (db) await db.ref(`ride_responses/${ride_id}/${driver.id}`).set('accepted');
    });

    socket.on('ride:decline', async ({ ride_id }) => {
      if (role !== 'driver') return;
      const { data: driver } = await supabase
        .from('drivers').select('id').eq('user_id', id).single();
      const db = getFirebaseDB();
      if (db) await db.ref(`ride_responses/${ride_id}/${driver.id}`).set('declined');
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(id);
      logger.debug('Socket disconnected', { userId: id });
    });
  });
};

const emitToUser = (io, userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
};

module.exports = { initSocketHandlers, emitToUser, connectedUsers };

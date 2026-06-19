import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

let socket = null;
let rideRequestListener = null;

export function connectSocket() {
  const { token } = useAuthStore.getState();
  if (socket?.connected) return socket;

  socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => console.log('Socket connected:', socket.id));
  socket.on('disconnect', reason => console.log('Socket disconnected:', reason));
  socket.on('connect_error', err => console.error('Socket error:', err.message));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

// Driver: listen for incoming ride requests pushed over Socket
export function onRideRequest(callback) {
  if (!socket) return;
  if (rideRequestListener) socket.off('ride:new_request', rideRequestListener);
  rideRequestListener = (ride) => callback(ride);
  socket.on('ride:new_request', rideRequestListener);
}

export function offRideRequest() {
  if (socket && rideRequestListener) {
    socket.off('ride:new_request', rideRequestListener);
    rideRequestListener = null;
  }
}

export function emitDriverLocation(lat, lng) {
  if (socket?.connected) {
    socket.emit('driver:location', { lat, lng });
  }
}

export function joinRideRoom(rideId) {
  if (socket?.connected) {
    socket.emit('ride:join', { rideId });
  }
}

export function leaveRideRoom(rideId) {
  if (socket?.connected) {
    socket.emit('ride:leave', { rideId });
  }
}

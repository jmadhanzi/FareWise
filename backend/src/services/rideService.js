const { supabase } = require('../config/database');
const { getFirebaseDB } = require('../config/firebase');
const notificationService = require('./notificationService');
const { logger } = require('../config/logger');

const MATCHING_RADIUS_KM = parseFloat(process.env.MATCHING_RADIUS_KM || 5);
const DRIVER_ACCEPT_TIMEOUT = parseInt(process.env.DRIVER_ACCEPT_TIMEOUT_SECONDS || 30) * 1000;

const requestRide = async (riderId, rideData) => {
  const {
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    payment_method, requested_driver_id
  } = rideData;

  const distance = haversine(pickup_lat, pickup_lng, destination_lat, destination_lng);
  const estDuration = Math.round((distance / 30) * 60);

  const { data: ride, error } = await supabase
    .from('rides')
    .insert({
      rider_id: riderId,
      pickup_lat, pickup_lng, pickup_address,
      destination_lat, destination_lng, destination_address,
      distance_km: distance.toFixed(2),
      estimated_duration_mins: estDuration,
      payment_method,
      requested_driver_id,
      status: 'matching'
    })
    .select()
    .single();

  if (error) throw error;

  // Sync to Firebase for real-time
  const db = getFirebaseDB();
  if (db) {
    await db.ref(`rides/${ride.id}`).set({
      status: 'matching',
      rider_id: riderId,
      pickup: { lat: pickup_lat, lng: pickup_lng, address: pickup_address },
      destination: { lat: destination_lat, lng: destination_lng, address: destination_address },
      created_at: Date.now()
    });
  }

  // Start matching process asynchronously
  matchDriverToRide(ride).catch(err => logger.error('Matching error', { error: err.message, rideId: ride.id }));

  return ride;
};

const matchDriverToRide = async (ride) => {
  // Find nearby available drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select(`
      id, current_lat, current_lng,
      user:users!user_id(id, full_name, fcm_token)
    `)
    .eq('is_online', true)
    .eq('approval_status', 'approved')
    .not('current_lat', 'is', null);

  const nearby = (drivers || [])
    .map(d => ({
      ...d,
      distance: haversine(ride.pickup_lat, ride.pickup_lng, d.current_lat, d.current_lng)
    }))
    .filter(d => d.distance <= MATCHING_RADIUS_KM)
    .sort((a, b) => a.distance - b.distance);

  if (nearby.length === 0) {
    await supabase.from('rides').update({ status: 'no_driver_found' }).eq('id', ride.id);
    const db = getFirebaseDB();
    if (db) await db.ref(`rides/${ride.id}/status`).set('no_driver_found');
    return;
  }

  // Try each driver in order until one accepts
  for (const driver of nearby) {
    const accepted = await offerRideToDriver(ride, driver);
    if (accepted) return;
  }

  // No driver accepted
  await supabase.from('rides').update({ status: 'no_driver_found' }).eq('id', ride.id);
};

const offerRideToDriver = async (ride, driver) => {
  if (!driver.user?.fcm_token) return false;

  await notificationService.sendPushNotification(driver.user.fcm_token, {
    title: 'New Ride Request 🚗',
    body: `Pickup: ${ride.pickup_address} → ${ride.destination_address}. ${ride.distance_km}km away.`,
    data: { type: 'ride_request', ride_id: ride.id, driver_id: driver.id }
  });

  // Wait for driver response
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), DRIVER_ACCEPT_TIMEOUT);
    const db = getFirebaseDB();
    if (!db) { clearTimeout(timeout); return resolve(false); }

    const ref = db.ref(`ride_responses/${ride.id}/${driver.id}`);
    ref.on('value', async (snap) => {
      const val = snap.val();
      if (val === 'accepted') {
        clearTimeout(timeout);
        ref.off();
        await assignDriverToRide(ride.id, driver.id);
        resolve(true);
      } else if (val === 'declined') {
        clearTimeout(timeout);
        ref.off();
        resolve(false);
      }
    });
  });
};

const assignDriverToRide = async (rideId, driverId) => {
  const { data: ride } = await supabase
    .from('rides')
    .update({ driver_id: driverId, status: 'driver_assigned', matched_at: new Date().toISOString() })
    .eq('id', rideId)
    .select(`rider:users!rider_id(fcm_token, full_name)`)
    .single();

  const db = getFirebaseDB();
  if (db) await db.ref(`rides/${rideId}/status`).set('driver_assigned');

  if (ride?.rider?.fcm_token) {
    await notificationService.sendPushNotification(ride.rider.fcm_token, {
      title: 'Driver Found! 🎉',
      body: 'Your driver is on the way.',
      data: { type: 'driver_assigned', ride_id: rideId }
    });
  }
};

const acceptRide = async (rideId, driverUserId) => {
  const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', driverUserId).single();
  const db = getFirebaseDB();
  if (db) await db.ref(`ride_responses/${rideId}/${driver.id}`).set('accepted');
  return { message: 'Ride accepted' };
};

const declineRide = async (rideId, driverUserId) => {
  const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', driverUserId).single();
  const db = getFirebaseDB();
  if (db) await db.ref(`ride_responses/${rideId}/${driver.id}`).set('declined');
  return { message: 'Ride declined' };
};

const markArrived = async (rideId, driverUserId) => {
  const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', driverUserId).single();
  const { data: ride } = await supabase
    .from('rides')
    .update({ status: 'arrived', driver_arrived_at: new Date().toISOString() })
    .eq('id', rideId).eq('driver_id', driver.id)
    .select('rider:users!rider_id(fcm_token)').single();
  if (ride?.rider?.fcm_token) {
    await notificationService.sendPushNotification(ride.rider.fcm_token, {
      title: 'Driver Arrived 🚗',
      body: 'Your driver is waiting at the pickup point.',
      data: { type: 'driver_arrived', ride_id: rideId }
    });
  }
  const db = getFirebaseDB();
  if (db) await db.ref(`rides/${rideId}/status`).set('arrived');
  return { message: 'Marked as arrived' };
};

const startRide = async (rideId, driverUserId) => {
  const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', driverUserId).single();
  await supabase.from('rides')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', rideId).eq('driver_id', driver.id);
  const db = getFirebaseDB();
  if (db) await db.ref(`rides/${rideId}/status`).set('in_progress');
  return { message: 'Ride started' };
};

const completeRide = async (rideId, driverUserId, finalFare) => {
  const { data: driver } = await supabase.from('drivers').select('id, total_rides, total_earnings').eq('user_id', driverUserId).single();
  const { data: ride } = await supabase
    .from('rides')
    .update({
      status: 'completed',
      final_fare: finalFare,
      payment_status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', rideId).eq('driver_id', driver.id)
    .select('*').single();

  // Update driver earnings
  await supabase.from('drivers').update({
    total_rides: driver.total_rides + 1,
    total_earnings: parseFloat(driver.total_earnings) + parseFloat(finalFare)
  }).eq('id', driver.id);

  const db = getFirebaseDB();
  if (db) {
    await db.ref(`rides/${rideId}`).update({ status: 'completed', final_fare: finalFare });
    await db.ref(`ride_responses/${rideId}`).remove();
  }
  return { message: 'Ride completed. Great job!', ride };
};

const cancelRide = async (rideId, user, reason) => {
  const { data: ride } = await supabase.from('rides').select('*').eq('id', rideId).single();
  if (!ride) throw Object.assign(new Error('Ride not found'), { statusCode: 404 });
  if (['completed', 'cancelled'].includes(ride.status)) {
    throw Object.assign(new Error('Cannot cancel this ride'), { statusCode: 400 });
  }

  const cancelledBy = user.role === 'driver' ? 'driver' : 'rider';
  await supabase.from('rides').update({
    status: 'cancelled',
    cancelled_by: cancelledBy,
    cancellation_reason: reason,
    cancelled_at: new Date().toISOString()
  }).eq('id', rideId);

  const db = getFirebaseDB();
  if (db) await db.ref(`rides/${rideId}/status`).set('cancelled');
  return { message: 'Ride cancelled' };
};

const triggerSOS = async (rideId, userId) => {
  const { data: ride } = await supabase.from('rides').select('*, rider:users!rider_id(emergency_contact, full_name)').eq('id', rideId).single();
  if (!ride) throw Object.assign(new Error('Ride not found'), { statusCode: 404 });

  await supabase.from('rides').update({
    sos_triggered: true,
    sos_triggered_at: new Date().toISOString()
  }).eq('id', rideId);

  logger.warn('SOS TRIGGERED', { rideId, userId, emergency_contact: ride.rider?.emergency_contact });

  // SMS emergency contact
  if (ride.rider?.emergency_contact) {
    const smsService = require('./smsService');
    await smsService.sendSMS(
      ride.rider.emergency_contact,
      `FAREWISE ALERT: ${ride.rider.full_name} has triggered an SOS during a ride. Last known trip: ${ride.pickup_address} to ${ride.destination_address}. Please call them immediately.`
    );
  }
  return { message: 'SOS triggered. Emergency contact notified.', sos: true };
};

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

module.exports = { requestRide, acceptRide, declineRide, markArrived, startRide, completeRide, cancelRide, triggerSOS };

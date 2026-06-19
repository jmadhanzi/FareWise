const { query, getClient } = require('../config/database');
const { getFirebaseDB, getMessaging } = require('../config/firebase');
const logger = require('../config/logger');
const socketService = require('./socketService');

const MATCH_RADIUS_KM = parseFloat(process.env.MATCHING_RADIUS_KM) || 5;
const DRIVER_TIMEOUT_MS = 30000; // 30 seconds per driver

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function requestRide(riderId, rideData) {
  const {
    pickup_address,
    pickup_lat,
    pickup_lng,
    destination_address,
    destination_lat,
    destination_lng,
    payment_method,
    favourite_driver_id,
    estimated_fare,
    estimated_distance_km,
  } = rideData;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const tripShareToken = require('crypto').randomBytes(16).toString('hex');

    const result = await client.query(
      `INSERT INTO rides (
         rider_id, pickup_address, pickup_lat, pickup_lng,
         destination_address, destination_lat, destination_lng,
         payment_method, estimated_fare, estimated_distance_km,
         trip_share_token, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'searching')
       RETURNING *`,
      [
        riderId, pickup_address, pickup_lat, pickup_lng,
        destination_address, destination_lat, destination_lng,
        payment_method, estimated_fare, estimated_distance_km,
        tripShareToken,
      ]
    );

    const ride = result.rows[0];
    await client.query('COMMIT');

    // Sync to Firebase
    const db = getFirebaseDB();
    if (db) {
      await db.ref(`rides/${ride.id}`).set({
        status: 'searching',
        rider_id: riderId,
        pickup: { lat: pickup_lat, lng: pickup_lng, address: pickup_address },
        destination: { lat: destination_lat, lng: destination_lng, address: destination_address },
        created_at: Date.now(),
      });
    }

    // Start matching asynchronously (don't await — respond immediately)
    matchDriverToRide(ride, favourite_driver_id).catch(err =>
      logger.error('Matching error', { rideId: ride.id, err: err.message })
    );

    return ride;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function matchDriverToRide(ride, favouriteDriverId) {
  try {
    // Build candidate list — favourite driver first if specified
    let drivers = [];

    if (favouriteDriverId) {
      const favResult = await query(
        `SELECT d.id, d.user_id, d.current_lat, d.current_lng, u.fcm_token, u.full_name
         FROM drivers d
         JOIN users u ON u.id = d.user_id
         WHERE d.id = $1 AND d.is_online = true AND d.approval_status = 'approved'
           AND d.current_lat IS NOT NULL`,
        [favouriteDriverId]
      );
      if (favResult.rows.length > 0) {
        drivers.push({ ...favResult.rows[0], distance: haversine(ride.pickup_lat, ride.pickup_lng, favResult.rows[0].current_lat, favResult.rows[0].current_lng) });
      }
    }

    // Fill remaining candidates within radius
    const nearbyResult = await query(
      `SELECT d.id, d.user_id, d.current_lat, d.current_lng, u.fcm_token, u.full_name
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN subscriptions s ON s.driver_id = d.id AND s.status = 'active'
       WHERE d.is_online = true
         AND d.approval_status = 'approved'
         AND d.current_lat IS NOT NULL
         AND s.id IS NOT NULL
         AND d.id != $1
         AND d.current_ride_id IS NULL`,
      [favouriteDriverId || '00000000-0000-0000-0000-000000000000']
    );

    const nearby = nearbyResult.rows
      .map(d => ({ ...d, distance: haversine(ride.pickup_lat, ride.pickup_lng, d.current_lat, d.current_lng) }))
      .filter(d => d.distance <= MATCH_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

    drivers = [...drivers, ...nearby];

    if (drivers.length === 0) {
      await updateRideStatus(ride.id, 'no_driver_found');
      notifyRider(ride.rider_id, 'ride:no_driver', { rideId: ride.id });
      return;
    }

    // Try each driver sequentially
    for (const driver of drivers) {
      const accepted = await offerRideToDriver(ride, driver);
      if (accepted) {
        await assignDriverToRide(ride.id, driver);
        return;
      }
    }

    await updateRideStatus(ride.id, 'no_driver_found');
    notifyRider(ride.rider_id, 'ride:no_driver', { rideId: ride.id });
  } catch (err) {
    logger.error('matchDriverToRide failed', { rideId: ride.id, err: err.message });
    await updateRideStatus(ride.id, 'no_driver_found').catch(() => {});
  }
}

async function offerRideToDriver(ride, driver) {
  try {
    // 1. Push via Socket.IO (instant if driver app is open)
    socketService.broadcastRideRequest(driver.user_id, {
      id: ride.id,
      pickup_address: ride.pickup_address,
      pickup_lat: ride.pickup_lat,
      pickup_lng: ride.pickup_lng,
      destination_address: ride.destination_address,
      destination_lat: ride.destination_lat,
      destination_lng: ride.destination_lng,
      estimated_fare: ride.estimated_fare,
      estimated_distance_km: ride.estimated_distance_km,
      payment_method: ride.payment_method,
      driver_distance_km: driver.distance,
    });

    // 2. FCM push notification (wakes app from background/killed state)
    const messaging = getMessaging();
    if (messaging && driver.fcm_token) {
      await messaging.send({
        token: driver.fcm_token,
        data: {
          type: 'ride_request',
          ride_id: ride.id,
          pickup: ride.pickup_address,
          destination: ride.destination_address,
          fare: String(ride.estimated_fare || ''),
        },
        notification: {
          title: 'New Ride Request!',
          body: `${ride.pickup_address} → ${ride.destination_address}`,
        },
        android: {
          priority: 'high',
          notification: { channelId: 'ride_requests', priority: 'max', defaultSound: true, defaultVibrateTimings: true },
        },
      }).catch(err => logger.warn('FCM send failed', { err: err.message }));
    }

    // 3. Write offer to Firebase and wait for response
    const db = getFirebaseDB();
    if (db) {
      const responseRef = db.ref(`ride_responses/${ride.id}/${driver.id}`);
      await responseRef.set('pending');

      return await new Promise((resolve) => {
        const timer = setTimeout(() => {
          responseRef.off('value');
          resolve(false); // timeout = no response = move to next driver
        }, DRIVER_TIMEOUT_MS);

        responseRef.on('value', (snap) => {
          const val = snap.val();
          if (val === 'accepted') {
            clearTimeout(timer);
            responseRef.off('value');
            resolve(true);
          } else if (val === 'declined') {
            clearTimeout(timer);
            responseRef.off('value');
            resolve(false);
          }
          // 'pending' = still waiting
        });
      });
    }

    // Firebase not configured — fall back to a 30s wait (dev mode)
    await new Promise(r => setTimeout(r, DRIVER_TIMEOUT_MS));
    return false;
  } catch (err) {
    logger.error('offerRideToDriver error', { driverId: driver.id, err: err.message });
    return false;
  }
}

async function assignDriverToRide(rideId, driver) {
  await query(
    `UPDATE rides SET driver_id = $1, status = 'accepted', accepted_at = NOW() WHERE id = $2`,
    [driver.user_id, rideId]
  );
  await query(
    `UPDATE drivers SET current_ride_id = $1 WHERE id = $2`,
    [rideId, driver.id]
  );

  const rideResult = await query('SELECT * FROM rides WHERE id = $1', [rideId]);
  const ride = rideResult.rows[0];

  const db = getFirebaseDB();
  if (db) {
    await db.ref(`rides/${rideId}`).update({
      status: 'accepted',
      driver_id: driver.user_id,
      driver_name: driver.full_name,
    });
  }

  // Notify rider
  socketService.notifyUser(ride.rider_id, 'ride:accepted', {
    rideId,
    driver: { userId: driver.user_id, name: driver.full_name },
  });
}

async function acceptRide(rideId, driverUserId) {
  const driverResult = await query('SELECT id FROM drivers WHERE user_id = $1', [driverUserId]);
  if (!driverResult.rows.length) throw new Error('Driver profile not found');
  const driver = driverResult.rows[0];

  const db = getFirebaseDB();
  if (db) {
    await db.ref(`ride_responses/${rideId}/${driver.id}`).set('accepted');
  } else {
    // Firebase not configured: directly assign
    await assignDriverToRide(rideId, { ...driver, user_id: driverUserId });
  }

  return { success: true };
}

async function declineRide(rideId, driverUserId) {
  const driverResult = await query('SELECT id FROM drivers WHERE user_id = $1', [driverUserId]);
  if (!driverResult.rows.length) throw new Error('Driver profile not found');
  const driver = driverResult.rows[0];

  const db = getFirebaseDB();
  if (db) {
    await db.ref(`ride_responses/${rideId}/${driver.id}`).set('declined');
  }
  return { success: true };
}

async function cancelRide(rideId, userId) {
  const result = await query(
    `UPDATE rides SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1
     AND (rider_id = $2 OR driver_id = $2)
     AND status NOT IN ('completed','cancelled')
     RETURNING *`,
    [rideId, userId]
  );
  if (!result.rows.length) throw new Error('Ride not found or cannot be cancelled');

  const ride = result.rows[0];
  if (ride.driver_id) {
    await query('UPDATE drivers SET current_ride_id = NULL WHERE user_id = $1', [ride.driver_id]);
    socketService.notifyUser(ride.driver_id, 'ride:cancelled', { rideId });
  }
  socketService.notifyUser(ride.rider_id, 'ride:cancelled', { rideId });

  const db = getFirebaseDB();
  if (db) await db.ref(`rides/${rideId}/status`).set('cancelled');

  return ride;
}

async function markArrived(rideId, driverUserId) {
  const result = await query(
    `UPDATE rides SET status = 'arrived', arrived_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'accepted'
     RETURNING *`,
    [rideId, driverUserId]
  );
  if (!result.rows.length) throw new Error('Ride not in accepted state');
  const ride = result.rows[0];
  socketService.notifyUser(ride.rider_id, 'ride:driver_arrived', { rideId });
  socketService.broadcastToRide(rideId, 'ride:status_update', { status: 'arrived' });
  return ride;
}

async function startRide(rideId, driverUserId) {
  const result = await query(
    `UPDATE rides SET status = 'in_progress', started_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'arrived'
     RETURNING *`,
    [rideId, driverUserId]
  );
  if (!result.rows.length) throw new Error('Ride not in arrived state');
  const ride = result.rows[0];
  socketService.broadcastToRide(rideId, 'ride:status_update', { status: 'in_progress' });
  return ride;
}

async function completeRide(rideId, driverUserId, actualFare) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE rides SET status = 'completed', completed_at = NOW(), actual_fare = $1
       WHERE id = $2 AND driver_id = $3 AND status = 'in_progress'
       RETURNING *`,
      [actualFare, rideId, driverUserId]
    );
    if (!result.rows.length) throw new Error('Cannot complete ride');

    const ride = result.rows[0];

    await client.query(
      'UPDATE drivers SET current_ride_id = NULL WHERE user_id = $1',
      [driverUserId]
    );

    await client.query('COMMIT');

    socketService.notifyUser(ride.rider_id, 'ride:completed', { rideId, fare: actualFare });
    socketService.broadcastToRide(rideId, 'ride:status_update', { status: 'completed', fare: actualFare });

    const db = getFirebaseDB();
    if (db) {
      await db.ref(`rides/${rideId}`).update({ status: 'completed', actual_fare: actualFare });
    }

    return ride;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function triggerSOS(rideId, userId) {
  const rideResult = await query('SELECT * FROM rides WHERE id = $1', [rideId]);
  if (!rideResult.rows.length) throw new Error('Ride not found');
  const ride = rideResult.rows[0];

  // Log SOS in DB
  await query(
    `UPDATE rides SET metadata = COALESCE(metadata, '{}') || '{"sos_triggered": true}' WHERE id = $1`,
    [rideId]
  );

  // Notify both parties and admin room
  socketService.broadcastToRide(rideId, 'ride:sos', { rideId, triggeredBy: userId });
  socketService.broadcastToDrivers('admin:sos_alert', { rideId, triggeredBy: userId });

  return { sos: true, rideId };
}

async function updateRideStatus(rideId, status) {
  await query('UPDATE rides SET status = $1 WHERE id = $2', [status, rideId]);
  const db = getFirebaseDB();
  if (db) await db.ref(`rides/${rideId}/status`).set(status);
}

function notifyRider(riderId, event, data) {
  socketService.notifyUser(riderId, event, data);
}

module.exports = {
  requestRide,
  matchDriverToRide,
  acceptRide,
  declineRide,
  cancelRide,
  markArrived,
  startRide,
  completeRide,
  triggerSOS,
};

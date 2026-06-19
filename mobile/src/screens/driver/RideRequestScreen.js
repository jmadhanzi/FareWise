import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRideStore } from '../../store/rideStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import colors from '../../theme/colors';

const ACCEPT_WINDOW_SECONDS = 30;

export default function RideRequestScreen({ route, navigation }) {
  const { ride } = route.params;
  const { user } = useAuthStore();
  const [secondsLeft, setSecondsLeft] = useState(ACCEPT_WINDOW_SECONDS);
  const [responding, setResponding] = useState(false);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  // Pulsing ring animation
  useEffect(() => {
    Vibration.vibrate([0, 400, 200, 400, 200, 400]);

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleDecline(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      Vibration.cancel();
    };
  }, []);

  const handleAccept = async () => {
    if (responding) return;
    clearInterval(timerRef.current);
    Vibration.cancel();
    setResponding(true);
    try {
      await api.post(`/rides/${ride.id}/accept`);
      navigation.replace('ActiveRide', { rideId: ride.id });
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not accept ride');
      setResponding(false);
    }
  };

  const handleDecline = async (auto = false) => {
    if (responding) return;
    clearInterval(timerRef.current);
    Vibration.cancel();
    setResponding(true);
    try {
      await api.post(`/rides/${ride.id}/decline`);
    } catch (_) {
      // best effort
    }
    if (!auto) {
      navigation.goBack();
    } else {
      navigation.replace('DriverHome');
    }
  };

  const timerColor = secondsLeft <= 10 ? colors.error : secondsLeft <= 20 ? colors.warning : colors.success;

  const pickupCoords = {
    latitude: ride.pickup_lat,
    longitude: ride.pickup_lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map showing pickup → destination */}
      <MapView
        style={styles.map}
        initialRegion={pickupCoords}
        customMapStyle={darkMapStyle}
        showsUserLocation
      >
        <Marker coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }}>
          <View style={styles.pickupMarker}>
            <Text style={styles.markerText}>P</Text>
          </View>
        </Marker>
        {ride.destination_lat && (
          <Marker coordinate={{ latitude: ride.destination_lat, longitude: ride.destination_lng }}>
            <View style={styles.destMarker}>
              <Text style={styles.markerText}>D</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Overlay card */}
      <View style={styles.card}>
        {/* Timer ring */}
        <View style={styles.timerContainer}>
          <Animated.View
            style={[
              styles.timerRing,
              {
                borderColor: timerColor,
                transform: [{ scale: pulseAnim }],
                opacity: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              },
            ]}
          />
          <Text style={[styles.timerText, { color: timerColor }]}>{secondsLeft}</Text>
          <Text style={styles.timerLabel}>seconds</Text>
        </View>

        <Text style={styles.heading}>New Ride Request</Text>

        {/* Route info */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.routeText} numberOfLines={2}>{ride.pickup_address}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: colors.error }]} />
            <Text style={styles.routeText} numberOfLines={2}>{ride.destination_address}</Text>
          </View>
        </View>

        {/* Trip stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>${ride.estimated_fare?.toFixed(2) || '—'}</Text>
            <Text style={styles.statLabel}>Fare (yours)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{ride.estimated_distance_km?.toFixed(1) || '—'} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{ride.payment_method?.toUpperCase() || 'CASH'}</Text>
            <Text style={styles.statLabel}>Payment</Text>
          </View>
        </View>

        {/* Zero commission reminder */}
        <View style={styles.zeroBadge}>
          <Text style={styles.zeroBadgeText}>✓ 0% Commission — You keep 100% of this fare</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.declineBtn]}
            onPress={() => handleDecline(false)}
            disabled={responding}
          >
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn, responding && styles.btnDisabled]}
            onPress={handleAccept}
            disabled={responding}
          >
            <Text style={styles.acceptBtnText}>{responding ? 'Accepting...' : 'Accept'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#21262d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },

  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    marginTop: -20,
  },

  timerContainer: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    height: 72,
    justifyContent: 'center',
  },
  timerRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
  },
  timerText: { fontSize: 28, fontWeight: '800' },
  timerLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },

  routeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 4,
  },
  routeText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  zeroBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  zeroBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineBtnText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  acceptBtn: { backgroundColor: colors.primary },
  acceptBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  pickupMarker: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destMarker: {
    backgroundColor: colors.error,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

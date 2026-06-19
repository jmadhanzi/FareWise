import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Alert, AppState,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  connectSocket, onRideRequest, offRideRequest, emitDriverLocation,
} from '../../services/socketService';
import colors from '../../theme/colors';

const HARARE = { latitude: -17.8292, longitude: 31.0522, latitudeDelta: 0.08, longitudeDelta: 0.08 };

export default function DriverHomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [todayStats, setTodayStats] = useState({ earnings: 0, rides: 0, rating: 0 });
  const locationSub = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchSubStatus();
    fetchTodayStats();
    connectSocket();

    // Listen for incoming ride requests from Socket.IO
    onRideRequest((ride) => {
      navigation.navigate('RideRequest', { ride });
    });

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        fetchTodayStats();
      }
      appState.current = nextState;
    });

    return () => {
      offRideRequest();
      appStateSub.remove();
      stopLocationTracking();
    };
  }, []);

  const fetchSubStatus = async () => {
    try {
      const res = await api.get('/drivers/subscription-status');
      setSubStatus(res.data);
    } catch (_) {}
  };

  const fetchTodayStats = async () => {
    try {
      const res = await api.get('/drivers/earnings?period=today');
      setTodayStats({
        earnings: res.data.total_earnings || 0,
        rides: res.data.total_rides || 0,
        rating: res.data.average_rating || 0,
      });
    } catch (_) {}
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is needed to go online.');
      return;
    }
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });
        emitDriverLocation(latitude, longitude);
        api.put('/drivers/location', { lat: latitude, lng: longitude }).catch(() => {});
      }
    );
  };

  const stopLocationTracking = () => {
    locationSub.current?.remove();
    locationSub.current = null;
  };

  const handleToggleOnline = async (value) => {
    if (subStatus && !subStatus.has_active_subscription) {
      Alert.alert(
        'Subscription Required',
        'You need an active subscription to go online. Starting from just $20/month.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Subscribe', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }
    try {
      await api.put('/drivers/availability', { is_online: value });
      setIsOnline(value);
      if (value) startLocationTracking();
      else stopLocationTracking();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not update status');
    }
  };

  const mapRegion = location
    ? { ...location, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : HARARE;

  return (
    <SafeAreaView style={styles.container}>
      <MapView style={styles.map} region={mapRegion} customMapStyle={darkMapStyle} showsUserLocation={false}>
        {location && (
          <Marker coordinate={location}>
            <View style={[styles.driverMarker, { backgroundColor: isOnline ? colors.primary : colors.textMuted }]}>
              <Text style={styles.driverMarkerText}>🚗</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top status bar */}
      <View style={styles.topBar}>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineLabel, { color: isOnline ? colors.primary : colors.textMuted }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={isOnline ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      {/* Subscription warning */}
      {subStatus && !subStatus.has_active_subscription && (
        <TouchableOpacity
          style={styles.subWarning}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.subWarningText}>
            ⚠️ No active subscription — Tap to subscribe and start earning
          </Text>
        </TouchableOpacity>
      )}

      {/* Today stats */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${todayStats.earnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.rides}</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.rating > 0 ? todayStats.rating.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
        <View style={styles.zeroBadge}>
          <Text style={styles.zeroBadgeText}>✅ 0% Commission — Keep Every Dollar You Earn</Text>
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
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373f47' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  topBar: {
    position: 'absolute', top: 50, left: 16, right: 16,
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 8,
  },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onlineLabel: { fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  subWarning: {
    position: 'absolute', top: 120, left: 16, right: 16,
    backgroundColor: colors.warning + '20',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.warning + '40',
  },
  subWarningText: { color: colors.warning, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  statsCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderColor: colors.border,
  },
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  zeroBadge: {
    backgroundColor: colors.primary + '15',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  zeroBadgeText: { color: colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  driverMarker: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
  },
  driverMarkerText: { fontSize: 22 },
});

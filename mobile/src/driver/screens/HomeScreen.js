import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Switch, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import api from '../../services/api';

export default function DriverHomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const locationWatcher = useRef(null);

  useEffect(() => {
    initLocation();
    checkSubscription();
    return () => locationWatcher.current?.remove();
  }, []);

  const initLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Location access is needed to go online');
      setLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
    setLoading(false);
  };

  const checkSubscription = async () => {
    try {
      const { data } = await api.get('/drivers/subscription-status');
      setSubscription(data);
    } catch {}
  };

  const handleToggleOnline = async (value) => {
    if (!subscription?.active && value) {
      Alert.alert(
        'Subscription Required',
        'You need an active subscription to go online. Subscribe for just $20/month and keep 100% of every fare.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Subscribe Now', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }
    try {
      await api.put('/drivers/availability', {
        is_online: value,
        lat: location?.latitude,
        lng: location?.longitude
      });
      setIsOnline(value);
      if (value) startLocationTracking();
      else stopLocationTracking();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update status');
    }
  };

  const startLocationTracking = async () => {
    locationWatcher.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 4000, distanceInterval: 10 },
      async (loc) => {
        const coords = loc.coords;
        setLocation(coords);
        try {
          await api.put('/drivers/location', {
            lat: coords.latitude,
            lng: coords.longitude,
            heading: coords.heading,
            speed: coords.speed
          });
        } catch {}
      }
    );
  };

  const stopLocationTracking = () => {
    locationWatcher.current?.remove();
    locationWatcher.current = null;
  };

  if (loading) return <LoadingOverlay message="Getting location..." />;

  const region = {
    latitude: location?.latitude || -17.8252,
    longitude: location?.longitude || 31.0335,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04
  };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {location && (
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
            <View style={[styles.driverMarker, { backgroundColor: isOnline ? colors.primary : colors.textMuted }]}>
              <Text style={{ fontSize: 16 }}>🚗</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topCard}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.full_name?.split(' ')[0] || 'Driver'}!</Text>
            <Text style={styles.subtitle}>{isOnline ? 'You are online - accepting rides' : 'You are offline'}</Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={[styles.toggleLabel, { color: isOnline ? colors.primary : colors.textMuted }]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: colors.border, true: 'rgba(0,166,81,0.4)' }}
              thumbColor={isOnline ? colors.primary : colors.textMuted}
            />
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomCard}>
        {!subscription?.active ? (
          <TouchableOpacity
            style={styles.subscribeAlert}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.subscribeAlertText}>⚠️ No active subscription — Tap to subscribe for $20/month</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.subInfo}>
            <Text style={styles.subText}>✅ Active subscription • {subscription.days_remaining} days remaining</Text>
          </View>
        )}

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={styles.statValue}>$0.00</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🚗</Text>
            <Text style={styles.statLabel}>Rides Today</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statLabel}>Your Rating</Text>
            <Text style={styles.statValue}>5.0</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>🇿🇼 Zero commission. You keep 100% of every fare.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  topCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(13,17,23,0.95)', margin: 16, padding: 16, borderRadius: 16
  },
  greeting: { ...typography.h4, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  onlineToggle: { alignItems: 'center', gap: 4 },
  toggleLabel: { ...typography.caption, fontWeight: '700', letterSpacing: 1 },
  driverMarker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, gap: 16
  },
  subscribeAlert: {
    backgroundColor: 'rgba(245,166,35,0.15)', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.accent
  },
  subscribeAlertText: { ...typography.bodySmall, color: colors.accent, textAlign: 'center' },
  subInfo: { backgroundColor: 'rgba(0,166,81,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.primary },
  subText: { ...typography.bodySmall, color: colors.primary, textAlign: 'center', fontWeight: '600' },
  stats: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  statEmoji: { fontSize: 20 },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statValue: { ...typography.h4, color: colors.textPrimary },
  infoRow: { backgroundColor: 'rgba(0,166,81,0.08)', borderRadius: 10, padding: 12 },
  infoText: { ...typography.caption, color: colors.primary, textAlign: 'center', fontWeight: '600' }
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] }
];

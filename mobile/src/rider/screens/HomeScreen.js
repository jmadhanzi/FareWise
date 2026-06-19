import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { LoadingOverlay } from '../../components/LoadingOverlay';

export default function RiderHomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const { fetchNearbyDrivers, nearbyDrivers, activeRide } = useRideStore();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'FareWise needs your location to find nearby drivers.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      await fetchNearbyDrivers(loc.coords.latitude, loc.coords.longitude);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeRide && ['driver_assigned', 'driver_en_route', 'arrived', 'in_progress'].includes(activeRide.status)) {
      navigation.navigate('Tracking', { rideId: activeRide.id });
    }
  }, [activeRide]);

  if (loading) return <LoadingOverlay message="Finding your location..." />;

  const defaultRegion = {
    latitude: location?.latitude || -17.8252,
    longitude: location?.longitude || 31.0335,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={defaultRegion}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {nearbyDrivers.map(driver => (
          <Marker
            key={driver.id}
            coordinate={{ latitude: driver.current_lat, longitude: driver.current_lng }}
            title={driver.user?.full_name}
            description={`${driver.vehicle_make} ${driver.vehicle_model} - $${driver.minimum_fare} min`}
          >
            <Text style={{ fontSize: 24 }}>🚗</Text>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()}, {user?.full_name?.split(' ')[0] || 'Rider'}!</Text>
            <Text style={styles.subtitle}>{nearbyDrivers.length} drivers nearby</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ZW</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomCard}>
        <Text style={styles.whereToText}>Where are you going?</Text>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('BookRide', { userLocation: location })}
          activeOpacity={0.85}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>Search destination...</Text>
        </TouchableOpacity>
        <View style={styles.quickTips}>
          <View style={styles.tip}>
            <Text style={styles.tipEmoji}>💰</Text>
            <Text style={styles.tipText}>Drivers keep 100% - you pay less</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipEmoji}>⚡</Text>
            <Text style={styles.tipText}>Match in under 8 mins</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(13,17,23,0.9)', margin: 16, padding: 16, borderRadius: 16
  },
  greeting: { ...typography.h4, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center'
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 16
  },
  whereToText: { ...typography.h4, color: colors.textPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 14, padding: 16, gap: 12
  },
  searchIcon: { fontSize: 18 },
  searchText: { ...typography.body, color: colors.textMuted },
  quickTips: { flexDirection: 'row', gap: 12 },
  tip: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 6, backgroundColor: colors.card, borderRadius: 10, padding: 10
  },
  tipEmoji: { fontSize: 16 },
  tipText: { ...typography.caption, color: colors.textSecondary, flex: 1 }
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] }
];

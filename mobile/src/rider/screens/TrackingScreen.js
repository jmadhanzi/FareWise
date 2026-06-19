import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, SafeAreaView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useRideStore } from '../../store/rideStore';
import { Button } from '../../components/Button';

export default function TrackingScreen({ navigation, route }) {
  const { rideId } = route.params;
  const { refreshRide, triggerSOS } = useRideStore();
  const [ride, setRide] = useState(null);

  useEffect(() => {
    refreshRide(rideId).then(setRide);
    const poll = setInterval(async () => {
      const updated = await refreshRide(rideId);
      setRide(updated);
      if (updated.status === 'completed') {
        clearInterval(poll);
        navigation.replace('Rating', { rideId, driverId: updated.driver_id });
      } else if (updated.status === 'cancelled') {
        clearInterval(poll);
        Alert.alert('Ride Cancelled', 'Your ride has been cancelled.');
        navigation.navigate('RiderHome');
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [rideId]);

  const handleSOS = () => {
    Alert.alert(
      '🚨 Emergency SOS',
      'This will alert your emergency contact and log your location. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS', style: 'destructive',
          onPress: async () => {
            await triggerSOS(rideId);
            Alert.alert('SOS Sent', 'Your emergency contact has been notified.');
          }
        }
      ]
    );
  };

  const statusConfig = {
    driver_assigned: { emoji: '🚗', text: 'Driver is on the way', color: colors.info },
    driver_en_route: { emoji: '🚗', text: 'Driver heading to you', color: colors.info },
    arrived: { emoji: '🎉', text: 'Driver has arrived!', color: colors.accent },
    in_progress: { emoji: '🚀', text: 'Ride in progress', color: colors.primary }
  };
  const sc = statusConfig[ride?.status] || { emoji: '🚗', text: 'Loading...', color: colors.textSecondary };

  const driver = ride?.driver;
  const driverLoc = driver ? { latitude: driver.current_lat || -17.83, longitude: driver.current_lng || 31.03 } : null;

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={driverLoc ? { ...driverLoc, latitudeDelta: 0.02, longitudeDelta: 0.02 } : undefined}
        showsUserLocation
        customMapStyle={darkMapStyle}
      >
        {driverLoc && (
          <Marker coordinate={driverLoc}>
            <Text style={{ fontSize: 28 }}>🚗</Text>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.topBar}>
        <View style={styles.statusPill}>
          <Text style={{ fontSize: 16 }}>{sc.emoji}</Text>
          <Text style={[styles.statusText, { color: sc.color }]}>{sc.text}</Text>
        </View>
        <TouchableOpacity onPress={handleSOS} style={styles.sosBtn}>
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {driver && (
        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <Text style={styles.driverAvatar}>🚗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driver.user?.full_name || 'Your Driver'}</Text>
              <Text style={styles.driverVehicle}>
                {driver.vehicle_color} {driver.vehicle_make} {driver.vehicle_model}
              </Text>
              <View style={styles.plateChip}>
                <Text style={styles.plateText}>{driver.vehicle_plate}</Text>
              </View>
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingValue}>{driver.average_rating?.toFixed(1) || '5.0'}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${driver.user?.phone}`)}
            >
              <Text style={styles.callBtnText}>📞 Call Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() => Linking.openURL(`https://wa.me/${driver.user?.phone?.replace('+', '')}`)}
            >
              <Text style={styles.waBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {ride?.trip_share_token && (
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => Linking.openURL(`https://wa.me/?text=Track my FareWise ride: https://farewise.co.zw/track/${ride.trip_share_token}`)}
            >
              <Text style={styles.shareBtnText}>🔗 Share Trip with Emergency Contact</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(22,27,34,0.95)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10
  },
  statusText: { ...typography.bodySmall, fontWeight: '600' },
  sosBtn: {
    backgroundColor: colors.error, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10
  },
  sosBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  driverCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, gap: 16
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverAvatar: { fontSize: 40 },
  driverName: { ...typography.h4, color: colors.textPrimary },
  driverVehicle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  plateChip: {
    marginTop: 6, backgroundColor: colors.border,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start'
  },
  plateText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700', letterSpacing: 1 },
  ratingPill: { alignItems: 'center' },
  ratingStar: { color: colors.accent, fontSize: 20 },
  ratingValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  callBtn: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', paddingVertical: 14
  },
  callBtnText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  waBtn: {
    flex: 1, backgroundColor: '#128C7E',
    borderRadius: 12, alignItems: 'center', paddingVertical: 14
  },
  waBtnText: { ...typography.bodySmall, color: '#fff', fontWeight: '600' },
  shareBtn: {
    backgroundColor: 'rgba(0,166,81,0.1)', borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.primary
  },
  shareBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' }
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] }
];

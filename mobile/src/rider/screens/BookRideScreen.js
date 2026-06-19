import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useRideStore } from '../../store/rideStore';
import { LoadingOverlay } from '../../components/LoadingOverlay';

const HARARE_COORDS = { latitude: -17.8252, longitude: 31.0335 };

export default function BookRideScreen({ navigation, route }) {
  const { userLocation } = route.params || {};
  const { requestRide, nearbyDrivers } = useRideStore();

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ecocash');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const pickupCoords = {
    latitude: userLocation?.latitude || HARARE_COORDS.latitude,
    longitude: userLocation?.longitude || HARARE_COORDS.longitude
  };

  const calcFareEstimate = (distKm) => ({
    min: Math.max(3, distKm * 0.45).toFixed(2),
    max: Math.max(5, distKm * 0.75).toFixed(2)
  });

  const handleBookRide = async () => {
    if (!pickup.trim() || !destination.trim()) {
      Alert.alert('', 'Please enter pickup and destination');
      return;
    }
    setLoading(true);
    try {
      const rideData = {
        pickup_lat: pickupCoords.latitude,
        pickup_lng: pickupCoords.longitude,
        pickup_address: pickup || 'Current Location',
        destination_lat: HARARE_COORDS.latitude - 0.02,
        destination_lng: HARARE_COORDS.longitude + 0.02,
        destination_address: destination,
        payment_method: paymentMethod,
        requested_driver_id: selectedDriver?.id || undefined
      };
      const ride = await requestRide(rideData);
      navigation.replace('Matching', { rideId: ride.id });
    } catch (err) {
      Alert.alert('Booking Failed', err.response?.data?.error || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && <LoadingOverlay message="Booking your ride..." />}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Book a Ride</Text>
        <View style={{ width: 32 }} />
      </View>

      <MapView
        style={styles.map}
        region={{ ...pickupCoords, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        showsUserLocation
        customMapStyle={darkMapStyle}
      >
        {nearbyDrivers.slice(0, 5).map(d => (
          <Marker key={d.id} coordinate={{ latitude: d.current_lat, longitude: d.current_lng }}>
            <Text style={{ fontSize: 20 }}>🚗</Text>
          </Marker>
        ))}
      </MapView>

      <ScrollView style={styles.form} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Input
          label="Pickup Location"
          value={pickup}
          onChangeText={setPickup}
          placeholder="Enter pickup address or use current location"
          icon={<Text style={{ fontSize: 16 }}>📍</Text>}
        />
        <Input
          label="Destination"
          value={destination}
          onChangeText={setDestination}
          placeholder="Where are you going?"
          icon={<Text style={{ fontSize: 16 }}>🎯</Text>}
        />

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          {['ecocash', 'onemoney', 'cash'].map(method => (
            <TouchableOpacity
              key={method}
              style={[styles.payBtn, paymentMethod === method && styles.payBtnActive]}
              onPress={() => setPaymentMethod(method)}
            >
              <Text style={styles.payBtnEmoji}>
                {method === 'ecocash' ? '📱' : method === 'onemoney' ? '💳' : '💵'}
              </Text>
              <Text style={[styles.payBtnText, paymentMethod === method && { color: colors.primary }]}>
                {method === 'ecocash' ? 'EcoCash' : method === 'onemoney' ? 'OneMoney' : 'Cash'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {estimatedFare && (
          <View style={styles.fareCard}>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            <Text style={styles.fareRange}>${estimatedFare.min} - ${estimatedFare.max} USD</Text>
            <Text style={styles.fareNote}>Driver keeps 100% - no hidden fees</Text>
          </View>
        )}

        {nearbyDrivers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Request a Favourite Driver (optional)</Text>
            {nearbyDrivers.slice(0, 3).map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.driverCard, selectedDriver?.id === d.id && styles.driverCardSelected]}
                onPress={() => setSelectedDriver(selectedDriver?.id === d.id ? null : d)}
              >
                <Text style={styles.driverAvatar}>🚗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{d.user?.full_name || 'Driver'}</Text>
                  <Text style={styles.driverInfo}>{d.vehicle_make} {d.vehicle_model} • {d.vehicle_plate}</Text>
                </View>
                <View>
                  <Text style={styles.driverRating}>★ {d.average_rating?.toFixed(1) || 'New'}</Text>
                  <Text style={styles.driverDist}>{d.distance_km?.toFixed(1) || '--'}km away</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Button
          title="Confirm Booking"
          onPress={handleBookRide}
          loading={loading}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 16
  },
  back: { fontSize: 28, color: colors.textPrimary },
  title: { ...typography.h4, color: colors.textPrimary },
  map: { height: 180, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  form: { flex: 1, padding: 16 },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginTop: 8 },
  paymentRow: { flexDirection: 'row', gap: 10 },
  payBtn: {
    flex: 1, alignItems: 'center', padding: 12, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border
  },
  payBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,166,81,0.1)' },
  payBtnEmoji: { fontSize: 20, marginBottom: 4 },
  payBtnText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  fareCard: {
    backgroundColor: 'rgba(0,166,81,0.1)', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.primary, gap: 4
  },
  fareLabel: { ...typography.caption, color: colors.textSecondary },
  fareRange: { ...typography.h4, color: colors.primary },
  fareNote: { ...typography.caption, color: colors.textMuted },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: colors.border
  },
  driverCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0,166,81,0.08)' },
  driverAvatar: { fontSize: 28 },
  driverName: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  driverInfo: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  driverRating: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  driverDist: { ...typography.caption, color: colors.textMuted }
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] }
];

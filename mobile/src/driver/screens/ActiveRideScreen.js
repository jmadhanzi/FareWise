import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Button } from '../../components/Button';
import api from '../../services/api';

export default function ActiveRideScreen({ navigation, route }) {
  const { rideId } = route.params;
  const [ride, setRide] = useState(null);
  const [fareInput, setFareInput] = useState('');
  const [phase, setPhase] = useState('en_route');

  useEffect(() => {
    loadRide();
  }, []);

  const loadRide = async () => {
    const { data } = await api.get(`/rides/${rideId}`);
    setRide(data);
    if (data.final_fare) setFareInput(String(data.final_fare));
  };

  const handleArrived = async () => {
    await api.post(`/rides/${rideId}/arrived`);
    setPhase('arrived');
    Alert.alert('', 'Rider notified you have arrived!');
  };

  const handleStart = async () => {
    await api.post(`/rides/${rideId}/start`);
    setPhase('in_progress');
  };

  const handleComplete = async () => {
    if (!fareInput || parseFloat(fareInput) < 0.5) {
      Alert.alert('Enter Fare', 'Please enter the final fare amount');
      return;
    }
    Alert.alert(
      'Complete Ride',
      `Complete this ride for $${fareInput} USD?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await api.post(`/rides/${rideId}/complete`, { final_fare: parseFloat(fareInput) });
            Alert.alert('Ride Complete!', `You earned $${fareInput}. 100% yours!`, [
              { text: 'Great!', onPress: () => navigation.goBack() }
            ]);
          }
        }
      ]
    );
  };

  if (!ride) return null;

  const riderCoord = { latitude: ride.pickup_lat, longitude: ride.pickup_lng };
  const destCoord = { latitude: ride.destination_lat, longitude: ride.destination_lng };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={{ ...riderCoord, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        showsUserLocation
        customMapStyle={darkMapStyle}
      >
        <Marker coordinate={riderCoord} title="Pickup">
          <Text style={{ fontSize: 24 }}>📍</Text>
        </Marker>
        <Marker coordinate={destCoord} title="Destination">
          <Text style={{ fontSize: 24 }}>🎯</Text>
        </Marker>
      </MapView>

      <SafeAreaView style={styles.topBar}>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {phase === 'en_route' ? '🚗 Heading to pickup' : phase === 'arrived' ? '⏳ Waiting for rider' : '🚀 Ride in progress'}
          </Text>
        </View>
      </SafeAreaView>

      <View style={styles.bottomCard}>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>👤 {ride.rider?.full_name || 'Rider'}</Text>
          <Text style={styles.rideDetail}>📍 {ride.pickup_address}</Text>
          <Text style={styles.rideDetail}>🎯 {ride.destination_address}</Text>
          <Text style={styles.rideDistance}>{parseFloat(ride.distance_km || 0).toFixed(1)} km • ~{ride.estimated_duration_mins || '--'} mins</Text>
        </View>

        <View style={styles.fareSection}>
          <Text style={styles.fareLabel}>Your Fare (USD)</Text>
          <Text style={styles.fareEstimate}>${ride.estimated_fare_min || '--'} - ${ride.estimated_fare_max || '--'} estimated</Text>
        </View>

        {phase === 'en_route' && (
          <Button title="I Have Arrived" onPress={handleArrived} />
        )}
        {phase === 'arrived' && (
          <Button title="Start Ride" onPress={handleStart} />
        )}
        {phase === 'in_progress' && (
          <Button title={`Complete Ride ($${fareInput || '0.00'})`} onPress={handleComplete} variant="accent" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', padding: 16 },
  statusPill: { backgroundColor: 'rgba(22,27,34,0.95)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  statusText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, gap: 16
  },
  riderInfo: { gap: 6 },
  riderName: { ...typography.h4, color: colors.textPrimary },
  rideDetail: { ...typography.bodySmall, color: colors.textSecondary },
  rideDistance: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  fareSection: { backgroundColor: 'rgba(0,166,81,0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.primary },
  fareLabel: { ...typography.label, color: colors.textSecondary },
  fareEstimate: { ...typography.h4, color: colors.primary }
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] }
];

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useRideStore } from '../../store/rideStore';
import { Button } from '../../components/Button';

export default function MatchingScreen({ navigation, route }) {
  const { rideId } = route.params;
  const { refreshRide, cancelRide } = useRideStore();
  const [status, setStatus] = useState('matching');
  const [ride, setRide] = useState(null);
  const pulse = new Animated.Value(1);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true })
      ])
    ).start();

    const poll = setInterval(async () => {
      try {
        const updated = await refreshRide(rideId);
        setStatus(updated.status);
        setRide(updated);
        if (updated.status === 'driver_assigned' || updated.status === 'driver_en_route') {
          clearInterval(poll);
          navigation.replace('Tracking', { rideId });
        } else if (updated.status === 'no_driver_found') {
          clearInterval(poll);
        } else if (updated.status === 'cancelled') {
          clearInterval(poll);
        }
      } catch (err) {
        console.error('Poll error', err);
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [rideId]);

  const handleCancel = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Ride', style: 'destructive',
        onPress: async () => {
          await cancelRide(rideId, 'Rider cancelled while matching');
          navigation.navigate('RiderHome');
        }
      }
    ]);
  };

  if (status === 'no_driver_found') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>😢</Text>
        <Text style={styles.title}>No drivers found</Text>
        <Text style={styles.subtitle}>No drivers are available in your area right now. Try again in a few minutes.</Text>
        <Button title="Back to Home" onPress={() => navigation.navigate('RiderHome')} style={{ marginTop: 24, width: 240 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulse }] }]}>
        <Text style={styles.icon}>🚗</Text>
      </Animated.View>
      <Text style={styles.title}>Finding your driver...</Text>
      <Text style={styles.subtitle}>We are matching you with the nearest available driver in Harare</Text>

      {ride && (
        <View style={styles.rideInfo}>
          <Text style={styles.rideInfoText}>📍 {ride.pickup_address}</Text>
          <Text style={styles.rideInfoText}>🎯 {ride.destination_address}</Text>
        </View>
      )}

      <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  pulseCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,166,81,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primary
  },
  icon: { fontSize: 48 },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  rideInfo: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, width: '100%', gap: 8 },
  rideInfoText: { ...typography.bodySmall, color: colors.textPrimary },
  cancelBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24 },
  cancelText: { ...typography.body, color: colors.error }
});

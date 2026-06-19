import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function SplashScreen({ navigation }) {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true })
    ]).start();

    const timer = setTimeout(() => navigation.replace('RoleSelect'), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoArea, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>FW</Text>
        </View>
        <Text style={styles.appName}>FareWise</Text>
        <Text style={styles.tagline}>Fair Rides for Zimbabwe</Text>
      </Animated.View>
      <Animated.Text style={[styles.badge, { opacity }]}>
        🇿🇼 Zero Commission • 100% to Drivers
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  logoArea: { alignItems: 'center', gap: 12 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  appName: { ...typography.h1, color: colors.textPrimary, letterSpacing: 1 },
  tagline: { ...typography.body, color: colors.textSecondary },
  badge: {
    ...typography.caption,
    color: colors.textMuted,
    position: 'absolute',
    bottom: 48
  }
});

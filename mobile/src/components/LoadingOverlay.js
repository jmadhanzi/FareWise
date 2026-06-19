import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <View style={styles.card}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  card: {
    backgroundColor: '#1C2128',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    minWidth: 160
  },
  text: { ...typography.body, color: '#E6EDF3', textAlign: 'center' }
});

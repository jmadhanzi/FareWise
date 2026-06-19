import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>FW</Text>
        </View>
        <Text style={styles.title}>Welcome to FareWise</Text>
        <Text style={styles.subtitle}>Zimbabwe's fair ride platform</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, styles.riderCard]}
          onPress={() => navigation.navigate('Phone', { role: 'rider' })}
          activeOpacity={0.85}
        >
          <Text style={styles.cardEmoji}>👤</Text>
          <Text style={styles.cardTitle}>I need a ride</Text>
          <Text style={styles.cardDesc}>Book affordable rides from verified local drivers</Text>
          <Text style={styles.cardCta}>Get started →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.driverCard]}
          onPress={() => navigation.navigate('Phone', { role: 'driver' })}
          activeOpacity={0.85}
        >
          <Text style={styles.cardEmoji}>🚗</Text>
          <Text style={styles.cardTitle}>I am a driver</Text>
          <Text style={styles.cardDesc}>Keep 100% of every fare. Pay one flat monthly fee.</Text>
          <Text style={styles.cardCta}>Start earning →</Text>
          <View style={styles.zeroBadge}>
            <Text style={styles.zeroBadgeText}>ZERO COMMISSION</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>🇿🇼 Built in Zimbabwe, for Zimbabwe</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  header: { alignItems: 'center', marginTop: 32, marginBottom: 40, gap: 10 },
  logo: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8
  },
  logoText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  cards: { gap: 16, flex: 1 },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 28,
    gap: 8,
    maxHeight: 200,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden'
  },
  riderCard: { backgroundColor: colors.surface, borderColor: colors.border },
  driverCard: { backgroundColor: 'rgba(0, 166, 81, 0.12)', borderColor: colors.primary },
  cardEmoji: { fontSize: 36 },
  cardTitle: { ...typography.h4, color: colors.textPrimary },
  cardDesc: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  cardCta: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', marginTop: 4 },
  zeroBadge: {
    position: 'absolute',
    top: 16, right: 16,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  zeroBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: 16 }
});

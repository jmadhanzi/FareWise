import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import api from '../../services/api';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' }
];

export default function DriverEarningsScreen() {
  const [period, setPeriod] = useState('week');
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (p) => {
    setLoading(true);
    try {
      const { data } = await api.get('/drivers/earnings', { params: { period: p } });
      setEarnings(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(period); }, [period]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Earnings</Text>

      <View style={styles.periodTabs}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.tab, period === p.key && styles.tabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(period)} tintColor={colors.primary} />}
      >
        <View style={styles.bigEarnings}>
          <Text style={styles.earningsLabel}>Total Earned</Text>
          <Text style={styles.earningsAmount}>${earnings?.total_earnings_usd || '0.00'}</Text>
          <Text style={styles.earningsNote}>You keep 100% — zero commission</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🚗</Text>
            <Text style={styles.statValue}>{earnings?.total_rides || 0}</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🛯️</Text>
            <Text style={styles.statValue}>{earnings?.total_distance_km || '0.0'}</Text>
            <Text style={styles.statLabel}>Km Driven</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💸</Text>
            <Text style={styles.statValue}>
              ${earnings?.total_rides > 0 ? (parseFloat(earnings.total_earnings_usd) / earnings.total_rides).toFixed(2) : '0.00'}
            </Text>
            <Text style={styles.statLabel}>Avg/Ride</Text>
          </View>
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.compTitle}>FareWise vs Commission Apps</Text>
          <Text style={styles.compSubtitle}>If you earned ${earnings?.total_earnings_usd || '0.00'} this period:</Text>
          <View style={styles.compRow}>
            <Text style={styles.compLabel}>FareWise (you keep 100%)</Text>
            <Text style={[styles.compValue, { color: colors.primary }]}>${earnings?.total_earnings_usd || '0.00'}</Text>
          </View>
          <View style={styles.compRow}>
            <Text style={styles.compLabel}>Bolt (80% after 20% cut)</Text>
            <Text style={[styles.compValue, { color: colors.error }]}>
              ${((parseFloat(earnings?.total_earnings_usd || 0)) * 0.8).toFixed(2)}
            </Text>
          </View>
          <View style={styles.compRow}>
            <Text style={styles.compLabel}>InDrive (est. 85%)</Text>
            <Text style={[styles.compValue, { color: colors.warning }]}>
              ${((parseFloat(earnings?.total_earnings_usd || 0)) * 0.85).toFixed(2)}
            </Text>
          </View>
          <Text style={styles.compFooter}>💰 You saved vs Bolt: ${((parseFloat(earnings?.total_earnings_usd || 0)) * 0.20).toFixed(2)}</Text>
        </View>

        {(earnings?.rides || []).slice(0, 10).map(ride => (
          <View key={ride.id} style={styles.rideRow}>
            <View>
              <Text style={styles.rideDate}>{new Date(ride.completed_at).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short' })}</Text>
              <Text style={styles.rideDistance}>{parseFloat(ride.distance_km || 0).toFixed(1)} km</Text>
            </View>
            <Text style={styles.rideFare}>${parseFloat(ride.final_fare || 0).toFixed(2)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { ...typography.h3, color: colors.textPrimary, padding: 20, paddingBottom: 8 },
  periodTabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  bigEarnings: {
    backgroundColor: 'rgba(0,166,81,0.12)', borderRadius: 20,
    padding: 28, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary
  },
  earningsLabel: { ...typography.bodySmall, color: colors.textSecondary },
  earningsAmount: { fontSize: 52, fontWeight: '800', color: colors.primary },
  earningsNote: { ...typography.caption, color: colors.primary },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 6
  },
  statEmoji: { fontSize: 24 },
  statValue: { ...typography.h4, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  comparisonCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 10 },
  compTitle: { ...typography.h4, color: colors.textPrimary },
  compSubtitle: { ...typography.caption, color: colors.textSecondary },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compLabel: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  compValue: { ...typography.bodySmall, fontWeight: '700' },
  compFooter: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', marginTop: 4 },
  rideRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12, padding: 14
  },
  rideDate: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  rideDistance: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rideFare: { ...typography.h4, color: colors.primary }
});

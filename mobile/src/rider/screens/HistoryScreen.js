import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useRideStore } from '../../store/rideStore';

const STATUS_COLORS = {
  completed: colors.success, cancelled: colors.error,
  in_progress: colors.primary, no_driver_found: colors.warning
};

const STATUS_LABELS = {
  completed: 'Completed', cancelled: 'Cancelled',
  in_progress: 'In Progress', no_driver_found: 'No Driver Found'
};

export default function HistoryScreen() {
  const { fetchHistory, rideHistory } = useRideStore();
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    await fetchHistory();
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const renderRide = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.date}>{new Date(item.requested_at).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          <Text style={styles.time}>{new Date(item.requested_at).toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22', borderColor: STATUS_COLORS[item.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{STATUS_LABELS[item.status] || item.status}</Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <Text style={styles.routeDot}>●</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup_address}</Text>
        </View>
        <View style={[styles.routeLine]} />
        <View style={styles.routeRow}>
          <Text style={[styles.routeDot, { color: colors.error }]}>●</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.destination_address}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          {item.driver && (
            <Text style={styles.driverName}>🚗 {item.driver.user?.full_name || 'Driver'}</Text>
          )}
          {item.distance_km && (
            <Text style={styles.distance}>{parseFloat(item.distance_km).toFixed(1)} km</Text>
          )}
        </View>
        {item.final_fare && (
          <Text style={styles.fare}>${parseFloat(item.final_fare).toFixed(2)}</Text>
        )}
      </View>

      {item.rating?.[0] && (
        <View style={styles.ratingRow}>
          <Text style={styles.stars}>{'★'.repeat(item.rating[0].rating)}{'☆'.repeat(5 - item.rating[0].rating)}</Text>
          {item.rating[0].comment && (
            <Text style={styles.comment}>"{item.rating[0].comment}"</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Trip History</Text>
      <FlatList
        data={rideHistory}
        keyExtractor={item => item.id}
        renderItem={renderRide}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🚗</Text>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyBody}>Book your first FareWise ride!</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pageTitle: { ...typography.h3, color: colors.textPrimary, padding: 20, paddingBottom: 8 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  time: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { ...typography.caption, fontWeight: '700' },
  route: { gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { color: colors.primary, fontSize: 10 },
  routeText: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 },
  routeLine: { width: 1, height: 10, backgroundColor: colors.border, marginLeft: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  driverName: { ...typography.caption, color: colors.textSecondary },
  distance: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  fare: { ...typography.h4, color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stars: { color: colors.accent, fontSize: 14 },
  comment: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  emptyBody: { ...typography.body, color: colors.textSecondary }
});

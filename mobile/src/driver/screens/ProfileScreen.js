import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function DriverProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const [driver, setDriver] = useState(null);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [baseFare, setBaseFare] = useState('');
  const [perKm, setPerKm] = useState('');
  const [minFare, setMinFare] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/drivers/profile').then(r => {
      setDriver(r.data);
      setBaseFare(String(r.data.base_fare || 2));
      setPerKm(String(r.data.per_km_rate || 0.5));
      setMinFare(String(r.data.minimum_fare || 3));
      setFullName(r.data.user?.full_name || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/drivers/profile', {
        full_name: fullName,
        base_fare: parseFloat(baseFare),
        per_km_rate: parseFloat(perKm),
        minimum_fare: parseFloat(minFare)
      });
      await updateUser({ full_name: fullName });
      Alert.alert('Saved', 'Profile and pricing updated');
    } catch {
      Alert.alert('Error', 'Failed to save');
    }
    setSaving(false);
  };

  const approvalColors = { approved: colors.success, pending: colors.warning, rejected: colors.error, suspended: colors.error };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.full_name || 'D')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.phone}>{user?.phone}</Text>
          {driver && (
            <View style={[styles.approvalBadge, { backgroundColor: approvalColors[driver.approval_status] + '22', borderColor: approvalColors[driver.approval_status] }]}>
              <Text style={[styles.approvalText, { color: approvalColors[driver.approval_status] }]}>
                {driver.approval_status?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {driver && (
          <View style={styles.vehicleCard}>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <Text style={styles.vehicleInfo}>{driver.vehicle_color} {driver.vehicle_make} {driver.vehicle_model} ({driver.vehicle_year})</Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{driver.vehicle_plate}</Text>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driver?.total_rides || 0}</Text>
            <Text style={styles.statLabel}>Total Rides</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${parseFloat(driver?.total_earnings || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>★ {parseFloat(driver?.average_rating || 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Pricing</Text>
          <Text style={styles.pricingNote}>You set your own fares. No platform interference.</Text>
          <Input label="Base Fare (USD)" value={baseFare} onChangeText={setBaseFare} keyboardType="decimal-pad" hint="Charged at ride start" />
          <Input label="Per Km Rate (USD)" value={perKm} onChangeText={setPerKm} keyboardType="decimal-pad" />
          <Input label="Minimum Fare (USD)" value={minFare} onChangeText={setMinFare} keyboardType="decimal-pad" />
          <Button title="Save Profile & Pricing" onPress={handleSave} loading={saving} />
        </View>

        <Button title="Log Out" variant="secondary" onPress={() => { Alert.alert('Log Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: logout }]); }} textStyle={{ color: colors.error }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  phone: { ...typography.h4, color: colors.textPrimary },
  approvalBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  approvalText: { ...typography.caption, fontWeight: '800', letterSpacing: 0.5 },
  vehicleCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 8 },
  vehicleInfo: { ...typography.body, color: colors.textPrimary },
  plateBadge: { backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  plateText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '800', letterSpacing: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { ...typography.h4, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  section: { gap: 12 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary },
  pricingNote: { ...typography.bodySmall, color: colors.textSecondary }
});

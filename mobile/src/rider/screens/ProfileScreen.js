import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function RiderProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergency_contact || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp_number || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/riders/profile', {
        full_name: fullName,
        emergency_contact: emergencyContact,
        whatsapp_number: whatsapp
      });
      await updateUser(data);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.full_name || 'R')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.phone}>{user?.phone}</Text>
          <View style={styles.riderbadge}>
            <Text style={styles.riderbadgeText}>🚗 FareWise Rider</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            autoCapitalize="words"
          />
          <Input
            label="Emergency Contact"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            placeholder="+263 77 XXX XXXX"
            keyboardType="phone-pad"
            hint="This number will be alerted if you press SOS during a ride"
          />
          <Input
            label="WhatsApp Number"
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="+263 77 XXX XXXX"
            keyboardType="phone-pad"
          />
          <Button title="Save Changes" onPress={handleSave} loading={saving} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About FareWise</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoItem}>💰 Drivers keep 100% of every fare</Text>
            <Text style={styles.infoItem}>✔️ All drivers are verified by our team</Text>
            <Text style={styles.infoItem}>🇿🇼 Built in Zimbabwe, for Zimbabwe</Text>
            <Text style={styles.infoItem}>📞 Support: +263 77 000 0001</Text>
          </View>
        </View>

        <Button
          title="Log Out"
          variant="secondary"
          onPress={handleLogout}
          style={{ marginTop: 8 }}
          textStyle={{ color: colors.error }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, gap: 24, paddingBottom: 48 },
  avatarSection: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  phone: { ...typography.h4, color: colors.textPrimary },
  riderbadge: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  riderbadgeText: { ...typography.bodySmall, color: colors.textSecondary },
  section: { gap: 12 },
  sectionTitle: { ...typography.h4, color: colors.textPrimary },
  infoCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 10 },
  infoItem: { ...typography.body, color: colors.textSecondary, lineHeight: 24 }
});

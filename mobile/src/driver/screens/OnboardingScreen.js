import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function DriverOnboardingScreen({ navigation }) {
  const { updateUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vehicle_color: '',
    license_number: '',
    national_id_number: ''
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.vehicle_make || !form.vehicle_plate || !form.license_number) {
      Alert.alert('Required', 'Vehicle make, plate, and license number are required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/drivers/onboard', {
        ...form,
        vehicle_year: parseInt(form.vehicle_year) || new Date().getFullYear()
      });
      await updateUser({ role: 'driver' });
      Alert.alert(
        'Application Submitted!',
        'We will review your documents and notify you within 24 hours. Meanwhile you can explore the driver app.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Submission failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>Step {step} of 2</Text>
        <Text style={styles.title}>Driver Onboarding</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: step === 1 ? '50%' : '100%' }]} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 12, padding: 24, paddingBottom: 40 }}>
        {step === 1 ? (
          <>
            <Text style={styles.sectionLabel}>Vehicle Details</Text>
            <Input label="Vehicle Make" value={form.vehicle_make} onChangeText={v => update('vehicle_make', v)} placeholder="e.g. Toyota" autoCapitalize="words" />
            <Input label="Vehicle Model" value={form.vehicle_model} onChangeText={v => update('vehicle_model', v)} placeholder="e.g. Corolla" autoCapitalize="words" />
            <Input label="Year" value={form.vehicle_year} onChangeText={v => update('vehicle_year', v)} placeholder="e.g. 2019" keyboardType="number-pad" maxLength={4} />
            <Input label="Number Plate" value={form.vehicle_plate} onChangeText={v => update('vehicle_plate', v.toUpperCase())} placeholder="e.g. ABB1234" autoCapitalize="characters" />
            <Input label="Vehicle Colour" value={form.vehicle_color} onChangeText={v => update('vehicle_color', v)} placeholder="e.g. Silver" autoCapitalize="words" />
            <Button title="Next: Documents" onPress={() => setStep(2)} style={{ marginTop: 8 }} />
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Your Documents</Text>
            <Input label="Driver Licence Number" value={form.license_number} onChangeText={v => update('license_number', v)} placeholder="Licence number" autoCapitalize="characters" />
            <Input label="National ID Number" value={form.national_id_number} onChangeText={v => update('national_id_number', v)} placeholder="National ID number" autoCapitalize="characters" />

            <View style={styles.noteCard}>
              <Text style={styles.noteText}>📋 You will need to upload photos of your licence, ID, and vehicle registration. Our team will review within 24 hours.</Text>
            </View>

            <View style={styles.row}>
              <Button title="Back" variant="secondary" onPress={() => setStep(1)} style={{ flex: 1 }} />
              <Button title="Submit Application" onPress={handleSubmit} loading={loading} style={{ flex: 2 }} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 24, paddingBottom: 0, gap: 8 },
  step: { ...typography.caption, color: colors.textSecondary },
  title: { ...typography.h3, color: colors.textPrimary },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  progress: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  scroll: { flex: 1 },
  sectionLabel: { ...typography.h4, color: colors.textPrimary, marginBottom: 4 },
  noteCard: { backgroundColor: 'rgba(88,166,255,0.1)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.info },
  noteText: { ...typography.body, color: colors.info, lineHeight: 24 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 }
});

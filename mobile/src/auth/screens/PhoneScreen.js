import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import api from '../../services/api';

export default function PhoneScreen({ navigation, route }) {
  const { role } = route.params;
  const [phone, setPhone] = useState('+263');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    const cleaned = phone.trim();
    if (cleaned.length < 10) {
      setError('Enter a valid Zimbabwe phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: cleaned });
      navigation.navigate('OTP', { phone: cleaned, role });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{role === 'driver' ? '🚗' : '👤'}</Text>
        </View>
        <Text style={styles.title}>
          {role === 'driver' ? 'Driver Login' : 'Rider Login'}
        </Text>
        <Text style={styles.subtitle}>
          Enter your Zimbabwe mobile number. We'll send a verification code.
        </Text>

        <Input
          label="Mobile Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+263 77 123 4567"
          keyboardType="phone-pad"
          error={error}
          hint="EcoCash, NetOne, Telecel numbers accepted"
        />

        <Button
          title="Send Verification Code"
          onPress={handleSendOTP}
          loading={loading}
          style={styles.button}
        />

        <Text style={styles.legal}>
          By continuing, you agree to FareWise's Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  back: { paddingVertical: 8 },
  backText: { ...typography.body, color: colors.primary },
  content: { flex: 1, justifyContent: 'center', gap: 16 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 8
  },
  icon: { fontSize: 36 },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  button: { marginTop: 8 },
  legal: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }
});

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { OTPInput } from '../../components/OTPInput';
import { Button } from '../../components/Button';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function OTPScreen({ navigation, route }) {
  const { phone, role } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { setAuth } = useAuthStore();

  const handleVerify = async () => {
    if (otp.length < 6) { Alert.alert('', 'Enter the 6-digit code sent to your phone'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp, role });
      await setAuth(data.token, data.user);
      if (data.is_new_user && role === 'driver') {
        navigation.navigate('DriverOnboarding');
      }
      // RootNavigator handles navigation based on role
    } catch (err) {
      Alert.alert('Invalid Code', err.response?.data?.error || 'Incorrect or expired OTP. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/send-otp', { phone });
      Alert.alert('Code Sent', `New verification code sent to ${phone}`);
    } catch {
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && <LoadingOverlay message="Verifying..." />}

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to{`\n`}<Text style={{ color: colors.primary }}>{phone}</Text></Text>

        <View style={styles.otpWrapper}>
          <OTPInput length={6} value={otp} onChange={setOtp} />
        </View>

        <Button
          title="Verify & Continue"
          onPress={handleVerify}
          disabled={otp.length < 6}
          style={styles.button}
        />

        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text style={styles.resend}>
            {resending ? 'Sending...' : "Didn't receive it? Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  back: { paddingVertical: 8 },
  backText: { ...typography.body, color: colors.primary },
  content: { flex: 1, justifyContent: 'center', gap: 20, alignItems: 'center' },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
  otpWrapper: { marginVertical: 16 },
  button: { width: '100%' },
  resend: { ...typography.bodySmall, color: colors.primary, textDecorationLine: 'underline' }
});

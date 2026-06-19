import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const PAYMENT_METHODS = [
  { key: 'ecocash', label: 'EcoCash', emoji: '📱' },
  { key: 'onemoney', label: 'OneMoney', emoji: '💳' },
  { key: 'zimswitch', label: 'ZimSwitch', emoji: '💴' },
  { key: 'visa', label: 'Visa/MC', emoji: '💳' }
];

export default function DriverSubscriptionScreen() {
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('ecocash');
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/subscriptions/plans').then(r => setPlans(r.data)).catch(() => {});
    api.get('/drivers/subscription-status').then(r => setCurrentSub(r.data)).catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/subscriptions/subscribe', {
        plan_type: selectedPlan,
        payment_method: paymentMethod,
        phone: user?.phone
      });
      if (data.redirect_url) {
        Alert.alert(
          'Payment Initiated',
          `Complete your ${paymentMethod === 'ecocash' ? 'EcoCash' : 'OneMoney'} payment to activate your subscription.\n\nReference: ${data.reference}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', 'Subscription activated!');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Subscription failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 40 }}>
        <Text style={styles.title}>Subscription Plans</Text>
        <Text style={styles.subtitle}>Pay once. Keep 100% of every fare you earn.</Text>

        {currentSub?.active && (
          <View style={styles.activeSubCard}>
            <Text style={styles.activeSubEmoji}>✅</Text>
            <View>
              <Text style={styles.activeSubTitle}>Active Subscription</Text>
              <Text style={styles.activeSubDetails}>{currentSub.subscription?.plan_type} plan • {currentSub.days_remaining} days remaining</Text>
            </View>
          </View>
        )}

        {plans.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, selectedPlan === plan.id && styles.planCardSelected]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            {plan.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>MOST POPULAR</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.planPrice}>
                <Text style={styles.planAmount}>${plan.price_usd}</Text>
                <Text style={styles.planPeriod}>/month</Text>
              </View>
            </View>
            {plan.features.map((f, i) => (
              <Text key={i} style={styles.planFeature}>✓ {f}</Text>
            ))}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.paymentGrid}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.payBtn, paymentMethod === m.key && styles.payBtnActive]}
              onPress={() => setPaymentMethod(m.key)}
            >
              <Text style={styles.payEmoji}>{m.emoji}</Text>
              <Text style={[styles.payLabel, paymentMethod === m.key && { color: colors.primary }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>💰 At just ${plans.find(p => p.id === selectedPlan)?.price_usd || 20}/month, you only need 4 rides to break even. Every ride after that is pure profit.</Text>
        </View>

        <Button
          title={currentSub?.active ? 'Renew Subscription' : 'Subscribe Now'}
          onPress={handleSubscribe}
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  activeSubCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(0,166,81,0.12)', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: colors.primary
  },
  activeSubEmoji: { fontSize: 28 },
  activeSubTitle: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  activeSubDetails: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  planCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 20, gap: 10, borderWidth: 1.5, borderColor: colors.border, position: 'relative'
  },
  planCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0,166,81,0.08)' },
  recommendedBadge: {
    position: 'absolute', top: -1, right: 16,
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4
  },
  recommendedText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { ...typography.h4, color: colors.textPrimary },
  planPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planAmount: { fontSize: 32, fontWeight: '800', color: colors.primary },
  planPeriod: { ...typography.bodySmall, color: colors.textSecondary },
  planFeature: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },
  sectionLabel: { ...typography.label, color: colors.textSecondary },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  payBtn: {
    flex: 1, minWidth: '45%', alignItems: 'center', padding: 14,
    borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, gap: 6
  },
  payBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,166,81,0.1)' },
  payEmoji: { fontSize: 24 },
  payLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  noteCard: { backgroundColor: 'rgba(88,166,255,0.08)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.info },
  noteText: { ...typography.body, color: colors.info, lineHeight: 24 }
});

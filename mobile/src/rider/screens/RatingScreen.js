import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, TextInput } from 'react-native';
import { RatingStars } from '../../components/RatingStars';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useRideStore } from '../../store/rideStore';

export default function RatingScreen({ navigation, route }) {
  const { rideId } = route.params;
  const { rateRide, activeRide } = useRideStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('', 'Please rate your driver'); return; }
    setLoading(true);
    try {
      await rateRide(rideId, rating, comment);
      setSubmitted(true);
    } catch {
      Alert.alert('', 'Rating already submitted or error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Thanks for your feedback!</Text>
          <Text style={styles.successBody}>Your rating helps drivers and the FareWise community.</Text>
          <Button
            title="Back to Home"
            onPress={() => navigation.navigate('RiderHome')}
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.title}>Rate your ride</Text>
        <Text style={styles.subtitle}>How was your experience with your driver?</Text>

        <RatingStars rating={rating} onRate={setRating} size={44} />
        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'Tap to rate' : ['', 'Poor', 'Below average', 'Good', 'Great', 'Excellent!'][rating]}
        </Text>

        <TextInput
          style={styles.commentBox}
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment (optional)..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          maxLength={300}
        />

        <Button
          title="Submit Rating"
          onPress={handleSubmit}
          loading={loading}
          disabled={rating === 0}
          style={{ marginTop: 8 }}
        />
        <Button
          title="Skip"
          variant="ghost"
          onPress={() => navigation.navigate('RiderHome')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.surface, borderRadius: 24,
    padding: 32, alignItems: 'center', gap: 16, width: '100%'
  },
  emoji: { fontSize: 48 },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  ratingLabel: { ...typography.bodySmall, color: colors.accent, fontWeight: '600', minHeight: 20 },
  commentBox: {
    width: '100%', backgroundColor: colors.surfaceLight,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    padding: 14, color: colors.textPrimary, ...typography.body,
    textAlignVertical: 'top', minHeight: 80
  },
  successCard: { alignItems: 'center', gap: 16, padding: 32 },
  successEmoji: { fontSize: 64 },
  successTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  successBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' }
});

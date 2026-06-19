import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const RatingStars = ({ rating = 0, onRate, size = 32, readonly = false }) => {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate?.(star)}
          disabled={readonly}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.star,
            { fontSize: size },
            star <= rating ? styles.filled : styles.empty
          ]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4 },
  star: { lineHeight: undefined },
  filled: { color: colors.accent },
  empty: { color: colors.border }
});

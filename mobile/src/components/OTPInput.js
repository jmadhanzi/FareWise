import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const OTPInput = ({ length = 6, value = '', onChange }) => {
  const inputs = useRef([]);
  const vals = (value + ' '.repeat(length)).slice(0, length).split('');

  const handleChange = (text, index) => {
    const newVals = [...vals];
    newVals[index] = text.slice(-1);
    const newValue = newVals.join('').trimEnd();
    onChange(newValue);
    if (text && index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !vals[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={ref => inputs.current[i] = ref}
          style={[
            styles.box,
            vals[i]?.trim() && styles.filled
          ]}
          value={vals[i]?.trim() || ''}
          onChangeText={t => handleChange(t, i)}
          onKeyPress={e => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          selectionColor={colors.primary}
          caretHidden
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: {
    width: 50,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#30363D',
    backgroundColor: '#161B22',
    fontSize: 24,
    fontWeight: '700',
    color: '#E6EDF3'
  },
  filled: { borderColor: '#00A651', backgroundColor: 'rgba(0, 166, 81, 0.1)' }
});

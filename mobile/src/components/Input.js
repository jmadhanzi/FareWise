import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export const Input = ({
  label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType = 'default', maxLength, editable = true,
  error, hint, icon, style, inputStyle, autoCapitalize = 'none'
}) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        focused && styles.focused,
        error && styles.error,
        !editable && styles.disabled
      ]}>
        {icon && <View style={styles.iconLeft}>{icon}</View>}
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden(!hidden)} style={styles.iconRight}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{hidden ? 'SHOW' : 'HIDE'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    minHeight: 52
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 14
  },
  focused: { borderColor: colors.primary },
  error: { borderColor: colors.error },
  disabled: { opacity: 0.6 },
  iconLeft: { marginRight: 12 },
  iconRight: { marginLeft: 12, padding: 4 },
  errorText: { ...typography.caption, color: colors.error, marginTop: 6 },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 6 }
});

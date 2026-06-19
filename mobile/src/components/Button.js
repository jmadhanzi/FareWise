import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, gradients } from '../theme/colors';
import { typography } from '../theme/typography';

export const Button = ({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, style, textStyle
}) => {
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: { bg: colors.primary, text: '#fff', border: 'transparent' },
    secondary: { bg: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.textPrimary, border: 'transparent' },
    danger: { bg: colors.error, text: '#fff', border: 'transparent' },
    accent: { bg: colors.accent, text: colors.textInverse, border: 'transparent' }
  };

  const sizeStyles = {
    sm: { height: 40, paddingHorizontal: 16, fontSize: 14 },
    md: { height: 52, paddingHorizontal: 24, fontSize: 16 },
    lg: { height: 60, paddingHorizontal: 32, fontSize: 18 }
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        { height: s.height, paddingHorizontal: s.paddingHorizontal, backgroundColor: v.bg, borderColor: v.border, borderWidth: variant === 'secondary' ? 1.5 : 0 },
        isDisabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[typography.button, { color: v.text, fontSize: s.fontSize }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrapper: { marginRight: 4 },
  disabled: { opacity: 0.45 }
});

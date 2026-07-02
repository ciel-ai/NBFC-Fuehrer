import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { BorderRadius, Spacing } from '@/src/core/theme/spacing';

type BadgeVariant = 'comingSoon' | 'success' | 'error' | 'info' | 'warning';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'comingSoon', style }: BadgeProps) {
  return (
    <View style={[styles.base, variantStyles[variant], style]}>
      <Text style={[styles.text, textStyles[variant]]}>{label}</Text>
    </View>
  );
}

const variantStyles = StyleSheet.create({
  comingSoon: {
    backgroundColor: Colors.comingSoonBg,
    borderWidth: 1,
    borderColor: Colors.comingSoonBorder,
  },
  success: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: `${Colors.success}33`,
  },
  error: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: `${Colors.error}33`,
  },
  info: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: `${Colors.primary}33`,
  },
  warning: {
    backgroundColor: Colors.goldLight,
    borderWidth: 1,
    borderColor: `${Colors.gold}33`,
  },
});

const textStyles: Record<BadgeVariant, { color: string }> = {
  comingSoon: { color: Colors.comingSoonText },
  success: { color: Colors.success },
  error: { color: Colors.error },
  info: { color: Colors.primary },
  warning: { color: Colors.goldDark },
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.tiny,
    fontWeight: '600',
  },
});

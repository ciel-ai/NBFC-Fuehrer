import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';

interface ReviewDetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  divider?: boolean;
}

export function ReviewDetailRow({
  label,
  value,
  valueColor = Colors.textPrimary,
  divider = true,
}: ReviewDetailRowProps) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.md,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    ...Typography.body,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  value: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    textAlign: 'right',
    flexShrink: 1,
  },
});

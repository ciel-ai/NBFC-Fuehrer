import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

export type StatusTone =
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'review'
  | 'notStarted';

const TONE_MAP: Record<
  StatusTone,
  { bg: string; fg: string; border: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  approved: {
    bg: Colors.successLight,
    fg: Colors.success,
    border: `${Colors.success}33`,
    icon: 'checkmark-circle',
  },
  rejected: {
    bg: Colors.errorLight,
    fg: Colors.error,
    border: `${Colors.error}33`,
    icon: 'close-circle',
  },
  pending: {
    bg: Colors.goldLight,
    fg: Colors.goldDark,
    border: `${Colors.gold}33`,
    icon: 'time',
  },
  review: {
    bg: Colors.primaryLight,
    fg: Colors.primary,
    border: `${Colors.primary}33`,
    icon: 'eye',
  },
  notStarted: {
    bg: Colors.backgroundLight,
    fg: Colors.textSecondary,
    border: Colors.border,
    icon: 'ellipse-outline',
  },
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  showIcon?: boolean;
  style?: ViewStyle;
}

export function StatusBadge({ label, tone, showIcon = true, style }: StatusBadgeProps) {
  const t = TONE_MAP[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: t.bg, borderColor: t.border },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons name={t.icon} size={scale(12)} color={t.fg} />
      )}
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    letterSpacing: 0.2,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import type { IoniconName } from '@/src/features/sales/config/types';

interface DashboardTileProps {
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
  count?: number;
  loading?: boolean;
  onPress: () => void;
}

export function DashboardTile({
  label,
  icon,
  color,
  bg,
  count,
  loading = false,
  onPress,
}: DashboardTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${label}${count != null ? `, ${count}` : ''}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={scale(20)} color={color} />
      </View>
      <Text style={styles.count}>{loading ? '—' : (count ?? 0)}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: scale(112),
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    justifyContent: 'space-between',
    ...Shadow.small,
  },
  iconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  count: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

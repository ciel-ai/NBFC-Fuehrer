import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

type AccentTone = 'primary' | 'gold' | 'success' | 'error';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  count: number | string;
  label: string;
  tone?: AccentTone;
  onPress?: () => void;
}

const TONE_MAP: Record<AccentTone, { fg: string; bg: string }> = {
  primary: { fg: Colors.primary, bg: Colors.primaryLight },
  gold: { fg: Colors.goldDark, bg: Colors.goldLight },
  success: { fg: Colors.success, bg: Colors.successLight },
  error: { fg: Colors.error, bg: Colors.errorLight },
};

export function StatCard({ icon, count, label, tone = 'primary', onPress }: StatCardProps) {
  const { fg, bg } = TONE_MAP[tone];
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
      onPress={onPress}
      android_ripple={onPress ? { color: `${fg}15` } : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}, ${count}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={scale(20)} color={fg} />
      </View>
      <Text style={[styles.count, { color: fg }]}>{count}</Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: scale(120),
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  count: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});

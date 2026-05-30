import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface QuickAccessRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  count?: number | string;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
}

export function QuickAccessRow({
  icon,
  title,
  subtitle,
  count,
  iconColor = Colors.primary,
  iconBg = Colors.primaryLight,
  onPress,
}: QuickAccessRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      onPress={onPress}
      android_ripple={{ color: `${iconColor}15` }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={scale(20)} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      {count !== undefined ? (
        <View style={[styles.countBubble, { backgroundColor: iconBg }]}>
          <Text style={[styles.countText, { color: iconColor }]}>{count}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    minHeight: scale(60),
  },
  pressed: {
    backgroundColor: Colors.backgroundLight,
  },
  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  countBubble: {
    minWidth: scale(28),
    height: scale(24),
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
});

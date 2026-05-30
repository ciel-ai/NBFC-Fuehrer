import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

type BannerTone = 'info' | 'warning' | 'error' | 'success';

const TONE_MAP: Record<
  BannerTone,
  { bg: string; fg: string; border: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  info: {
    bg: Colors.primaryLight,
    fg: Colors.primary,
    border: `${Colors.primary}33`,
    icon: 'information-circle',
  },
  warning: {
    bg: Colors.goldLight,
    fg: Colors.goldDark,
    border: `${Colors.gold}33`,
    icon: 'warning',
  },
  error: {
    bg: Colors.errorLight,
    fg: Colors.error,
    border: `${Colors.error}33`,
    icon: 'alert-circle',
  },
  success: {
    bg: Colors.successLight,
    fg: Colors.success,
    border: `${Colors.success}33`,
    icon: 'checkmark-circle',
  },
};

interface InfoBannerProps {
  title?: string;
  message: string;
  tone?: BannerTone;
}

export function InfoBanner({ title, message, tone = 'info' }: InfoBannerProps) {
  const t = TONE_MAP[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Ionicons name={t.icon} size={scale(18)} color={t.fg} style={styles.icon} />
      <View style={styles.text}>
        {title ? (
          <Text style={[styles.title, { color: t.fg }]}>{title}</Text>
        ) : null}
        <Text style={[styles.message, { color: t.fg }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * 1.5,
  },
});

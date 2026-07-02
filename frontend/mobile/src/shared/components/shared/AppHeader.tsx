import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { safeBack } from '@/src/core/utils/navigation';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

type Role = 'customer' | 'agent';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightComponent?: React.ReactNode;
  role?: Role;
  variant?: 'solid' | 'plain';
}

const ANDROID_STATUS_PAD = Platform.OS === 'android'
  ? (StatusBar.currentHeight ?? 24)
  : 0;

export function AppHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  rightComponent,
  variant = 'solid',
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const handleBack = () => {
    if (onBack) onBack();
    else safeBack();
  };

  const isSolid = variant === 'solid';
  const bg = isSolid ? Colors.primary : Colors.background;
  const fg = isSolid ? Colors.textWhite : Colors.primary;
  const sublabelColor = isSolid ? 'rgba(255,255,255,0.85)' : Colors.textSecondary;

  const topPad = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_PAD;

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: topPad + Spacing.xs }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            android_ripple={{
              color: isSolid ? 'rgba(255,255,255,0.18)' : `${Colors.primary}20`,
              borderless: true,
              radius: 22,
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={scale(22)} color={fg} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.titleWrap}>
          {title ? (
            <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.subtitle, { color: sublabelColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          {rightComponent ?? <View style={styles.placeholder} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: scale(52) + ANDROID_STATUS_PAD,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: scale(44),
  },
  iconButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(20),
  },
  placeholder: {
    width: scale(40),
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  right: {
    width: scale(40),
    alignItems: 'flex-end',
  },
});

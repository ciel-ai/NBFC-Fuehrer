import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, StatusBar } from 'react-native';
import { safeBack } from '@/src/core/utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightComponent?: React.ReactNode;
  titleColor?: string;
}

const ANDROID_TOP_PAD = Platform.OS === 'android'
  ? (StatusBar.currentHeight ?? 24)
  : 0;

export function Header({
  title,
  onBack,
  showBack = true,
  rightComponent,
  titleColor = Colors.primary,
}: HeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      safeBack();
    }
  };

  return (
    <View style={styles.container}>
      {showBack ? (
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          android_ripple={{ color: `${Colors.primary}20`, borderless: true, radius: 20 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={scale(24)} color={Colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}

      {title ? (
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}

      <View style={styles.right}>
        {rightComponent ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: ANDROID_TOP_PAD,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    minHeight: scale(52),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(20),
  },
  placeholder: {
    width: scale(40),
  },
  titlePlaceholder: {
    flex: 1,
  },
  title: {
    flex: 1,
    ...Typography.headingSmall,
    textAlign: 'center',
  },
  right: {
    width: scale(40),
    alignItems: 'flex-end',
  },
});

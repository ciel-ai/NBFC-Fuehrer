import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';

interface StepProgressProps {
  current: number; // 1-based
  total: number;
  title: string;
  accent?: string;
}

export function StepProgress({ current, total, title, accent = Colors.primary }: StepProgressProps) {
  const progress = useSharedValue(current / total);

  useEffect(() => {
    progress.value = withTiming(current / total, { duration: 280 });
  }, [current, total, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, progress.value * 100))}%`,
  }));

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.counter}>
          Step {current} of {total}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: accent }, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.md,
  },
  counter: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  track: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});

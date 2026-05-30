import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  goodThreshold?: number;
  warnThreshold?: number;
}

export function ScoreBar({
  label,
  value,
  max = 100,
  unit = '%',
  goodThreshold = 80,
  warnThreshold = 60,
}: ScoreBarProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  let color: string = Colors.success;
  if (value < warnThreshold) color = Colors.error;
  else if (value < goodThreshold) color = Colors.goldDark;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>
          {value}{unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  value: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  track: {
    height: scale(8),
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
});

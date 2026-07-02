import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface Feature {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface FeatureRowProps {
  features: Feature[];
  iconColor?: string;
  iconBg?: string;
}

export function FeatureRow({
  features,
  iconColor = Colors.primary,
  iconBg = Colors.primaryLight,
}: FeatureRowProps) {
  return (
    <View style={styles.row}>
      {features.map((f) => (
        <View key={f.label} style={styles.item}>
          <View style={[styles.circle, { backgroundColor: iconBg }]}>
            <Ionicons name={f.icon} size={scale(20)} color={iconColor} />
          </View>
          <Text style={styles.label}>{f.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

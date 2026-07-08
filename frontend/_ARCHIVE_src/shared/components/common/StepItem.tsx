import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/core/theme/colors';
import { Spacing } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface StepItemProps {
  step: number;
  title: string;
  description?: string;
  dotColor?: string;
  textColor?: string;
}

export function StepItem({
  step,
  title,
  description,
  dotColor = Colors.primaryLight,
  textColor = Colors.primary,
}: StepItemProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]}>
        <Text style={[styles.number, { color: textColor }]}>{step}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dot: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  number: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
});

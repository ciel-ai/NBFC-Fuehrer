import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

export interface ProgressStep {
  label: string;
}

interface ProgressChipsProps {
  steps: ProgressStep[];
  activeIndex: number;
}

export function ProgressChips({ steps, activeIndex }: ProgressChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {steps.map((step, idx) => {
        const isActive = idx === activeIndex;
        const isDone = idx < activeIndex;
        const bg = isActive ? Colors.primary : isDone ? Colors.primaryLight : Colors.backgroundLight;
        const fg = isActive ? Colors.textWhite : isDone ? Colors.primary : Colors.textSecondary;
        const borderColor = isActive ? Colors.primary : isDone ? Colors.primary : Colors.border;
        return (
          <React.Fragment key={step.label}>
            <View
              style={[
                styles.chip,
                { backgroundColor: bg, borderColor },
              ]}
            >
              {isDone ? (
                <Ionicons name="checkmark" size={scale(13)} color={fg} />
              ) : (
                <Text style={[styles.idx, { color: fg }]}>{idx + 1}</Text>
              )}
              <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: isDone ? Colors.primary : Colors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
    minHeight: scale(30),
  },
  idx: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  connector: {
    width: scale(14),
    height: 2,
    marginHorizontal: 2,
  },
});

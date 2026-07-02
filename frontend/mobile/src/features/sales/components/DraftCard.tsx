import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import { formatDate } from '@/src/core/utils/formatters';
import type { SalesDraft } from '@/src/entities/salesAgent';

interface DraftCardProps {
  draft: SalesDraft;
  totalSteps: number;
  onResume: () => void;
  onDelete: () => void;
}

export function DraftCard({ draft, totalSteps, onResume, onDelete }: DraftCardProps) {
  const pct = Math.round(((draft.stepIndex + 1) / totalSteps) * 100);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onResume}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`Resume draft for ${draft.label}, ${pct} percent complete`}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="document-text-outline" size={scale(20)} color={Colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {draft.label}
        </Text>
        <Text style={styles.meta}>
          {pct}% complete · Updated {formatDate(new Date(draft.updatedAt))}
        </Text>
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Delete draft for ${draft.label}`}
      >
        <Ionicons name="trash-outline" size={scale(20)} color={Colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.small,
  },
  iconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  meta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

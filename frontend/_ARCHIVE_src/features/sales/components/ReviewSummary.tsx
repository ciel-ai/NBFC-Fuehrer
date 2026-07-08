import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { formatDate } from '@/src/core/utils/formatters';
import type { SalesStepConfig } from '@/src/features/sales/config/types';

interface ReviewSummaryProps {
  /** All form-collecting steps (kind 'form'), in order. */
  steps: SalesStepConfig[];
  values: Record<string, unknown>;
}

function displayValue(value: unknown, type: string, options?: { label: string; value: string }[]): string {
  if (value == null || value === '') return '—';
  if (type === 'checkbox') return value ? 'Yes' : 'No';
  if (type === 'select' && options) {
    return options.find((o) => o.value === value)?.label ?? String(value);
  }
  if (type === 'date') {
    try {
      return formatDate(value as string);
    } catch {
      return String(value);
    }
  }
  if (type === 'currency') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (type === 'photo' || type === 'document') return 'Captured';
  return String(value);
}

export function ReviewSummary({ steps, values }: ReviewSummaryProps) {
  return (
    <View style={styles.container}>
      {steps.map((step) => {
        const fields = (step.fields ?? []).filter((f) => values[f.name] != null && values[f.name] !== '');
        if (fields.length === 0) return null;
        return (
          <View key={step.id} style={styles.group}>
            <Text style={styles.groupTitle}>{step.title}</Text>
            {fields.map((f) => (
              <View key={f.name} style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {f.label}
                </Text>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {displayValue(values[f.name], f.type, f.options)}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  group: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  groupTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  rowLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});

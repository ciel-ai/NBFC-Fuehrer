import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { formatDate } from '@/src/core/utils/formatters';
import type {
  SalesFieldConfig,
  SalesFormValues,
  SalesStepConfig,
} from '@/src/features/sales/config/types';

interface ReviewSummaryProps {
  /** All form-collecting steps (kind 'form'), in order. */
  steps: SalesStepConfig[];
  values: SalesFormValues;
}

function displayValue(
  field: SalesFieldConfig,
  values: SalesFormValues,
): string {
  // Derived rows (EMI, processing fee) hold no form value — recompute them.
  if (field.type === 'derived') return field.compute?.(values) ?? '—';

  const value = values[field.name];
  if (value == null || value === '') return '—';
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (field.type === 'select') {
    const options = field.optionsFrom ? field.optionsFrom(values) : field.options ?? [];
    return options.find((o) => o.value === value)?.label ?? String(value);
  }
  if (field.type === 'date') {
    try {
      return formatDate(value as string);
    } catch {
      return String(value);
    }
  }
  if (field.type === 'currency') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (field.type === 'photo' || field.type === 'document') return 'Captured';
  return String(value);
}

export function ReviewSummary({ steps, values }: ReviewSummaryProps) {
  return (
    <View style={styles.container}>
      {steps.map((step) => {
        const fields = (step.fields ?? []).filter(
          (f) => f.type === 'derived' || (values[f.name] != null && values[f.name] !== ''),
        );
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
                  {displayValue(f, values)}
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

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { BorderRadius, Spacing } from '@/src/core/theme/spacing';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { scale } from '@/src/core/utils/responsive';

interface FormValidationSummaryProps {
  errors: string[];
  title?: string;
  style?: ViewStyle;
}

export function FormValidationSummary({
  errors,
  title = 'Check the highlighted fields',
  style,
}: FormValidationSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <View style={[styles.container, style]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <View style={styles.header}>
        <Ionicons name="alert-circle-outline" size={scale(18)} color={Colors.error} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {errors.map((error) => (
        <View key={error} style={styles.errorRow}>
          <View style={styles.dot} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.errorLight,
    borderColor: `${Colors.error}33`,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingLeft: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.error,
    marginTop: 7,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    flex: 1,
  },
});

export default FormValidationSummary;

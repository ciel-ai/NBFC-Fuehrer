import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface EMIReminderCardProps {
  daysUntilDue: number;
  bankName: string;
  onPress?: () => void;
}

export function EMIReminderCard({ daysUntilDue, bankName, onPress }: EMIReminderCardProps) {
  const isUrgent = daysUntilDue <= 3;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUrgent && styles.cardUrgent,
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`EMI due in ${daysUntilDue} days, maintain balance in ${bankName}`}
    >
      <View style={[styles.iconContainer, isUrgent && styles.iconContainerUrgent]}>
        <Ionicons
          name="calendar"
          size={scale(22)}
          color={isUrgent ? Colors.error : Colors.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          Your EMI is due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.subtitle}>Maintain balance in {bankName}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  cardUrgent: {
    borderColor: Colors.errorLight,
    backgroundColor: '#FFF9F9',
  },
  iconContainer: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconContainerUrgent: {
    backgroundColor: Colors.errorLight,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

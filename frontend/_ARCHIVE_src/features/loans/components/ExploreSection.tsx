import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

export function ExploreSection() {
  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/(main)/apply/gold-loan')}
        android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Gold Loans, starting at 0.88% per month"
      >
        <View style={styles.iconCircleGold}>
          <Ionicons name="diamond" size={scale(20)} color={Colors.gold} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Gold Loans</Text>
          <Text style={styles.subtitle}>Starting @ 0.88% per month</Text>
        </View>
        <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textDisabled} />
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Refer and earn 500 rupees per lead"
      >
        <View style={styles.iconCircleGreen}>
          <Ionicons name="people" size={scale(20)} color={Colors.success} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Refer & Earn</Text>
          <Text style={styles.subtitle}>Earn ₹500/lead</Text>
        </View>
        <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textDisabled} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },
  iconCircleGold: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconCircleGreen: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
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

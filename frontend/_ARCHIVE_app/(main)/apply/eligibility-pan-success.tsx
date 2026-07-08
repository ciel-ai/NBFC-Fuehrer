import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { SuccessIcon } from '@/src/shared/components/common/SuccessIcon';
import { useScreenGuard } from '@/src/shared/hooks/useScreenGuard';

const APPLIANCE_LABELS: Record<string, string> = {
  mobile: 'Mobile Phone',
  home_appliance: 'Home Appliance',
  laptop: 'Laptop / Computer',
};

export default function EligibilityPANSuccessScreen() {
  useScreenGuard();
  const { appliance } = useLocalSearchParams<{ appliance: string }>();
  const [showButton, setShowButton] = useState(false);
  const buttonOpacity = useSharedValue(0);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handleAnimationComplete = () => {
    setShowButton(true);
    buttonOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
  };

  const handleContinue = () => {
    router.replace('/(main)/(tabs)/home');
  };

  const applianceLabel = APPLIANCE_LABELS[appliance ?? ''] ?? 'Selected Product';

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack />

      <View style={styles.content}>
        <SuccessIcon size={100} onAnimationComplete={handleAnimationComplete} />

        <Text style={styles.title}>PAN verified successfully</Text>
        <Text style={styles.subtitle}>
          Your identity has been confirmed. You are eligible for a Consumer Durable
          Loan for {applianceLabel}.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Verified</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Eligibility</Text>
            <View style={[styles.statusBadge, { backgroundColor: Colors.successLight }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Approved</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Product</Text>
            <Text style={styles.infoValue}>{applianceLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loan Type</Text>
            <Text style={styles.infoValue}>Consumer Durable</Text>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.footer, buttonAnimStyle]}>
        {showButton && (
          <Button title="Go to Dashboard" onPress={handleContinue} />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  infoLabel: { ...Typography.body, color: Colors.textSecondary },
  infoValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
});

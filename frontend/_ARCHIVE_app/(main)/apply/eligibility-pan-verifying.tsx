import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { Button } from '@/src/shared/components/common/Button';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useUserStore } from '@/src/store/userStore';

export default function EligibilityPANVerifyingScreen() {
  const { pan, appliance } = useLocalSearchParams<{ pan: string; appliance: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const hasStartedRef = useRef(false);

  const { kycService } = useServices();
  const userId = useUserStore((s) => s.user?.id ?? '');

  const runVerification = useCallback(async () => {
    if (!pan) {
      setErrorMessage('PAN number missing. Please go back and enter it again.');
      return;
    }
    try {
      setErrorMessage(null);
      const result = await kycService.verifyPAN({ panNumber: pan, userId });
      if (!isMountedRef.current) return;

      if (result.failure) {
        setErrorMessage(result.failure.message ?? 'PAN verification failed. Please retry.');
        return;
      }

      router.replace({
        pathname: '/(main)/apply/eligibility-pan-success',
        params: { pan, appliance: appliance ?? '' },
      });
    } catch {
      if (isMountedRef.current) {
        setErrorMessage('PAN verification failed. Please check your connection and retry.');
      }
    }
  }, [pan, appliance, kycService, userId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void runVerification();
  }, [runVerification]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Spinner with icon overlay */}
        <View style={styles.spinnerContainer}>
          <LoadingSpinner size={80} color={Colors.primary} thickness={5} />
          <View style={styles.iconOverlay}>
            <Text style={styles.lockIcon}>🔐</Text>
          </View>
        </View>

        <Text style={styles.title}>Verifying your PAN details</Text>
        <Text style={styles.subtitle}>
          {errorMessage
            ? errorMessage
            : "This usually takes a few seconds.\nPlease do not close the app."}
        </Text>

        {errorMessage && (
          <Button
            title="Retry Verification"
            onPress={() => {
              hasStartedRef.current = true;
              void runVerification();
            }}
            style={styles.retryButton}
          />
        )}

        <View style={styles.securityBadges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔒 SECURE VERIFICATION</Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>API LINK ESTABLISHED</Text>
          </View>
        </View>
      </View>
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
  },
  spinnerContainer: {
    position: 'relative',
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { fontSize: FontSize['4xl'] },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  retryButton: { marginTop: Spacing.md },
  securityBadges: {
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'absolute',
    bottom: Spacing.xxl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    letterSpacing: 0.5,
  },
});

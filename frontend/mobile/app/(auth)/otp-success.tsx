import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { SuccessAnimation } from '@/src/shared/components/common/SuccessAnimation';
import { statusAnimationMs } from '@/src/shared/components/common/StatusAnimation';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';

/* Slightly brisk, so a login flow is not held for the asset's full 4s. */
const ANIMATION_SPEED = 1.25;

/* Hand-off is a plain timer off mount, NOT Lottie's onAnimationFinish.
   That callback is the wrong signal here for two reasons: it never fires when
   the OS has Reduce Motion enabled (StatusAnimation renders the end frame
   statically instead, and reports "done" after 300ms), and it can be missed
   outright if the app backgrounds mid-play. Either way the screen flashes past.
   The duration is read from the asset so it cannot drift if that is swapped. */
const HANDOFF_MS = statusAnimationMs('success', ANIMATION_SPEED) + 500;

export default function OTPSuccessScreen() {
  const contentOpacity = useSharedValue(0);
  const onboardingDone = useUserStore((s) => s.onboardingDone);
  const mpinSet = useAuthStore((s) => s.mpinSet);

  /* A returning customer already has an MPIN and must be asked to ENTER it, not
     set a new one. The root guard used to silently correct this screen's
     hardcoded set-mpin destination; now that the guard leaves this screen alone
     so the confirmation can play, the routing decision belongs here. */
  const isReturning = onboardingDone && mpinSet;
  const nextScreen = isReturning ? '/(auth)/enter-mpin' : '/(auth)/set-mpin';

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  useEffect(() => {
    // Bring the copy up while the tick is still drawing, then hand off once the
    // whole celebration has played and had a beat to land.
    contentOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    const timer = setTimeout(() => {
      router.replace(nextScreen as never);
    }, HANDOFF_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Header showBack />

      <View style={styles.content}>
        <SuccessAnimation size={160} speed={ANIMATION_SPEED} />

        <Animated.View style={[styles.textSection, contentStyle]}>
          <Text style={styles.title}>Verified Successfully!</Text>
          <Text style={styles.subtitle}>
            Your mobile number has been confirmed. Setting up your account…
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
              <Text style={styles.infoLabel}>Next Step</Text>
              <Text style={styles.infoValue}>
                {isReturning ? 'Enter your MPIN' : 'Set your MPIN'}
              </Text>
            </View>
          </View>
        </Animated.View>
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
    gap: Spacing.lg,
  },
  textSection: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
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
});

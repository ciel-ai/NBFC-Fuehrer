import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { maskPhone } from '@/src/core/utils/formatters';
import { MPIN_LENGTH } from '@/src/core/utils/constants';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
];

const MAX_ATTEMPTS = 5;

export default function EnterMpinScreen() {
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [isLoading, setIsLoading] = useState(false);

  const verifyMpin = useAuthStore((s) => s.verifyMpin);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(public)');
    }
  }, [isAuthenticated]);

  const translateX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const triggerShake = useCallback(() => {
    translateX.value = withSequence(
      withTiming(10, { duration: 40 }),
      withTiming(-10, { duration: 40 }),
      withTiming(10, { duration: 40 }),
      withTiming(-10, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
  }, [translateX]);

  const handleKey = useCallback(
    async (key: string) => {
      if (isLoading) return;
      if (key === 'backspace') {
        setPin((prev) => prev.slice(0, -1));
        setHasError(false);
        return;
      }
      if (pin.length >= MPIN_LENGTH) return;

      const next = pin + key;
      setPin(next);

      if (next.length === MPIN_LENGTH) {
        setIsLoading(true);
        try {
          const valid = await verifyMpin(next);
          if (valid) {
            const role = useUserStore.getState().role;
            router.replace(
              role === 'agent' ? '/(main)/agent/dashboard' : '/(main)/(tabs)/home'
            );
          } else {
            triggerShake();
            setHasError(true);
            const remaining = attemptsLeft - 1;
            setAttemptsLeft(remaining);
            setTimeout(() => setPin(''), 400);

            if (remaining <= 0) {
              Alert.alert(
                'Too many attempts',
                'You have exceeded the maximum attempts. Please login again.',
                [{ text: 'OK', onPress: () => logout() }]
              );
            }
          }
        } catch {
          setHasError(true);
          setTimeout(() => setPin(''), 400);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [pin, isLoading, verifyMpin, attemptsLeft, triggerShake, logout]
  );

  const handleForgotMpin = () => {
    Alert.alert(
      'Forgot MPIN?',
      'You will be logged out and need to verify your mobile number again to reset your MPIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => logout() },
      ]
    );
  };

  const maskedPhone = user?.phone ? maskPhone(user.phone.replace('+91', '')) : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.brand}>Fuehrer NBFC</Text>

          <Text style={styles.title}>Welcome back</Text>
          {maskedPhone ? (
            <Text style={styles.subtitle}>
              Enter your MPIN for +91 {maskedPhone}
            </Text>
          ) : (
            <Text style={styles.subtitle}>Enter your MPIN to continue</Text>
          )}

          <Animated.View style={[styles.dotsRow, shakeStyle]}>
            {Array.from({ length: MPIN_LENGTH }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  hasError && i < pin.length && styles.dotError,
                ]}
              />
            ))}
          </Animated.View>

          {hasError && attemptsLeft > 0 && (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              Incorrect MPIN. {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining.
            </Text>
          )}
        </View>

        <View style={styles.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((key, ki) => {
                if (key === '') {
                  return <View key={ki} style={styles.keyPlaceholder} />;
                }
                if (key === 'backspace') {
                  return (
                    <Pressable
                      key={ki}
                      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                      onPress={() => handleKey('backspace')}
                      accessibilityLabel="Delete"
                      accessibilityRole="button"
                    >
                      <Ionicons name="backspace-outline" size={22} color={Colors.textPrimary} />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={ki}
                    style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                    onPress={() => handleKey(key)}
                    accessibilityLabel={key}
                    accessibilityRole="button"
                    disabled={isLoading}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleForgotMpin}
          style={styles.forgotBtn}
          accessibilityRole="button"
          accessibilityLabel="Forgot MPIN"
        >
          <Text style={styles.forgotText}>Forgot MPIN?</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const DOT_SIZE = 14;
const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },

  topSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },

  brand: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
  },

  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },

  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
  },

  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  dotError: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },

  errorText: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  keypad: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },

  keypadRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
  },

  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  keyPressed: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },

  keyPlaceholder: {
    width: KEY_SIZE,
    height: KEY_SIZE,
  },

  keyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  forgotBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  forgotText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
});

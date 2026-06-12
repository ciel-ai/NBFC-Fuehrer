import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Pressable, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { maskPhone } from '@/src/core/utils/formatters';
import { MPIN_LENGTH } from '@/src/core/utils/constants';
import { MpinScaffold, MpinScaffoldHandle } from '@/src/shared/components/common/MpinScaffold';

const MAX_ATTEMPTS = 5;

export default function EnterMpinScreen() {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [isLoading, setIsLoading] = useState(false);
  const padRef = useRef<MpinScaffoldHandle>(null);

  const verifyMpin = useAuthStore((s) => s.verifyMpin);
  const clearMpin = useAuthStore((s) => s.clearMpin);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(public)');
    }
  }, [isAuthenticated]);

  const handleComplete = useCallback(
    async (pin: string) => {
      setIsLoading(true);
      try {
        const valid = await verifyMpin(pin);
        if (valid) {
          router.replace('/(main)/(tabs)/home');
          return;
        }

        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        setErrorText(
          `Incorrect MPIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
        );
        padRef.current?.shakeAndClear();

        if (remaining <= 0) {
          Alert.alert(
            'Too many attempts',
            'You have exceeded the maximum attempts. Please login again.',
            [{ text: 'OK', onPress: () => logout() }]
          );
        }
      } catch {
        setErrorText('Something went wrong. Please try again.');
        padRef.current?.shakeAndClear();
      } finally {
        setIsLoading(false);
      }
    },
    [verifyMpin, attemptsLeft, logout]
  );

  const handleForgotMpin = () => {
    Alert.alert(
      'Forgot MPIN?',
      'You will be logged out and asked to verify your mobile number again to set a new MPIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            // Clear the stored PIN now so the re-login flow starts clean and no
            // stale hash/salt is left in SecureStore.
            await clearMpin();
            await logout();
          },
        },
      ]
    );
  };

  const maskedPhone = user?.phone ? maskPhone(user.phone.replace('+91', '')) : '';

  return (
    <MpinScaffold
      ref={padRef}
      title="Welcome back"
      subtitle={
        maskedPhone
          ? `Enter your MPIN for +91 ${maskedPhone}`
          : 'Enter your MPIN to continue'
      }
      pinLength={MPIN_LENGTH}
      onComplete={handleComplete}
      errorText={errorText}
      disabled={isLoading}
      footer={
        <Pressable
          onPress={handleForgotMpin}
          style={styles.forgotBtn}
          accessibilityRole="button"
          accessibilityLabel="Forgot MPIN"
        >
          <Text style={styles.forgotText}>Forgot MPIN?</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  forgotBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
});

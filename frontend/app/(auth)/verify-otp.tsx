import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { OTPInput } from '@/src/shared/components/common/OTPInput';
import { useOTPTimer } from '@/src/shared/hooks/useOTPTimer';
import { formatCountdown, maskPhone } from '@/src/core/utils/formatters';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { useKycStore } from '@/src/store/kycStore';
import { KycStep, KycStatus } from '@/src/entities/kyc';
import { useServices } from '@/src/core/services/ServiceProvider';
import { MOCK_OTP } from '@/src/core/utils/constants';

export default function VerifyOTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const OTP_SESSION_TIMEOUT = 300; // 5 minutes in seconds

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(OTP_SESSION_TIMEOUT);
  const isMountedRef = useRef(true);

  const login = useAuthStore((s) => s.login);
  const setUser = useUserStore((s) => s.setUser);
  const role = useUserStore((s) => s.role) ?? 'customer';
  const setEngineState = useKycStore((s) => s.setEngineState);

  const { secondsLeft, canResend, restart } = useOTPTimer();
  const { authService } = useServices();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        Alert.alert(
          'Cancel Verification?',
          'Going back will cancel your OTP session.',
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Go Back', onPress: () => router.back() },
          ]
        );
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    if (!phone) {
      Alert.alert('Error', 'Phone number missing');
      router.replace('/(auth)/login');
    }
  }, [phone]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setOtp('');
          setHasError(false);
          setErrorMessage(null);
          Alert.alert('Session Expired', 'OTP session timed out. Please request a new code.', [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') },
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = useCallback(
    async (otpValue: string) => {
      if (!phone || otpValue.length !== 6 || isLoading) return;

      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);

      try {
        const result = await authService.verifyOTP({ phone, otp: otpValue });
        if (!isMountedRef.current) return;

        await setUser(result.user);
        await login(result.accessToken, result.refreshToken);
        if (!isMountedRef.current) return;

        if (result.kycComplete) {
          setEngineState({ currentStep: KycStep.COMPLETED, status: KycStatus.COMPLETED });
        }

        router.replace('/(auth)/otp-success');
      } catch (err: any) {
        if (!isMountedRef.current) return;
        const code = err?.code;

        if (code === 'INVALID_OTP') {
          setHasError(true);
          setErrorMessage('Incorrect OTP. Please try again.');
          setAttemptsLeft((prev) => Math.max(prev - 1, 0));
        } else if (code === 'OTP_EXPIRED') {
          setErrorMessage('OTP expired. Please request a new code.');
          Alert.alert('OTP Expired', err.message);
          setOtp('');
          restart();
        } else if (code === 'OTP_LIMIT_EXCEEDED') {
          setErrorMessage('Too many attempts. Please resend OTP.');
          Alert.alert('Too Many Attempts', err.message);
          setOtp('');
          setAttemptsLeft(3);
        } else if (code === 'NETWORK_ERROR') {
          setErrorMessage('Network error. Check your connection and try again.');
          Alert.alert('Network Error', 'Please check your connection and try again.');
        } else {
          setErrorMessage('Something went wrong. Please try again.');
          Alert.alert('Error', 'Something went wrong. Please try again.');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [phone, isLoading, login, restart, setUser, setEngineState]
  );

  const handleResend = async () => {
    if (!phone || !canResend || resendLoading) return;
    try {
      setResendLoading(true);
      setErrorMessage(null);
      await authService.sendOTP({ phone, role });
      if (!isMountedRef.current) return;
      restart();
      setOtp('');
      setHasError(false);
      setAttemptsLeft(3);
      setSessionSecondsLeft(OTP_SESSION_TIMEOUT);
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err?.message || 'Failed to resend OTP');
        Alert.alert('Error', err?.message || 'Failed to resend OTP');
      }
    } finally {
      if (isMountedRef.current) {
        setResendLoading(false);
      }
    }
  };

  if (!phone) return null;

  const maskedPhone = maskPhone(phone);

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Verify OTP</Text>

          <Text style={styles.subtitle}>
            OTP sent to +91 {maskedPhone}
          </Text>

          <View style={styles.sessionTimerRow}>
            <Text style={[
              styles.sessionTimerText,
              sessionSecondsLeft <= 60 && styles.sessionTimerWarning,
            ]}>
              Session expires in {formatCountdown(sessionSecondsLeft)}
            </Text>
          </View>

          {__DEV__ && Boolean(MOCK_OTP) && (
            <View style={styles.devHint}>
              <Text style={styles.devHintText}>Dev OTP: {MOCK_OTP}</Text>
            </View>
          )}

          <View style={styles.otpSection}>
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
              hasError={hasError}
              disabled={isLoading}
            />
          </View>

          {hasError && attemptsLeft > 0 && (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              Incorrect OTP. {attemptsLeft} attempt
              {attemptsLeft !== 1 ? 's' : ''} remaining.
            </Text>
          )}
          {errorMessage && !hasError && (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">{errorMessage}</Text>
          )}

          <View style={styles.timerRow}>
            {canResend ? (
              <Pressable
                onPress={handleResend}
                disabled={resendLoading}
                accessibilityRole="button"
                accessibilityLabel="Resend OTP"
              >
                <Text style={styles.resendActive}>
                  {resendLoading ? 'Sending...' : 'Resend OTP'}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.timerText}>
                Resend OTP in {formatCountdown(secondsLeft)}
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isLoading ? 'Verifying...' : 'Verify & Continue'}
            onPress={() => handleVerify(otp)}
            disabled={otp.length !== 6 || isLoading}
            loading={isLoading}
          />

          <Pressable
            onPress={() => router.back()}
            style={styles.changeNumber}
            accessibilityRole="button"
            accessibilityLabel="Change mobile number"
          >
            <Text style={styles.changeNumberText}>Change mobile number</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  devHint: {
    backgroundColor: Colors.goldLight,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  devHintText: {
    ...Typography.caption,
    color: Colors.goldDark,
    textAlign: 'center',
  },
  otpSection: { marginBottom: Spacing.lg },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  timerRow: { alignItems: 'center', marginTop: Spacing.sm },
  timerText: { ...Typography.body, color: Colors.textSecondary },
  resendActive: { ...Typography.bodyMedium, color: Colors.primary },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  changeNumber: { padding: Spacing.sm, minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  changeNumberText: { ...Typography.bodyMedium, color: Colors.primary },
  sessionTimerRow: { alignItems: 'center', marginBottom: Spacing.md },
  sessionTimerText: { ...Typography.caption, color: Colors.textSecondary },
  sessionTimerWarning: { color: Colors.error },
});

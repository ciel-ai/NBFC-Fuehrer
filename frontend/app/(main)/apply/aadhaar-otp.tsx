import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCountdown } from '@/src/core/utils/formatters';

type Step = 'enter_aadhaar' | 'enter_otp' | 'verified';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskAadhaar(raw: string): string {
  if (raw.length < 4) return raw;
  return `XXXX XXXX ${raw.slice(-4)}`;
}

export default function AadhaarOTPScreen() {
  const params = useLocalSearchParams<{
    productName?: string;
    loanAmount?: string;
    pan?: string;
    /** Passed through to kyc-step-2 so each loan type can route correctly after selfie. */
    nextPath?: string;
  }>();
  const [step, setStep] = useState<Step>('enter_aadhaar');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_SECONDS);
    clearTimer();
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const handleAadhaarChange = (text: string) => {
    setAadhaar(text.replace(/\D/g, '').slice(0, 12));
  };

  const handleSendOTP = async () => {
    setSendLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSendLoading(false);
    setStep('enter_otp');
    setOtp('');
    setOtpError('');
    startCountdown();
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setSendLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSendLoading(false);
    setOtp('');
    setOtpError('');
    startCountdown();
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setVerifyLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setVerifyLoading(false);
    if (otp === '123456') {
      setStep('verified');
      clearTimer();
    } else {
      setOtpError('Incorrect OTP. Please try again.');
      setOtp('');
    }
  };

  const formattedAadhaar = aadhaar
    .replace(/\D/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Aadhaar Verification" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="finger-print" size={scale(32)} color={Colors.primary} />
          </View>
          <Text style={styles.title}>
            {step === 'verified' ? 'Aadhaar Verified!' : 'Aadhaar OTP Verification'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'enter_aadhaar' &&
              'Enter your 12-digit Aadhaar number. An OTP will be sent to your Aadhaar-linked mobile.'}
            {step === 'enter_otp' &&
              `OTP sent to your Aadhaar-linked mobile for ${maskAadhaar(aadhaar)}.`}
            {step === 'verified' &&
              'Your Aadhaar is successfully verified. Your KYC is now complete.'}
          </Text>

          {step === 'enter_aadhaar' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>AADHAAR NUMBER</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="card-outline" size={scale(20)} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="XXXX XXXX XXXX"
                    placeholderTextColor={Colors.textDisabled}
                    value={formattedAadhaar}
                    onChangeText={handleAadhaarChange}
                    keyboardType="number-pad"
                    maxLength={14}
                    accessibilityLabel="Aadhaar number"
                  />
                  {aadhaar.length === 12 && (
                    <Ionicons name="checkmark-circle" size={scale(20)} color={Colors.success} />
                  )}
                </View>
              </View>

              <View style={styles.consentBox}>
                <Ionicons name="shield-checkmark-outline" size={scale(16)} color={Colors.primary} />
                <Text style={styles.consentText}>
                  Aadhaar-based verification is done via UIDAI's secure OTP service. We do not store
                  your Aadhaar number.
                </Text>
              </View>

              <Button
                title={sendLoading ? 'Sending OTP…' : 'Send OTP'}
                onPress={handleSendOTP}
                disabled={aadhaar.length !== 12 || sendLoading}
                loading={sendLoading}
              />
            </>
          )}

          {step === 'enter_otp' && (
            <>
              <View style={styles.otpContainer}>
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      otp.length === i && styles.otpBoxActive,
                      otpError && styles.otpBoxError,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                  </View>
                ))}
              </View>

              <TextInput
                style={styles.hiddenInput}
                value={otp}
                onChangeText={(t) => {
                  setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH));
                  if (otpError) setOtpError('');
                }}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                autoFocus
                accessibilityLabel="OTP input"
              />

              {otpError ? (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {otpError}
                </Text>
              ) : null}

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>
                    Resend OTP in {formatCountdown(countdown)}
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleResend}
                    disabled={sendLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Resend OTP"
                  >
                    <Text style={styles.resendText}>
                      {sendLoading ? 'Sending…' : 'Resend OTP'}
                    </Text>
                  </Pressable>
                )}
              </View>

              <Button
                title={verifyLoading ? 'Verifying…' : 'Verify OTP'}
                onPress={handleVerifyOTP}
                disabled={otp.length !== OTP_LENGTH || verifyLoading}
                loading={verifyLoading}
              />

              <Pressable
                style={styles.changeLink}
                onPress={() => { setStep('enter_aadhaar'); clearTimer(); }}
                accessibilityRole="button"
                accessibilityLabel="Change Aadhaar number"
              >
                <Text style={styles.changeLinkText}>Change Aadhaar number</Text>
              </Pressable>
            </>
          )}

          {step === 'verified' && (
            <>
              <View style={styles.successCard}>
                <View style={styles.successRow}>
                  <View style={styles.successIconBg}>
                    <Ionicons name="checkmark-circle" size={scale(32)} color={Colors.success} />
                  </View>
                  <View style={styles.successInfo}>
                    <Text style={styles.successLabel}>KYC Complete</Text>
                    <Text style={styles.successAadhaar}>{maskAadhaar(aadhaar)}</Text>
                  </View>
                </View>
                <View style={styles.successItems}>
                  {['PAN Verified', 'Aadhaar Verified', 'Identity Confirmed'].map((item) => (
                    <View key={item} style={styles.successItem}>
                      <Ionicons name="checkmark-circle" size={scale(16)} color={Colors.success} />
                      <Text style={styles.successItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Button
                title="Continue to Selfie Verification"
                onPress={() => router.push({
                  pathname: '/(main)/apply/kyc-step-2',
                  params: { ...params, aadhaar },
                })}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  field: { marginBottom: Spacing.md },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: scale(52),
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    letterSpacing: 4,
    paddingVertical: Spacing.sm,
  },

  consentBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  consentText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  otpBox: {
    width: scale(44),
    height: scale(52),
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
  },
  otpBoxActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  otpBoxError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  otpDigit: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  resendRow: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  countdownText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  resendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  changeLink: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  changeLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },

  successCard: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  successIconBg: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successInfo: { flex: 1 },
  successLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.success,
  },
  successAadhaar: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginTop: 2,
  },
  successItems: { gap: Spacing.xs },
  successItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  successItemText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
});

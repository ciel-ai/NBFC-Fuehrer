import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCountdown } from '@/src/core/utils/formatters';
import { OTPInput } from '@/src/shared/components/common/OTPInput';

type ESignStep = 'review' | 'otp_sent' | 'signed';

const LOAN_TERMS = [
  { label: 'Loan Amount',    value: '₹5,00,000' },
  { label: 'Interest Rate',  value: '14% p.a. (reducing)' },
  { label: 'Tenure',         value: '12 months' },
  { label: 'Monthly EMI',    value: '₹9,800' },
  { label: 'Processing Fee', value: '₹2,500 (0.5%)' },
  { label: 'Total Payable',  value: '₹1,20,100' },
];

const DOC_CLAUSES = [
  'The borrower agrees to repay the loan in equal monthly instalments.',
  'Late payment charges of 2% per month will apply on overdue amounts.',
  'Prepayment is allowed after 6 months with a 2% foreclosure charge.',
  'The lender reserves the right to recall the loan upon default.',
];

export default function ESignScreen() {
  const [step, setStep] = useState<ESignStep>('review');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sendLoading, setSendLoading] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startCountdown = useCallback(() => {
    setCountdown(30);
    clearTimer();
    timerRef.current = setInterval(() => {
      setCountdown((p) => { if (p <= 1) { clearTimer(); return 0; } return p - 1; });
    }, 1000);
  }, [clearTimer]);

  const handleRequestOTP = async () => {
    setSendLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSendLoading(false);
    setStep('otp_sent');
    setOtp('');
    setOtpError('');
    startCountdown();
  };

  const handleSign = async () => {
    if (otp.length !== 6) return;
    setSignLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSignLoading(false);
    if (otp === '123456') {
      setStep('signed');
      clearTimer();
    } else {
      setOtpError('Incorrect OTP. Please try again.');
      setOtp('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Sign Loan Agreement" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step !== 'signed' && (
          <View style={styles.emudhraBadge}>
            <Ionicons name="shield-checkmark" size={scale(14)} color={Colors.success} />
            <Text style={styles.emudhraBadgeText}>Powered by eMudhra — Legal eSign</Text>
          </View>
        )}

        {step === 'review' && (
          <>
            <Text style={styles.sectionTitle}>Loan Agreement Summary</Text>

            <View style={styles.termsCard}>
              {LOAN_TERMS.map((t, i, arr) => (
                <View key={t.label}>
                  <View style={styles.termRow}>
                    <Text style={styles.termKey}>{t.label}</Text>
                    <Text style={styles.termVal}>{t.value}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.termDivider} />}
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Key Terms &amp; Conditions</Text>

            <View style={styles.clausesCard}>
              {DOC_CLAUSES.map((clause, i) => (
                <View key={i} style={styles.clauseRow}>
                  <View style={styles.clauseBullet}>
                    <Text style={styles.clauseBulletNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.clauseText}>{clause}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.agreeRow}
              onPress={() => setAgreed((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityLabel="I have read and agree to the loan agreement"
              accessibilityState={{ checked: agreed }}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={scale(12)} color={Colors.textWhite} />}
              </View>
              <Text style={styles.agreeText}>
                I have read and agree to the{' '}
                <Text style={styles.agreeLink}>Loan Agreement</Text>
                {' '}and{' '}
                <Text style={styles.agreeLink}>Terms &amp; Conditions</Text>.
              </Text>
            </Pressable>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={scale(16)} color={Colors.primary} />
              <Text style={styles.infoText}>
                By clicking Sign, an OTP will be sent to your Aadhaar-linked mobile number. This constitutes a legally valid electronic signature.
              </Text>
            </View>

            <Button
              title={sendLoading ? 'Sending OTP…' : 'Sign with OTP'}
              onPress={handleRequestOTP}
              disabled={!agreed || sendLoading}
              loading={sendLoading}
            />
          </>
        )}

        {step === 'otp_sent' && (
          <>
            <View style={styles.otpHero}>
              <View style={styles.otpHeroIcon}>
                <Ionicons name="phone-portrait-outline" size={scale(32)} color={Colors.primary} />
              </View>
              <Text style={styles.otpHeroTitle}>Enter eSign OTP</Text>
              <Text style={styles.otpHeroSubtitle}>
                A 6-digit OTP has been sent to your Aadhaar-linked mobile number ending in ••••42.
              </Text>
            </View>

            <OTPInput
              value={otp}
              onChange={(v) => { setOtp(v); if (otpError) setOtpError(''); }}
              hasError={!!otpError}
            />
            {otpError ? (
              <Text style={styles.otpError} accessibilityLiveRegion="polite">{otpError}</Text>
            ) : null}

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Resend in {formatCountdown(countdown)}</Text>
              ) : (
                <Pressable
                  onPress={handleRequestOTP}
                  accessibilityRole="button"
                  accessibilityLabel="Resend OTP"
                >
                  <Text style={styles.resendText}>Resend OTP</Text>
                </Pressable>
              )}
            </View>

            <Button
              title={signLoading ? 'Signing…' : 'Confirm &amp; Sign'}
              onPress={handleSign}
              disabled={otp.length !== 6 || signLoading}
              loading={signLoading}
            />
          </>
        )}

        {step === 'signed' && (
          <View style={styles.signedSection}>
            <View style={styles.signedCircle}>
              <Ionicons name="checkmark" size={scale(52)} color={Colors.textWhite} />
            </View>
            <Text style={styles.signedTitle}>Agreement Signed!</Text>
            <Text style={styles.signedSubtitle}>
              Your loan agreement has been legally executed via eMudhra eSign. You will receive a copy on your registered email.
            </Text>

            <View style={styles.signedCard}>
              {[
                { label: 'Signed By',    value: 'Arun Kumar Mehta' },
                { label: 'Sign Date',    value: '13 May 2026, 3:45 PM' },
                { label: 'eSign Ref',    value: `ES-${Date.now().toString().slice(-8)}` },
                { label: 'Method',       value: 'Aadhaar OTP eSign' },
                { label: 'Authority',    value: 'eMudhra CA' },
              ].map((item, i, arr) => (
                <View key={item.label}>
                  <View style={styles.signedRow}>
                    <Text style={styles.signedKey}>{item.label}</Text>
                    <Text style={styles.signedVal}>{item.value}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.signedDivider} />}
                </View>
              ))}
            </View>

            <Button
              title="Set Up Auto-Debit (eNACH)"
              onPress={() => router.push('/(main)/apply/enach')}
            />
            <Pressable
              style={styles.skipLink}
              onPress={() => router.replace('/(main)/(tabs)/home')}
              accessibilityRole="button"
              accessibilityLabel="Set up later"
            >
              <Text style={styles.skipLinkText}>Set Up Later</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  emudhraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emudhraBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.success,
  },

  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },

  termsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  termKey: { ...Typography.body, color: Colors.textSecondary },
  termVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  termDivider: { height: 1, backgroundColor: Colors.border },

  clausesCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clauseRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  clauseBullet: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  clauseBulletNum: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  clauseText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  agreeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  agreeLink: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },

  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },

  otpHero: { alignItems: 'center', gap: Spacing.sm },
  otpHeroIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpHeroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },
  otpHeroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  otpError: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  resendRow: { alignItems: 'center' },
  countdownText: { ...Typography.caption, color: Colors.textSecondary },
  resendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  signedSection: { alignItems: 'center', gap: Spacing.lg },
  signedCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  signedSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  signedCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  signedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  signedKey: { ...Typography.body, color: Colors.textSecondary },
  signedVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  signedDivider: { height: 1, backgroundColor: Colors.border },
  skipLink: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  skipLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

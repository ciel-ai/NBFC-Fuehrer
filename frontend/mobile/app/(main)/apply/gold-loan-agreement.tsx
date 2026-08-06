import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { OTPInput } from '@/src/shared/components/common/OTPInput';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { resolveGoldApplicationId } from '@/src/core/utils/goldApplication';
import type { GoldLoanAgreementResult } from '@/src/entities/goldLoan';

type Step = 'review' | 'otp' | 'signed';

import { usePersistApplyStep } from '@/src/features/apply/useApplyDraft';

export default function GoldLoanAgreementScreen() {
  usePersistApplyStep('gold');
  const params = useLocalSearchParams<Record<string, string>>();
  const { goldLoanService } = useServices();
  const applicationId = resolveGoldApplicationId(params.applicationId);
  const [step, setStep] = useState<Step>('review');
  const [agreement, setAgreement] = useState<GoldLoanAgreementResult | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    if (!applicationId) return;
    let mounted = true;
    const load = async () => {
      try {
        const data = await goldLoanService.generateAgreement(applicationId);
        if (mounted) setAgreement(data);
      } catch {
        if (mounted) Alert.alert('Agreement unavailable', 'Please try again.');
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [goldLoanService, applicationId]);

  const sign = async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const data = await goldLoanService.completeESign(applicationId, otp);
      setAgreement(data);
      setStep('signed');
    } catch {
      setOtpError('Incorrect OTP. Use the test OTP while backend is mocked.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  if (!applicationId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Gold Loan Agreement" showBack />
        <ErrorView
          title="Application reference missing"
          message="We could not find your application reference. Please go back and restart the application."
          retryLabel="Go Back"
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const amount = Number(params.finalLoanAmount ?? params.loanAmount ?? 139500);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Gold Loan Agreement" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.providerRow}>
          <View style={styles.providerChip}>
            <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
            <Text style={styles.providerText}>NeSL eStamp</Text>
          </View>
          <View style={styles.providerChip}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.success} />
            <Text style={[styles.providerText, { color: Colors.success }]}>eMudhra eSign</Text>
          </View>
        </View>

        {step === 'review' && (
          <>
            <View style={styles.card}>
              {[
                ['Loan amount', formatCurrency(amount)],
                ['Tenure', '6 months'],
                ['Interest', '0.88% per month'],
                ['Gold security', 'Stored in secured vault'],
                ['Stamp reference', agreement?.stampRef ?? 'Generating...'],
              ].map(([label, value], index, arr) => (
                <View key={label}>
                  <View style={styles.row}>
                    <Text style={styles.key}>{label}</Text>
                    <Text style={styles.value}>{value}</Text>
                  </View>
                  {index < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <View style={styles.clauseCard}>
              {[
                'Gold remains pledged until all dues are cleared.',
                'Vault release happens only after closure confirmation.',
                'NACH mandate must be active before disbursal.',
              ].map((text, index) => (
                <View key={text} style={styles.clauseRow}>
                  <View style={styles.clauseNum}>
                    <Text style={styles.clauseNumText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.clauseText}>{text}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.agreeRow}
              onPress={() => setAgreed((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={12} color={Colors.textWhite} />}
              </View>
              <Text style={styles.agreeText}>I agree to the stamped Gold Loan agreement and eSign consent.</Text>
            </Pressable>

            <Button title="Send Aadhaar eSign OTP" disabled={!agreed || !agreement} onPress={() => setStep('otp')} />
          </>
        )}

        {step === 'otp' && (
          <View style={styles.otpSection}>
            <Ionicons name="phone-portrait-outline" size={42} color={Colors.primary} />
            <Text style={styles.title}>Enter eSign OTP</Text>
            <Text style={styles.subtitle}>Aadhaar eSign OTP is simulated until backend eMudhra is live.</Text>
            <OTPInput value={otp} onChange={(v) => { setOtp(v); setOtpError(''); }} hasError={!!otpError} />
            {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}
            <Button title="Confirm & Sign" disabled={otp.length !== 6 || loading} loading={loading} onPress={sign} />
          </View>
        )}

        {step === 'signed' && (
          <View style={styles.signedSection}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={48} color={Colors.textWhite} />
            </View>
            <Text style={styles.title}>Agreement signed</Text>
            <Text style={styles.subtitle}>The stamped agreement is ready for storage and NACH setup.</Text>
            <View style={styles.card}>
              {[
                ['Agreement ID', agreement?.agreementId ?? '-'],
                ['NeSL stamp', agreement?.stampRef ?? '-'],
                ['eSign ref', agreement?.esignRef ?? '-'],
              ].map(([label, value], index, arr) => (
                <View key={label}>
                  <View style={styles.row}>
                    <Text style={styles.key}>{label}</Text>
                    <Text style={styles.value}>{value}</Text>
                  </View>
                  {index < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
            <Button
              title="Continue to NACH Setup"
              onPress={() =>
                router.push({
                  pathname: '/(main)/apply/gold-loan-nach',
                  params,
                })
              }
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md },
  providerRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.primary },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.border },
  clauseCard: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md },
  clauseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  clauseNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  clauseNumText: { color: Colors.textWhite, fontFamily: FontFamily.bold, fontSize: FontSize.xs },
  clauseText: { ...Typography.caption, color: Colors.primary, flex: 1, lineHeight: 18 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreeText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  otpSection: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  signedSection: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  successCircle: { width: 92, height: 92, borderRadius: 46, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorText: { ...Typography.caption, color: Colors.error, textAlign: 'center' },
});

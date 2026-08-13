import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { OTPInput } from '@/src/shared/components/common/OTPInput';
import { formatCurrency, formatTenure } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import {
  cdlAutoDebitLabel,
  CDL_DEFAULT_AUTO_DEBIT_DATE,
  CDL_DEFAULT_INTEREST_RATE,
  type CdlAgreementResult,
} from '@/src/entities/consumerDurableLoan';

type Step = 'review' | 'otp' | 'signed';

import { usePersistApplyStep } from '@/src/features/apply/useApplyDraft';

export default function CdlAgreementScreen() {
  usePersistApplyStep('cdl');
  const params = useLocalSearchParams<Record<string, string>>();
  const { consumerDurableLoanService } = useServices();
  const [step, setStep] = useState<Step>('review');
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState<CdlAgreementResult | null>(null);

  const amount = Number(params.loanAmount ?? 0);
  const tenure = Number(params.tenure ?? 12);
  const emi = Number(params.emi ?? 0);
  const interestRate = params.interestRate ? Number(params.interestRate) : CDL_DEFAULT_INTEREST_RATE;
  const preferredDebitDay = params.debitDate ? Number(params.debitDate) : CDL_DEFAULT_AUTO_DEBIT_DATE;
  // Carried from the product screen, which got it from the API's /quote. No
  // local fallback: recomputing the fee here would be a second implementation
  // that can disagree with the one the loan is actually booked at.
  const processingFee = params.processingFee ? Number(params.processingFee) : 0;

  const sign = async () => {
    if (otp !== '123456') {
      setOtpError('Incorrect OTP. Use the test OTP while eMudhra is mocked.');
      setOtp('');
      return;
    }
    setLoading(true);
    try {
      // No body — the API reads the approved terms from the application row.
      // The amount/tenure/emi/interestRate this used to post were ignored.
      const data = await consumerDurableLoanService.generateAgreement(
        params.applicationId ?? 'cdl_mock_application',
      );
      setAgreement(data);
      setStep('signed');
    } catch {
      setOtpError('Could not generate the agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Loan Agreement" showBack />
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
          <View style={styles.providerChip}>
            <Ionicons name="cloud-upload-outline" size={14} color={Colors.purple} />
            <Text style={[styles.providerText, { color: Colors.purple }]}>AWS S3</Text>
          </View>
        </View>

        {step === 'review' && (
          <>
            <View style={styles.card}>
              {[
                ['Product', params.productName ?? 'Consumer Durable'],
                ['Loan amount', formatCurrency(amount)],
                ['Interest', interestRate === 0 ? 'No-cost EMI (0%)' : `${interestRate}% p.a. (reducing)`],
                ['Processing fee', processingFee > 0 ? formatCurrency(processingFee) : '—'],
                ['Tenure', formatTenure(tenure)],
                ['Monthly EMI', formatCurrency(emi)],
                ['Auto-debit', cdlAutoDebitLabel(preferredDebitDay)],
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
                'The borrower repays in equal monthly instalments via NACH auto-debit.',
                'Late payment penalty of 2% is added to the next EMI on default.',
                'The agreement is e-stamped (NeSL) and Aadhaar e-signed (eMudhra).',
                'The signed PDF is stored securely in AWS S3.',
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
              <Text style={styles.agreeText}>I agree to the e-stamped loan agreement and Aadhaar eSign consent.</Text>
            </Pressable>

            <Button title="Send Aadhaar eSign OTP" disabled={!agreed} onPress={() => setStep('otp')} />
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

        {step === 'signed' && agreement && (
          <View style={styles.signedSection}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={48} color={Colors.textWhite} />
            </View>
            <Text style={styles.title}>Agreement signed & stored</Text>
            <Text style={styles.subtitle}>The e-stamped agreement is signed and saved to AWS S3.</Text>
            <View style={styles.card}>
              {[
                ['Agreement PDF', 'Generated'],
                ['Agreement ID', agreement.agreementId],
                ['NeSL eStamp', agreement.stampRef ?? '-'],
                ['eMudhra eSign', agreement.esignRef ?? '-'],
                ['Stored in S3', agreement.s3Url ? 'Yes' : '-'],
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
              onPress={() => router.push({ pathname: '/(main)/apply/cdl-nach', params })}
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
  providerRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', flexWrap: 'wrap' },
  providerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  providerText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.primary },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small, width: '100%' },
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

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
import { formatCurrency, formatTenure } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { HOUSING_INTEREST_RATE } from '@/src/entities/housingLoan';
import type { HousingAgreementResult } from '@/src/entities/housingLoan';

type Step = 'review' | 'esign_primary' | 'esign_co' | 'signed';

export default function HousingAgreementScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { housingLoanService } = useServices();
  const hasCoApplicant = params.hasCoApplicant === '1';

  const amount = Number(params.amount) || 0;
  const tenure = Number(params.tenure) || 20;
  const emi = Number(params.emi) || 0;

  const [step, setStep] = useState<Step>('review');
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState<HousingAgreementResult | null>(null);
  const [primarySigned, setPrimarySigned] = useState(false);
  const [coSigned, setCoSigned] = useState(false);

  useEffect(() => {
    let mounted = true;
    housingLoanService
      .generateAgreement(params.applicationId ?? 'hl_mock', { amount, tenure, emi })
      .then((d) => { if (mounted) setAgreement(d); })
      .catch(() => { if (mounted) Alert.alert('Agreement unavailable', 'Please try again.'); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housingLoanService]);

  const signCurrent = async (applicant: 'primary' | 'co') => {
    if (otp !== '123456') {
      setOtpError('Incorrect OTP. Use the test OTP while eMudhra is mocked.');
      setOtp('');
      return;
    }
    setLoading(true);
    try {
      const res = await housingLoanService.eSign(params.applicationId ?? 'hl_mock', applicant);
      setAgreement((prev) => ({ ...(prev as HousingAgreementResult), ...res }));
      setOtp('');
      setOtpError('');
      if (applicant === 'primary') {
        setPrimarySigned(true);
        if (hasCoApplicant) setStep('esign_co');
        else setStep('signed');
      } else {
        setCoSigned(true);
        setStep('signed');
      }
    } catch {
      setOtpError('Could not sign. Please try again.');
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
                ['Loan amount', formatCurrency(amount)],
                ['Interest', `${HOUSING_INTEREST_RATE}% p.a. (reducing)`],
                ['Tenure', formatTenure(tenure * 12)],
                ['Monthly EMI', formatCurrency(emi)],
                ['Stamp duty (higher slab)', agreement ? formatCurrency(agreement.stampDuty) : '…'],
                ['NeSL stamp ref', agreement?.stampRef ?? 'Generating…'],
              ].map(([k, v], i, arr) => (
                <View key={k}>
                  <View style={styles.row}><Text style={styles.key}>{k}</Text><Text style={styles.value}>{v}</Text></View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <View style={styles.signersCard}>
              <Text style={styles.signersTitle}>Signatories</Text>
              <View style={styles.signerRow}>
                <Ionicons name="person-outline" size={16} color={Colors.primary} />
                <Text style={styles.signerText}>Primary applicant — Aadhaar eSign</Text>
              </View>
              {hasCoApplicant && (
                <View style={styles.signerRow}>
                  <Ionicons name="person-outline" size={16} color={Colors.primary} />
                  <Text style={styles.signerText}>{params.coAppName ?? 'Co-applicant'} — Aadhaar eSign</Text>
                </View>
              )}
            </View>

            <Pressable style={styles.agreeRow} onPress={() => setAgreed((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={12} color={Colors.textWhite} />}
              </View>
              <Text style={styles.agreeText}>
                {hasCoApplicant
                  ? 'Both applicants agree to the e-stamped agreement and Aadhaar eSign consent.'
                  : 'I agree to the e-stamped agreement and Aadhaar eSign consent.'}
              </Text>
            </Pressable>

            <Button title="Start eSign — Primary Applicant" disabled={!agreed || !agreement} onPress={() => setStep('esign_primary')} />
          </>
        )}

        {(step === 'esign_primary' || step === 'esign_co') && (
          <View style={styles.otpSection}>
            <Ionicons name="phone-portrait-outline" size={42} color={Colors.primary} />
            <Text style={styles.title}>
              {step === 'esign_primary' ? 'Primary applicant eSign' : `${params.coAppName ?? 'Co-applicant'} eSign`}
            </Text>
            <Text style={styles.subtitle}>Aadhaar eSign OTP is simulated until backend eMudhra is live.</Text>
            <OTPInput value={otp} onChange={(v) => { setOtp(v); setOtpError(''); }} hasError={!!otpError} />
            {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}
            <Button
              title="Confirm & Sign"
              disabled={otp.length !== 6 || loading}
              loading={loading}
              onPress={() => signCurrent(step === 'esign_primary' ? 'primary' : 'co')}
            />
          </View>
        )}

        {step === 'signed' && (
          <View style={styles.signedSection}>
            <View style={styles.successCircle}><Ionicons name="checkmark" size={48} color={Colors.textWhite} /></View>
            <Text style={styles.title}>Agreement signed & stored</Text>
            <Text style={styles.subtitle}>
              {hasCoApplicant ? 'Both applicants have eSigned.' : 'eSign complete.'} The stamped PDF is stored in AWS S3.
            </Text>
            <View style={styles.card}>
              {[
                ['Agreement PDF', 'Generated'],
                ['Agreement ID', agreement?.agreementId ?? '-'],
                ['NeSL eStamp', agreement?.stampRef ?? '-'],
                ['Primary eSign', primarySigned ? (agreement?.primaryEsignRef ?? 'Signed') : '-'],
                ...(hasCoApplicant ? [['Co-applicant eSign', coSigned ? (agreement?.coApplicantEsignRef ?? 'Signed') : '-'] as [string, string]] : []),
                ['Stored in S3', agreement?.s3Url ? 'Yes' : '-'],
              ].map(([k, v], i, arr) => (
                <View key={k}>
                  <View style={styles.row}><Text style={styles.key}>{k}</Text><Text style={styles.value}>{v}</Text></View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
            <Button title="Continue to NACH Setup" onPress={() => router.push({ pathname: '/(main)/apply/housing-nach', params: { ...params, emi: String(emi) } })} />
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
  signersCard: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  signersTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.primary },
  signerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  signerText: { ...Typography.caption, color: Colors.primary, flex: 1 },
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

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { useServices } from '@/src/core/services/ServiceProvider';
import {
  cdlForeclosureQuote,
  CDL_FORECLOSURE_RATE,
  CDL_GST_RATE,
  type CdlClosureResult,
} from '@/src/entities/consumerDurableLoan';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function CdlClosureScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loanService, consumerDurableLoanService } = useServices();
  const queryClient = useQueryClient();
  const [outstanding, setOutstanding] = useState<number | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<CdlClosureResult | null>(null);

  const loanId = id ?? 'L1';

  useEffect(() => {
    let mounted = true;
    void loanService
      .getLoanById(loanId)
      .then((loan) => { if (mounted) setOutstanding(loan.outstandingAmount); })
      .catch(() => { if (mounted) setOutstanding(0); })
      .finally(() => { if (mounted) setLoadingQuote(false); });
    return () => { mounted = false; };
  }, [loanService, loanId]);

  const closeLoan = async () => {
    setClosing(true);
    try {
      const data = await consumerDurableLoanService.closeLoan(loanId);
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ['activeLoans'] });
    } catch {
      Alert.alert('Closure failed', 'Please try again.');
    } finally {
      setClosing(false);
    }
  };

  if (loadingQuote) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Loan Closure" showBack />
        <View style={styles.center}><LoadingSpinner size={40} color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  // Post-closure confirmation
  if (result) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Loan Closed" showBack />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={48} color={Colors.textWhite} />
            </View>
            <Text style={styles.title}>Loan closed</Text>
            <Text style={styles.subtitle}>Your Consumer Durable Loan is fully repaid and closed.</Text>
          </View>

          <View style={styles.stepsCard}>
            {[
              ['Final EMI debited', result.finalEmiPaid],
              ['Loan marked closed', result.status === 'closed'],
              ['NOC generated', !!result.nocRef],
              ['NOC stored in AWS S3', !!result.nocS3Url],
              ['NACH mandate cancelled (Razorpay)', result.mandateCancelled],
              ['Customer notified', result.customerNotified],
            ].map(([label, done]) => (
              <View key={label as string} style={styles.stepRow}>
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={done ? Colors.success : Colors.textDisabled}
                />
                <Text style={styles.stepText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.key}>NOC reference</Text>
              <Text style={styles.value}>{result.nocRef}</Text>
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title="View NOC"
            onPress={() => router.push({ pathname: '/(main)/loan-detail/noc', params: { id: loanId } })}
          />
          <Pressable style={styles.link} onPress={() => router.replace('/(main)/(tabs)/loans')}>
            <Text style={styles.linkText}>Back to My Loans</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Pre-closure — foreclosure charge is 5% of principal outstanding + GST (spec 8).
  const quote = cdlForeclosureQuote(outstanding ?? 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Loan Closure" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total foreclosure amount</Text>
          <Text style={styles.amount}>
            {outstanding != null ? inr(quote.totalPayable) : '—'}
          </Text>
          <Text style={styles.amountSub}>Pay this amount to foreclose and close the loan.</Text>
        </View>

        {/* Foreclosure charge breakdown */}
        <View style={styles.card}>
          {[
            ['Principal outstanding', inr(quote.principalOutstanding)],
            [`Foreclosure charge (${Math.round(CDL_FORECLOSURE_RATE * 100)}%)`, inr(quote.foreclosureCharge)],
            [`GST (${Math.round(CDL_GST_RATE * 100)}%)`, inr(quote.gst)],
            ['Total payable', inr(quote.totalPayable)],
          ].map(([label, value], index, arr) => (
            <View key={label}>
              <View style={styles.row}>
                <Text style={styles.key}>{label}</Text>
                <Text style={[styles.value, index === arr.length - 1 && styles.valueEmphasis]}>{value}</Text>
              </View>
              {index < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.stepsCard}>
          {[
            'Collect the outstanding plus foreclosure charge + GST',
            'Mark the loan account closed',
            'Generate the NOC and store it in AWS S3',
            'Cancel the NACH mandate via Razorpay',
            'Notify the customer',
          ].map((step, index) => (
            <View key={step} style={styles.stepNumRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{index + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.agreeRow} onPress={() => setAgreed((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={12} color={Colors.textWhite} />}
          </View>
          <Text style={styles.agreeText}>I want to close this loan and cancel the auto-debit mandate.</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Pay & Close Loan" disabled={!agreed || closing} loading={closing} onPress={closeLoan} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  successCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  amountCard: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.xl },
  amountLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.78)' },
  amount: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], color: Colors.textWhite, marginVertical: 4 },
  amountSub: { ...Typography.caption, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  stepsCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  stepNumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: FontFamily.bold, color: Colors.primary, fontSize: FontSize.xs },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepText: { ...Typography.caption, color: Colors.textPrimary, flex: 1, lineHeight: 18 },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  valueEmphasis: { color: Colors.primary, fontSize: FontSize.base },
  divider: { height: 1, backgroundColor: Colors.border },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreeText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  link: { alignItems: 'center', paddingVertical: Spacing.sm },
  linkText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary },
});

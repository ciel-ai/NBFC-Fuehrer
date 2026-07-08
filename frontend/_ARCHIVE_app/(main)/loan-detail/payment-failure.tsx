import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { CdlPaymentFailure } from '@/src/entities/consumerDurableLoan';

export default function PaymentFailureScreen() {
  const { loanId, emiId } = useLocalSearchParams<{ loanId?: string; emiId?: string }>();
  const { consumerDurableLoanService } = useServices();
  const [failure, setFailure] = useState<CdlPaymentFailure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await consumerDurableLoanService.handlePaymentFailure(
          loanId ?? 'L1',
          emiId ?? 'e1',
        );
        if (mounted) setFailure(data);
      } catch {
        if (mounted) Alert.alert('Could not load failure status', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
  }, [consumerDurableLoanService, loanId, emiId]);

  if (loading || !failure) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Payment Failure" showBack />
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const steps = [
    { icon: 'close-circle' as const, color: Colors.error, title: 'NACH auto-debit failed', desc: failure.failureReason },
    { icon: 'refresh' as const, color: Colors.gold, title: 'Auto-retry initiated', desc: `Razorpay will retry on ${formatDate(failure.retryScheduledAt)}.` },
    { icon: 'notifications' as const, color: Colors.primary, title: 'Overdue alert sent', desc: 'Reminder delivered via AWS SNS (SMS + push).' },
    { icon: 'add-circle' as const, color: Colors.gold, title: 'Penalty added to next EMI', desc: `A 2% penalty of ${formatCurrency(failure.penalty)} is folded into your next EMI.` },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Payment Failure" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroCircle}>
            <Ionicons name="alert" size={42} color={Colors.textWhite} />
          </View>
          <Text style={styles.title}>EMI payment failed</Text>
          <Text style={styles.subtitle}>{failure.failureReason} via {failure.provider}.</Text>
        </View>

        <View style={styles.stepsCard}>
          {steps.map((s, i) => (
            <View key={s.title} style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: `${s.color}1A` }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.penaltyCard}>
          <Text style={styles.penaltyLabel}>Next EMI (incl. penalty)</Text>
          <Text style={styles.penaltyValue}>{formatCurrency(failure.nextEmiWithPenalty)}</Text>
          <Text style={styles.penaltyNote}>
            The {formatCurrency(failure.penalty)} penalty is added to the next EMI — not raised as a separate charge.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Pay Manually Now"
          onPress={() =>
            router.replace({
              pathname: '/(main)/loan-detail/pay-emi',
              params: { loanId: loanId ?? 'L1', emiId: failure.emiId },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  heroCircle: { width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.error, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  stepsCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  stepRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  stepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepInfo: { flex: 1 },
  stepTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  stepDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  penaltyCard: { backgroundColor: Colors.goldLight, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', gap: 4 },
  penaltyLabel: { ...Typography.caption, color: Colors.goldDark },
  penaltyValue: { fontFamily: FontFamily.bold, fontSize: FontSize['4xl'], color: Colors.goldDark },
  penaltyNote: { ...Typography.caption, color: Colors.goldDark, textAlign: 'center', lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

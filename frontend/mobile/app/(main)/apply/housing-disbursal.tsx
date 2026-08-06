import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
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
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useIdempotencyKey } from '@/src/core/api/idempotency';
import type { HousingDisbursalResult } from '@/src/entities/housingLoan';

export default function HousingDisbursalScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { housingLoanService } = useServices();
  const { getKey } = useIdempotencyKey();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<HousingDisbursalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const ranRef = useRef(false);

  const amount = Number(params.amount) || 0;
  const tenure = Number(params.tenure) || 20;
  const builderName = params.builderName || 'Builder';

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    let mounted = true;
    const run = async () => {
      try {
        const disbursal = await housingLoanService.disburseToBuilder(
          params.applicationId ?? 'hl_mock',
          { amount, builderName },
          getKey(),
        );
        await housingLoanService.activateLoan({
          loanAccountId: disbursal.loanAccountId,
          amount,
          tenure,
          builderName,
        });
        await queryClient.invalidateQueries({ queryKey: ['activeLoans'] });
        if (mounted) setStatus(disbursal);
      } catch {
        if (mounted) Alert.alert('Disbursal failed', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Disbursal" showBack={false} />
      {loading || !status ? (
        <View style={styles.center}>
          <LoadingSpinner size={42} color={Colors.primary} />
          <Text style={styles.loadingText}>Processing Razorpay payout to the builder…</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.successCard}>
              <View style={styles.successCircle}><Ionicons name="checkmark" size={44} color={Colors.textWhite} /></View>
              <Text style={styles.title}>Loan disbursed</Text>
              <Text style={styles.amount}>{formatCurrency(status.amount)}</Text>
              <Text style={styles.subtitle}>Paid to {status.builderName}</Text>
            </View>

            <View style={styles.card}>
              {[
                ['Loan account', status.loanAccountId],
                ['Payout ID', status.payoutId],
                ['Payout provider', 'Razorpay'],
                ['Builder', status.builderName],
                ['Builder account', status.builderAccount],
                ['Status', 'Completed'],
              ].map(([k, v], i, arr) => (
                <View key={k}>
                  <View style={styles.row}><Text style={styles.key}>{k}</Text><Text style={styles.value}>{v}</Text></View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <View style={styles.losBox}>
              <Ionicons name="checkmark-done" size={18} color={Colors.success} />
              <Text style={styles.losText}>
                Disbursal goes to the builder account, not yours. Your loan is now active with a {tenure}-year (240-EMI) schedule.
              </Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button
              title="Go to Loan Dashboard"
              onPress={() => router.replace({ pathname: '/(main)/loan-detail/[id]', params: { id: status.loanAccountId } })}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  loadingText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  successCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  successCircle: { width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary },
  amount: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  losBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.successLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  losText: { ...Typography.caption, color: Colors.success, flex: 1, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

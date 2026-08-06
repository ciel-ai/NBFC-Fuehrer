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
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useIdempotencyKey } from '@/src/core/api/idempotency';
import type { HousingPmaySubsidyResult } from '@/src/entities/housingLoan';

export default function HousingPmaySubsidyScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { housingLoanService } = useServices();
  const { getKey } = useIdempotencyKey();
  const amount = Number(params.amount) || 0;
  const [result, setResult] = useState<HousingPmaySubsidyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    housingLoanService
      .applyPmaySubsidy(params.applicationId ?? 'hl_mock', { loanAmount: amount }, getKey())
      .then((d) => { if (mounted) setResult(d); })
      .catch(() => { if (mounted) Alert.alert('Subsidy unavailable', 'Please try again.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housingLoanService]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="PMAY Subsidy" showBack />
      {loading || !result ? (
        <View style={styles.center}>
          <LoadingSpinner size={42} color={Colors.primary} />
          <Text style={styles.loadingText}>Applying for PMAY (CLSS) subsidy via NHB…</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}><Ionicons name="ribbon" size={32} color={Colors.gold} /></View>
              <Text style={styles.title}>Subsidy credited</Text>
              <Text style={styles.subsidyAmount}>{formatCurrency(result.subsidyAmount)}</Text>
              <Text style={styles.subtitle}>Credit-linked subsidy approved under PMAY and credited via NHB.</Text>
            </View>

            <View style={styles.card}>
              {[
                ['Original loan', formatCurrency(result.originalLoan)],
                ['PMAY subsidy', `– ${formatCurrency(result.subsidyAmount)}`],
                ['Effective loan burden', formatCurrency(result.effectiveLoanBurden)],
                ['NHB reference', result.nhbRef],
                ['Status', 'Credited'],
              ].map(([k, v], i, arr) => (
                <View key={k}>
                  <View style={styles.row}>
                    <Text style={styles.key}>{k}</Text>
                    <Text style={[styles.value, k === 'Effective loan burden' && { color: Colors.primary }]}>{v}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>
                The subsidy reduces your effective interest burden. Disbursal to the builder happens next — the full sanctioned amount is transferred.
              </Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button title="Continue to Disbursal" onPress={() => router.push({ pathname: '/(main)/apply/housing-disbursal', params })} />
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
  heroCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.goldLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary, textAlign: 'center' },
  subsidyAmount: { fontFamily: FontFamily.bold, fontSize: FontSize['4xl'], color: Colors.goldDark },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  infoText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

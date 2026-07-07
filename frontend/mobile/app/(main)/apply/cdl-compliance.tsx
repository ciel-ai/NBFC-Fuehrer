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
import { useServices } from '@/src/core/services/ServiceProvider';
import type { CdlComplianceResult, CdlVerificationCheck } from '@/src/entities/consumerDurableLoan';

const STATUS_META: Record<CdlVerificationCheck['status'], { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  passed: { label: 'Clear', color: Colors.success, icon: 'checkmark-circle' },
  pending: { label: 'Pending', color: Colors.textDisabled, icon: 'time-outline' },
  review: { label: 'Review', color: Colors.gold, icon: 'alert-circle' },
  failed: { label: 'Failed', color: Colors.error, icon: 'close-circle' },
};

const OVERALL_META = {
  passed: { title: 'Compliance cleared', color: Colors.success, bg: Colors.successLight, icon: 'shield-checkmark' as const },
  review: { title: 'Flagged for review', color: Colors.gold, bg: Colors.goldLight, icon: 'alert-circle' as const },
  failed: { title: 'Compliance failed', color: Colors.error, bg: Colors.errorLight, icon: 'close-circle' as const },
};

export default function CdlComplianceScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { consumerDurableLoanService } = useServices();
  const [result, setResult] = useState<CdlComplianceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await consumerDurableLoanService.runComplianceChecks(
          params.applicationId ?? 'cdl_mock_application',
        );
        if (mounted) setResult(data);
      } catch {
        if (mounted) Alert.alert('Compliance check failed', 'Please try again.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [consumerDurableLoanService, params.applicationId]);

  // Continue when passed OR flagged for review — only a hard fail blocks the journey.
  const canContinue = result?.overall === 'passed' || result?.overall === 'review';
  const overall = result ? OVERALL_META[result.overall] : null;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Compliance Screening" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-half" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Regulatory screening</Text>
          <Text style={styles.subtitle}>
            AML, PEP, defaulter and watchlist checks run via Perfios before credit assessment.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <LoadingSpinner size={34} color={Colors.primary} />
            <Text style={styles.loadingText}>Running AML, PEP, defaulter and alerts screening…</Text>
          </View>
        ) : (
          <>
            {overall && (
              <View style={[styles.overallCard, { backgroundColor: overall.bg }]}>
                <Ionicons name={overall.icon} size={22} color={overall.color} />
                <Text style={[styles.overallText, { color: overall.color }]}>{overall.title}</Text>
              </View>
            )}

            <View style={styles.card}>
              {result?.checks.map((check, index) => {
                const meta = STATUS_META[check.status];
                return (
                  <View key={check.label}>
                    <View style={styles.checkRow}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                      <View style={styles.checkInfo}>
                        <Text style={styles.checkLabel}>{check.label}</Text>
                        <Text style={styles.checkProvider}>{check.provider}</Text>
                      </View>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {index < result.checks.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Compliance screening is backend-owned. The app shows the outcome and blocks the journey only on a hard fail.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Submit Application"
          disabled={!canContinue}
          onPress={() =>
            router.replace({
              pathname: '/(main)/apply/application-submitted',
              params: {
                productName: params.productName ?? 'Consumer Durable Loan',
                loanAmount: params.loanAmount ?? params.amount ?? '',
              },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  loadingCard: { alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  loadingText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  overallCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, padding: Spacing.md },
  overallText: { fontFamily: FontFamily.bold, fontSize: FontSize.base },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  checkInfo: { flex: 1 },
  checkLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  checkProvider: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  statusText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  divider: { height: 1, backgroundColor: Colors.border },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  infoText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

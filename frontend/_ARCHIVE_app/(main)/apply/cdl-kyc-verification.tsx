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
import type { CdlKycResult, CdlVerificationCheck } from '@/src/entities/consumerDurableLoan';

const STATUS_META: Record<CdlVerificationCheck['status'], { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  passed: { label: 'Verified', color: Colors.success, icon: 'checkmark-circle' },
  pending: { label: 'Pending', color: Colors.textDisabled, icon: 'time-outline' },
  review: { label: 'Review', color: Colors.gold, icon: 'alert-circle' },
  failed: { label: 'Failed', color: Colors.error, icon: 'close-circle' },
};

export default function CdlKycVerificationScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { consumerDurableLoanService } = useServices();
  const [result, setResult] = useState<CdlKycResult | null>(null);
  const [applicationId, setApplicationId] = useState(params.applicationId ?? '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const app = await consumerDurableLoanService.submitApplication({
          productName: params.productName ?? 'Consumer Durable',
          amount: Number(params.loanAmount ?? 0),
          tenure: Number(params.tenure ?? 12),
          emi: Number(params.emi ?? 0),
          monthlyIncome: Number(params.monthlyIncome ?? 0),
          employmentType: params.employmentType,
        });
        if (!mounted) return;
        setApplicationId(app.applicationId);
        const kyc = await consumerDurableLoanService.runKycChecks(app.applicationId);
        if (mounted) setResult(kyc);
      } catch {
        if (mounted) Alert.alert('Verification failed', 'Please try again.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumerDurableLoanService]);

  const canContinue = result?.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <Header title="KYC Verification" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Verifying your identity</Text>
          <Text style={styles.subtitle}>
            We run Perfios identity checks before compliance and credit assessment.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <LoadingSpinner size={34} color={Colors.primary} />
            <Text style={styles.loadingText}>Running Aadhaar, PAN, liveness, face match and bank checks…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {result?.checks.map((check, index) => {
              const meta = STATUS_META[check.status];
              return (
                <View key={check.label}>
                  <View style={styles.checkRow}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                    <View style={styles.checkInfo}>
                      <Text style={styles.checkLabel}>{check.label}</Text>
                      <Text style={styles.checkProvider}>
                        {check.provider}{check.detail ? ` · ${check.detail}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  {index < result.checks.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Identity verification is provided by Perfios. We do not store your raw Aadhaar number.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue to Compliance"
          disabled={!canContinue}
          onPress={() =>
            router.push({
              pathname: '/(main)/apply/cdl-compliance',
              params: { ...params, applicationId },
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
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  loadingCard: {
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  checkInfo: { flex: 1 },
  checkLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  checkProvider: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  statusText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  divider: { height: 1, backgroundColor: Colors.border },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

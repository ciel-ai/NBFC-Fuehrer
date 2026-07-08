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
import type { HousingKycResult } from '@/src/entities/housingLoan';

function ApplicantCard({ title, result }: { title: string; result: HousingKycResult | null }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
        {result?.status === 'completed' && (
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.doneBadgeText}>Verified</Text>
          </View>
        )}
      </View>
      {!result ? (
        <View style={styles.loadingRow}>
          <LoadingSpinner size={22} color={Colors.primary} />
          <Text style={styles.loadingText}>Running Perfios checks…</Text>
        </View>
      ) : (
        result.checks.map((c, i) => (
          <View key={c.label}>
            <View style={styles.checkRow}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <View style={styles.checkInfo}>
                <Text style={styles.checkLabel}>{c.label}</Text>
                <Text style={styles.checkProvider}>{c.provider}{c.detail ? ` · ${c.detail}` : ''}</Text>
              </View>
            </View>
            {i < result.checks.length - 1 && <View style={styles.divider} />}
          </View>
        ))
      )}
    </View>
  );
}

export default function HousingKycScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { housingLoanService } = useServices();
  const hasCoApplicant = params.hasCoApplicant === '1';

  const [applicationId, setApplicationId] = useState(params.applicationId ?? '');
  const [primary, setPrimary] = useState<HousingKycResult | null>(null);
  const [coApplicant, setCoApplicant] = useState<HousingKycResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const app = await housingLoanService.submitApplication({
          amount: Number(params.amount ?? 0),
          tenure: Number(params.tenure ?? 20),
          propertyType: params.propertyType ?? 'apartment',
          hasCoApplicant,
          builderName: params.builderName,
          agreementValue: Number(params.agreementValue ?? 0),
          combinedIncome: Number(params.combinedIncome ?? 0),
        });
        if (!mounted) return;
        setApplicationId(app.applicationId);

        const p = await housingLoanService.runKyc(app.applicationId, 'primary');
        if (mounted) setPrimary(p);

        if (hasCoApplicant) {
          const c = await housingLoanService.runKyc(app.applicationId, 'co');
          if (mounted) setCoApplicant(c);
        }
      } catch {
        if (mounted) Alert.alert('KYC failed', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housingLoanService]);

  const canContinue =
    primary?.status === 'completed' && (!hasCoApplicant || coApplicant?.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      <Header title="KYC Verification" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={30} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Verifying identities</Text>
          <Text style={styles.subtitle}>
            {hasCoApplicant
              ? 'Both applicants are verified via Perfios — Aadhaar, PAN, face and bank account.'
              : 'Aadhaar, PAN, face and bank account verified via Perfios.'}
          </Text>
        </View>

        <ApplicantCard title="Primary Applicant" result={primary} />
        {hasCoApplicant && (
          <ApplicantCard title={params.coAppName ? `Co-Applicant · ${params.coAppName}` : 'Co-Applicant'} result={coApplicant} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue to Compliance"
          disabled={!canContinue || loading}
          onPress={() => router.push({ pathname: '/(main)/apply/housing-compliance', params: { ...params, applicationId } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, flex: 1 },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successLight, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  doneBadgeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.success },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  loadingText: { ...Typography.caption, color: Colors.textSecondary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  checkInfo: { flex: 1 },
  checkLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  checkProvider: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

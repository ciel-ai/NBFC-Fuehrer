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
import type { HousingComplianceResult } from '@/src/entities/housingLoan';

export default function HousingComplianceScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { housingLoanService } = useServices();
  const hasCoApplicant = params.hasCoApplicant === '1';
  const [result, setResult] = useState<HousingComplianceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await housingLoanService.runCompliance(params.applicationId ?? 'hl_mock');
        if (mounted) setResult(data);
      } catch {
        if (mounted) Alert.alert('Compliance check failed', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
  }, [housingLoanService, params.applicationId]);

  const canContinue = result?.overall === 'passed' || result?.overall === 'review';
  // Only show the co-applicant block when the application actually has one.
  const applicants = (result?.applicants ?? []).filter(
    (a) => a.applicant === 'primary' || hasCoApplicant,
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Compliance Screening" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-half" size={30} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Regulatory screening</Text>
          <Text style={styles.subtitle}>
            AML, PEP, defaulter and watchlist checks run via Perfios for {hasCoApplicant ? 'both applicants' : 'the applicant'}.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <LoadingSpinner size={32} color={Colors.primary} />
            <Text style={styles.loadingText}>Screening AML, PEP, defaulter and alerts…</Text>
          </View>
        ) : (
          applicants.map((a) => (
            <View key={a.applicant} style={styles.card}>
              <Text style={styles.cardTitle}>
                {a.applicant === 'primary' ? 'Primary Applicant' : (params.coAppName ? `Co-Applicant · ${params.coAppName}` : 'Co-Applicant')}
              </Text>
              {a.checks.map((c, i) => (
                <View key={c.label}>
                  <View style={styles.checkRow}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                    <View style={styles.checkInfo}>
                      <Text style={styles.checkLabel}>{c.label}</Text>
                      <Text style={styles.checkProvider}>{c.provider}</Text>
                    </View>
                    <Text style={styles.clear}>Clear</Text>
                  </View>
                  {i < a.checks.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue to Property & Credit Assessment"
          disabled={!canContinue}
          onPress={() => router.push({ pathname: '/(main)/apply/housing-assessment', params })}
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
  loadingCard: { alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  loadingText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: Spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  checkInfo: { flex: 1 },
  checkLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  checkProvider: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  clear: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.success },
  divider: { height: 1, backgroundColor: Colors.border },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

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
import type { GoldLoanComplianceResult } from '@/src/entities/goldLoan';

export default function GoldLoanComplianceScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { goldLoanService } = useServices();
  const [result, setResult] = useState<GoldLoanComplianceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await goldLoanService.runCompliance(params.applicationId ?? 'gold_mock_application');
        if (mounted) setResult(data);
      } catch {
        if (mounted) Alert.alert('Compliance check failed', 'Please try again.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [goldLoanService, params.applicationId]);

  const canContinue = result?.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Compliance Checks" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Risk screening in progress</Text>
          <Text style={styles.subtitle}>
            We verify regulatory checks before branch appraisal and disbursal.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <LoadingSpinner size={34} color={Colors.primary} />
            <Text style={styles.loadingText}>Running AML, PEP and alerts screening...</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {result?.checks.map((check, index) => (
              <View key={check.label}>
                <View style={styles.checkRow}>
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  </View>
                  <View style={styles.checkInfo}>
                    <Text style={styles.checkLabel}>{check.label}</Text>
                    <Text style={styles.checkProvider}>{check.provider}</Text>
                  </View>
                  <Text style={styles.doneText}>Clear</Text>
                </View>
                {index < result.checks.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            These checks are backend-owned. The mobile app only shows status and blocks the journey if a check fails.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue to Gold & Bank Details"
          disabled={!canContinue}
          onPress={() =>
            router.push({
              pathname: '/(main)/apply/gold-loan-ownership',
              params,
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
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.small,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  checkIcon: { width: 32, alignItems: 'center' },
  checkInfo: { flex: 1 },
  checkLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  checkProvider: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  doneText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.success },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

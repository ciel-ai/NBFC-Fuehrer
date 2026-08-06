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
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { resolveGoldApplicationId } from '@/src/core/utils/goldApplication';
import type { GoldLoanAppraisalResult } from '@/src/entities/goldLoan';

import { usePersistApplyStep } from '@/src/features/apply/useApplyDraft';

export default function GoldLoanAppraisalResultScreen() {
  usePersistApplyStep('gold');
  const params = useLocalSearchParams<Record<string, string>>();
  const { goldLoanService } = useServices();
  const applicationId = resolveGoldApplicationId(params.applicationId);
  const [result, setResult] = useState<GoldLoanAppraisalResult | null>(null);
  const [isLoading, setIsLoading] = useState(!!applicationId);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    let mounted = true;
    const load = async () => {
      try {
        const data = await goldLoanService.getAppraisalResult(applicationId);
        if (mounted) setResult(data);
      } catch {
        if (mounted) Alert.alert('Appraisal unavailable', 'Please try again later.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [goldLoanService, applicationId]);

  const accept = async () => {
    if (!result) return;
    setIsAccepting(true);
    try {
      await goldLoanService.acceptFinalLoanAmount(result.applicationId, result.finalLoanAmount);
      router.push({
        pathname: '/(main)/apply/gold-loan-agreement',
        params: {
          ...params,
          applicationId: result.applicationId,
          finalLoanAmount: String(result.finalLoanAmount),
        },
      });
    } catch {
      Alert.alert('Could not accept amount', 'Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (!applicationId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Appraisal Result" showBack />
        <ErrorView
          title="Application reference missing"
          message="We could not find your application reference. Please go back and restart the application."
          retryLabel="Go Back"
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Appraisal Result" showBack />
      {isLoading || !result ? (
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching branch appraisal result...</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Final eligible loan amount</Text>
              <Text style={styles.amount}>{formatCurrency(result.finalLoanAmount)}</Text>
              <Text style={styles.amountSub}>Locked after branch purity and weight assessment</Text>
            </View>

            <View style={styles.card}>
              {[
                ['Gross weight', `${result.grossWeight} g`],
                ['Net weight', `${result.netWeight} g`],
                ['Purity', result.purity],
                ['IBJA rate', `${formatCurrency(result.ratePerGram)} / g`],
                ['Assessed value', formatCurrency(result.assessedValue)],
                ['LTV', `${Math.round(result.ltvRatio * 100)}%`],
                ['Assessed by', result.appraiserName],
                ['Assessed on', formatDate(result.assessedAt)],
              ].map(([label, value], index, arr) => (
                <View key={label}>
                  <View style={styles.row}>
                    <Text style={styles.key}>{label}</Text>
                    <Text style={styles.value}>{value}</Text>
                  </View>
                  {index < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <View style={styles.photoCard}>
              <Text style={styles.sectionTitle}>Photo evidence</Text>
              <View style={styles.photoRow}>
                {result.photos.map((photo) => (
                  <View key={photo} style={styles.photoSlot}>
                    <Ionicons name="image-outline" size={22} color={Colors.primary} />
                    <Text style={styles.photoText}>{photo}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button title="Accept Final Amount" onPress={accept} loading={isAccepting} disabled={isAccepting} />
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
  amountCard: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  amountLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.78)' },
  amount: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], color: Colors.textWhite, marginVertical: 4 },
  amountSub: { ...Typography.caption, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    ...Shadow.small,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  photoCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  photoRow: { flexDirection: 'row', gap: Spacing.sm },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  photoText: { ...Typography.tiny, color: Colors.primary, textAlign: 'center' },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

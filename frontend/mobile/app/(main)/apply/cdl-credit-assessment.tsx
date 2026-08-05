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
import {
  CDL_CIBIL_AUTO_APPROVE,
  CDL_CIBIL_REVIEW_MIN,
  type CdlCreditAssessment,
} from '@/src/entities/consumerDurableLoan';

const FOIR_META = {
  passed: { label: 'Within limit', color: Colors.success, bg: Colors.successLight },
  flagged: { label: 'Above limit — review', color: Colors.gold, bg: Colors.goldLight },
  failed: { label: 'Breached — high risk', color: Colors.error, bg: Colors.errorLight },
};

export default function CdlCreditAssessmentScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { consumerDurableLoanService } = useServices();
  const [assessment, setAssessment] = useState<CdlCreditAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await consumerDurableLoanService.runCreditAssessment(
          params.applicationId ?? 'cdl_mock_application',
          {
            monthlyIncome: Number(params.monthlyIncome ?? 0),
            employmentType: params.employmentType ?? 'salaried',
            proposedEmi: Number(params.emi ?? 0),
            existingObligations: params.existingEmi ? Number(params.existingEmi) : undefined,
            loanAmount: Number(params.loanAmount ?? 0),
            dob: params.dob,
          },
        );
        if (mounted) setAssessment(data);
      } catch {
        if (mounted) Alert.alert('Assessment failed', 'Please try again.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
  }, [consumerDurableLoanService, params.applicationId, params.monthlyIncome, params.employmentType, params.emi]);

  const foirMeta = assessment ? FOIR_META[assessment.foirStatus] : null;
  const cibilColor = assessment
    ? assessment.cibilScore >= CDL_CIBIL_AUTO_APPROVE
      ? Colors.success
      : assessment.cibilScore >= CDL_CIBIL_REVIEW_MIN
        ? Colors.gold
        : Colors.error
    : Colors.textPrimary;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Credit Assessment" showBack />
      {isLoading || !assessment ? (
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
          <Text style={styles.loadingText}>Verifying employment, income and CIBIL score…</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* CIBIL */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>TransUnion CIBIL Score</Text>
              <Text style={[styles.scoreValue, { color: cibilColor }]}>{assessment.cibilScore}</Text>
              <Text style={styles.scoreRange}>Range 300–900</Text>
            </View>

            {/* Income & employment */}
            <View style={styles.card}>
              {[
                ['Employment', assessment.employmentVerified ? `${assessment.employmentType} · Verified` : assessment.employmentType],
                ['Annual income', formatCurrency(assessment.annualIncome)],
                ['Monthly income', formatCurrency(assessment.monthlyIncome)],
                ['Existing obligations', formatCurrency(assessment.existingObligations)],
                ['Proposed EMI', formatCurrency(assessment.proposedEmi)],
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

            {/* FOIR */}
            <View style={[styles.foirCard, { backgroundColor: foirMeta?.bg }]}>
              <View style={styles.foirHeader}>
                <Text style={styles.foirTitle}>FOIR</Text>
                <Text style={[styles.foirValue, { color: foirMeta?.color }]}>{assessment.foir}%</Text>
              </View>
              <View style={styles.foirBarTrack}>
                <View style={[styles.foirBarLimit, { left: `${assessment.foirLimit}%` }]} />
                <View
                  style={[
                    styles.foirBarFill,
                    { width: `${Math.min(assessment.foir, 100)}%`, backgroundColor: foirMeta?.color },
                  ]}
                />
              </View>
              <View style={styles.foirFooter}>
                <Text style={styles.foirHint}>Acceptable ≤ {assessment.foirLimit}%</Text>
                <Text style={[styles.foirStatus, { color: foirMeta?.color }]}>{foirMeta?.label}</Text>
              </View>
              <Text style={styles.foirFormula}>
                FOIR = (existing obligations + proposed EMI) ÷ monthly income
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>
                FOIR measures repayment capacity. A FOIR above the limit flags the application for agent review; a severe breach blocks it.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="View Credit Decision"
              onPress={() =>
                router.push({
                  pathname: '/(main)/apply/cdl-credit-decision',
                  params: {
                    ...params,
                    cibilScore: String(assessment.cibilScore),
                    foir: String(assessment.foir),
                    foirStatus: assessment.foirStatus,
                    monthlyIncome: String(assessment.monthlyIncome),
                    existingObligations: String(assessment.existingObligations),
                  },
                })
              }
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
  scoreCard: { alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  scoreLabel: { ...Typography.caption, color: Colors.textSecondary },
  scoreValue: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], marginVertical: 4 },
  scoreRange: { ...Typography.tiny, color: Colors.textDisabled },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1, textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: Colors.border },
  foirCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  foirHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foirTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary },
  foirValue: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'] },
  foirBarTrack: { height: 10, backgroundColor: Colors.background, borderRadius: 5, overflow: 'hidden', position: 'relative' },
  foirBarFill: { height: '100%', borderRadius: 5 },
  foirBarLimit: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: Colors.textPrimary, zIndex: 2 },
  foirFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foirHint: { ...Typography.tiny, color: Colors.textSecondary },
  foirStatus: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  foirFormula: { ...Typography.tiny, color: Colors.textSecondary, fontStyle: 'italic' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  infoText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

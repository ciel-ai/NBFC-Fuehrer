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
  ageFromDob,
  CDL_FOIR_MAX,
  type CdlCreditAssessment,
  type CdlCreditDecision,
} from '@/src/entities/consumerDurableLoan';

import { usePersistApplyStep } from '@/src/features/apply/useApplyDraft';

export default function CdlCreditDecisionScreen() {
  usePersistApplyStep('cdl');
  const params = useLocalSearchParams<Record<string, string>>();
  const { consumerDurableLoanService } = useServices();
  const [decision, setDecision] = useState<CdlCreditDecision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentApproved, setAgentApproved] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);

  const amount = Number(params.loanAmount ?? 0);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const assessment: CdlCreditAssessment = {
          applicationId: params.applicationId ?? 'cdl_mock_application',
          employmentVerified: true,
          employmentType: params.employmentType ?? 'salaried',
          annualIncome: Number(params.monthlyIncome ?? 0) * 12,
          monthlyIncome: Number(params.monthlyIncome ?? 0),
          cibilScore: Number(params.cibilScore ?? 0),
          existingObligations: Number(params.existingObligations ?? 0),
          proposedEmi: Number(params.emi ?? 0),
          foir: Number(params.foir ?? 0),
          foirLimit: CDL_FOIR_MAX,
          foirStatus: (params.foirStatus as CdlCreditAssessment['foirStatus']) ?? 'passed',
          age: params.dob ? ageFromDob(params.dob) : undefined,
          loanAmount: amount,
        };
        const data = await consumerDurableLoanService.getCreditDecision(
          assessment.applicationId,
          assessment,
        );
        if (mounted) setDecision({ ...data, approvedAmount: amount });
      } catch {
        if (mounted) Alert.alert('Decision unavailable', 'Please try again.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumerDurableLoanService]);

  const goToAgreement = () => {
    router.push({ pathname: '/(main)/apply/cdl-agreement', params });
  };

  const handleAgentApproval = async () => {
    setAgentLoading(true);
    try {
      await consumerDurableLoanService.submitAgentReviewDecision({
        applicationId: params.applicationId ?? 'cdl_mock_application',
        outcome: 'approved',
        note: 'Manual review cleared',
      });
      setAgentApproved(true);
    } catch {
      Alert.alert('Agent review failed', 'Please try again.');
    } finally {
      setAgentLoading(false);
    }
  };

  if (isLoading || !decision) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Credit Decision" showBack />
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
          <Text style={styles.loadingText}>Running the credit decision engine…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Credit Decision" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* APPROVED */}
        {decision.decision === 'approved' && (
          <View style={styles.heroCard}>
            <View style={[styles.heroCircle, { backgroundColor: Colors.success }]}>
              <Ionicons name="checkmark" size={48} color={Colors.textWhite} />
            </View>
            <Text style={styles.heroTitle}>Loan Approved</Text>
            <Text style={styles.heroAmount}>{formatCurrency(decision.approvedAmount)}</Text>
            <Text style={styles.heroSub}>Auto-approved by the credit decision engine.</Text>
          </View>
        )}

        {/* FLAGGED → agent review */}
        {decision.decision === 'flagged' && (
          <View style={styles.heroCard}>
            <View style={[styles.heroCircle, { backgroundColor: Colors.gold }]}>
              <Ionicons name={agentApproved ? 'checkmark' : 'time'} size={44} color={Colors.textWhite} />
            </View>
            <Text style={styles.heroTitle}>{agentApproved ? 'Agent Approved' : 'Under Agent Review'}</Text>
            <Text style={styles.heroSub}>
              {agentApproved
                ? 'A credit agent has reviewed and approved your application. You can now sign the agreement.'
                : 'Your application is in the manual-review band and needs a credit agent to approve it.'}
            </Text>
          </View>
        )}

        {/* REJECTED */}
        {decision.decision === 'rejected' && (
          <View style={styles.heroCard}>
            <View style={[styles.heroCircle, { backgroundColor: Colors.error }]}>
              <Ionicons name="close" size={48} color={Colors.textWhite} />
            </View>
            <Text style={styles.heroTitle}>Application Declined</Text>
            <Text style={styles.heroSub}>{decision.reason}</Text>
          </View>
        )}

        {/* Decision factors */}
        <View style={styles.card}>
          {[
            ['CIBIL score', String(decision.cibilScore)],
            ['FOIR', `${decision.foir}%`],
            ['Decision', decision.decision.toUpperCase()],
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

        <View style={styles.reasonBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.reasonText}>{decision.reason}</Text>
        </View>

        {/* Every rule that fired (4.1–4.4) */}
        {decision.reasons?.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.factorsTitle}>
              {decision.decision === 'approved' ? 'Criteria met' : 'Contributing factors'}
            </Text>
            {decision.reasons.map((r, i) => (
              <View key={i} style={styles.factorRow}>
                <Ionicons
                  name={decision.decision === 'approved' ? 'checkmark-circle' : 'ellipse'}
                  size={14}
                  color={
                    decision.decision === 'approved'
                      ? Colors.success
                      : decision.decision === 'rejected'
                        ? Colors.error
                        : Colors.gold
                  }
                  style={styles.factorIcon}
                />
                <Text style={styles.factorText}>{r}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {decision.decision === 'approved' && (
          <Button title="Continue to Loan Agreement" onPress={goToAgreement} />
        )}

        {decision.decision === 'flagged' && !agentApproved && (
          <Button
            title="Simulate Agent Approval"
            loading={agentLoading}
            disabled={agentLoading}
            onPress={handleAgentApproval}
          />
        )}
        {decision.decision === 'flagged' && agentApproved && (
          <Button title="Continue to Loan Agreement" onPress={goToAgreement} />
        )}

        {decision.decision === 'rejected' && (
          <Button
            title="Back to Home"
            onPress={() => router.replace('/(main)/(tabs)/home')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  loadingText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  heroCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary, textAlign: 'center' },
  heroAmount: { fontFamily: FontFamily.bold, fontSize: FontSize['4xl'], color: Colors.textPrimary },
  heroSub: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  reasonBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  reasonText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
  factorsTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, paddingTop: Spacing.md, paddingHorizontal: Spacing.md },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  factorIcon: { marginTop: 2 },
  factorText: { ...Typography.caption, flex: 1, color: Colors.textPrimary, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

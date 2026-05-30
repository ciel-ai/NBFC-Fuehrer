import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { ProgressChips } from '@/src/features/agent/components/ProgressChips';
import {
  StatusBadge,
  StatusTone,
} from '@/src/features/agent/components/StatusBadge';
import {
  ActionButtonRow,
  ActionItem,
} from '@/src/features/agent/components/ActionButtonRow';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { AgentReviewOutcome } from '@/src/entities/agent';

const STEPS = [
  { label: 'Income' },
  { label: 'CIBIL' },
  { label: 'Legal' },
  { label: 'Technical' },
  { label: 'Approve' },
];

interface ClearanceItem {
  id: string;
  label: string;
  detail: string;
  tone: StatusTone;
  status: string;
}

const CLEARANCES: ClearanceItem[] = [
  { id: 'income', label: 'Income verification', detail: 'Salary slips · ITR 2 yrs', tone: 'approved', status: 'Verified' },
  { id: 'cibil', label: 'CIBIL clearance', detail: 'Score 738 · Good', tone: 'approved', status: 'Cleared' },
  { id: 'cersai', label: 'CERSAI encumbrance', detail: 'Central registry check', tone: 'approved', status: 'No charge' },
  { id: 'legal', label: 'Legal clearance', detail: 'Title deed · Encumbrance cert.', tone: 'review', status: 'In review' },
  { id: 'tech', label: 'Technical valuation', detail: 'Property visit · Approved value ₹62L', tone: 'pending', status: 'Pending' },
  { id: 'pmay', label: 'PMAY eligibility', detail: 'MIG-1 subsidy', tone: 'notStarted', status: 'Not started' },
];

const MOCK_APPLICATION = {
  name: 'Vikas & Sneha Reddy',
  appId: 'LOS-HL-20512',
  requested: '₹52,00,000',
  tenure: '20 years',
  property: 'Whitefield · 2 BHK',
} as const;

export default function HousingReviewScreen() {
  const insets = useSafeAreaInsets();

  const { agentService } = useServices();

  const decide = async (outcome: AgentReviewOutcome) => {
    try {
      const res = await agentService.submitReviewDecision({
        queue: 'housing',
        applicationId: MOCK_APPLICATION.appId,
        outcome,
      });
      Alert.alert('Housing review', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Action failed', 'Could not record the decision. Please try again.');
    }
  };

  // design.md canonical order: less-committal → more-committal
  const actions: ActionItem[] = [
    { label: 'Reject', tone: 'reject', icon: 'close', onPress: () => decide('reject') },
    { label: 'Approve', tone: 'approve', icon: 'checkmark', onPress: () => decide('approve') },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Housing Loan Review" subtitle={MOCK_APPLICATION.appId} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <View style={styles.progressBar}>
          <ProgressChips steps={STEPS} activeIndex={2} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Applicant */}
          <AgentSection title="Applicants">
            <ReviewDetailRow label="Primary + co-applicant" value={MOCK_APPLICATION.name} />
            <ReviewDetailRow label="Requested" value={MOCK_APPLICATION.requested} />
            <ReviewDetailRow label="Tenure" value={MOCK_APPLICATION.tenure} />
            <ReviewDetailRow label="Property" value={MOCK_APPLICATION.property} divider={false} />
          </AgentSection>

          {/* Checklist */}
          <AgentSection title="Clearance checklist">
            {CLEARANCES.map((c, idx) => (
              <View
                key={c.id}
                style={[styles.clearRow, idx < CLEARANCES.length - 1 && styles.clearDivider]}
              >
                <View style={styles.clearInfo}>
                  <Text style={styles.clearLabel}>{c.label}</Text>
                  <Text style={styles.clearDetail}>{c.detail}</Text>
                </View>
                <StatusBadge tone={c.tone} label={c.status} />
              </View>
            ))}
          </AgentSection>

          {/* Upload */}
          <AgentSection title="Upload final certificates">
            <Pressable
              style={styles.uploadBox}
              android_ripple={{ color: `${Colors.primary}15` }}
              accessibilityRole="button"
              accessibilityLabel="Upload signed certificate"
            >
              <View style={styles.uploadIcon}>
                <Ionicons name="cloud-upload-outline" size={scale(22)} color={Colors.primary} />
              </View>
              <View style={styles.uploadText}>
                <Text style={styles.uploadTitle}>Upload signed certificate</Text>
                <Text style={styles.uploadHint}>PDF · max 5MB · legal + technical</Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
            </Pressable>
          </AgentSection>

          <ActionButtonRow actions={actions} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  progressBar: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  clearDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  clearInfo: { flex: 1 },
  clearLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  clearDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: verticalScale(64),
  },
  uploadIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: { flex: 1 },
  uploadTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  uploadHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

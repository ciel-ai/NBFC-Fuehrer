import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { scale } from '@/src/core/utils/responsive';
import { SUPPORT_PHONE } from '@/src/core/utils/constants';

type StageStatus = 'done' | 'current' | 'pending';

interface LoanStage {
  key: string;
  label: string;
  provider: string;
  icon: string;
  description: string;
  date?: string;
  status: StageStatus;
}

const STAGES: LoanStage[] = [
  {
    key: 'lead',
    label: 'Application Submitted',
    provider: 'Fuehrer NBFC',
    icon: 'document-text-outline',
    description: 'Your loan application has been received and is queued for review.',
    date: '12 May 2026, 10:32 AM',
    status: 'done',
  },
  {
    key: 'kyc',
    label: 'KYC Verification',
    provider: 'UIDAI · NSDL',
    icon: 'finger-print',
    description: 'Aadhaar and PAN verified. Selfie liveness check passed.',
    date: '12 May 2026, 11:05 AM',
    status: 'done',
  },
  {
    key: 'bureau',
    label: 'Credit Bureau Pull',
    provider: 'TransUnion CIBIL',
    icon: 'bar-chart-outline',
    description: 'Your CIBIL score has been fetched. Score: 742.',
    date: '12 May 2026, 11:08 AM',
    status: 'done',
  },
  {
    key: 'income',
    label: 'Income Assessment',
    provider: 'Perfios',
    icon: 'analytics-outline',
    description: 'Bank statements analysed. FOIR and income verified.',
    date: '13 May 2026',
    status: 'current',
  },
  {
    key: 'underwriting',
    label: 'Credit Underwriting',
    provider: 'Internal Engine',
    icon: 'shield-checkmark-outline',
    description: 'Risk scoring and loan eligibility determination.',
    status: 'pending',
  },
  {
    key: 'sanction',
    label: 'Sanction Letter',
    provider: 'eMudhra e-Sign',
    icon: 'document-outline',
    description: 'Sanction letter generated and e-signed.',
    status: 'pending',
  },
  {
    key: 'agreement',
    label: 'Loan Agreement',
    provider: 'NeSL Digital Stamp',
    icon: 'pencil-outline',
    description: 'Loan agreement stamped and executed.',
    status: 'pending',
  },
  {
    key: 'disbursement',
    label: 'Disbursement',
    provider: 'Razorpay Payout',
    icon: 'wallet-outline',
    description: 'Loan amount credited to your bank account.',
    status: 'pending',
  },
];

const STATUS_COLOR: Record<StageStatus, { dot: string; line: string; bg: string; text: string }> = {
  done:    { dot: Colors.success, line: Colors.success, bg: Colors.successLight, text: Colors.success },
  current: { dot: Colors.primary, line: Colors.border,  bg: Colors.primaryLight, text: Colors.primary },
  pending: { dot: Colors.border,  line: Colors.border,  bg: Colors.backgroundLight, text: Colors.textDisabled },
};

function StageRow({ stage, isLast }: { stage: LoanStage; isLast: boolean }) {
  const c = STATUS_COLOR[stage.status];

  return (
    <View style={styles.stageRow}>
      <View style={styles.timelineCol}>
        <View style={[styles.stageDot, { backgroundColor: c.dot }]}>
          {stage.status === 'done' && (
            <Ionicons name="checkmark" size={scale(10)} color={Colors.textWhite} />
          )}
          {stage.status === 'current' && (
            <View style={styles.stageDotInner} />
          )}
        </View>
        {!isLast && <View style={[styles.stageLine, { backgroundColor: c.line }]} />}
      </View>

      <View style={[styles.stageCard, { marginBottom: isLast ? 0 : Spacing.sm }]}>
        <View style={styles.stageHeader}>
          <View style={[styles.stageIconBg, { backgroundColor: c.bg }]}>
            <Ionicons name={stage.icon as any} size={scale(16)} color={c.dot} />
          </View>
          <View style={styles.stageInfo}>
            <Text style={styles.stageLabel}>{stage.label}</Text>
            <Text style={styles.stageProvider}>{stage.provider}</Text>
          </View>
          {stage.status === 'done' && (
            <View style={[styles.stageBadge, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.stageBadgeText, { color: Colors.success }]}>Done</Text>
            </View>
          )}
          {stage.status === 'current' && (
            <View style={[styles.stageBadge, { backgroundColor: Colors.primaryLight }]}>
              <Text style={[styles.stageBadgeText, { color: Colors.primary }]}>In Progress</Text>
            </View>
          )}
        </View>

        {(stage.status === 'done' || stage.status === 'current') && (
          <>
            <Text style={styles.stageDesc}>{stage.description}</Text>
            {stage.date && (
              <Text style={styles.stageDate}>{stage.date}</Text>
            )}
          </>
        )}

        {stage.status === 'pending' && (
          <Text style={styles.stagePending}>Waiting for previous steps to complete</Text>
        )}
      </View>
    </View>
  );
}

export default function LoanStatusScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const currentIdx = STAGES.findIndex((s) => s.status === 'current');
  const completedCount = STAGES.filter((s) => s.status === 'done').length;
  const progressPct = Math.round((completedCount / STAGES.length) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Loan Status" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryAmount}>₹5,00,000</Text>
              <Text style={styles.summaryType}>Consumer Durable Loan · LOS-20611</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: Colors.goldLight }]}>
              <View style={[styles.statusDot, { backgroundColor: Colors.goldDark }]} />
              <Text style={[styles.statusChipText, { color: Colors.goldDark }]}>In Review</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Application Progress</Text>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progressPct }]} />
              <View style={[styles.progressEmpty, { flex: 100 - progressPct }]} />
            </View>
            <Text style={styles.progressSub}>
              {completedCount} of {STAGES.length} steps completed
            </Text>
          </View>
        </View>

        <Text style={styles.timelineTitle}>Application Timeline</Text>

        <View style={styles.timeline}>
          {STAGES.map((stage, i) => (
            <StageRow key={stage.key} stage={stage} isLast={i === STAGES.length - 1} />
          ))}
        </View>

        <View style={styles.helpBox}>
          <Ionicons name="call-outline" size={scale(16)} color={Colors.primary} />
          <Text style={styles.helpText}>
            Questions? Call us at{' '}
            <Text style={styles.helpLink}>{SUPPORT_PHONE}</Text>
            {' '}(Mon–Sat, 9 AM–6 PM)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const DOT_SIZE = scale(24);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  summaryAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary,
  },
  summaryType: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },

  progressSection: { gap: Spacing.xs },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  progressPct: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  progressFill: { backgroundColor: Colors.primary },
  progressEmpty: { backgroundColor: Colors.border },
  progressSub: {
    ...Typography.tiny,
    color: Colors.textDisabled,
  },

  timelineTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  timeline: { gap: 0 },

  stageRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timelineCol: {
    alignItems: 'center',
    width: DOT_SIZE,
  },
  stageDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stageDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textWhite,
  },
  stageLine: {
    width: 2,
    flex: 1,
    minHeight: Spacing.md,
  },

  stageCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginLeft: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stageIconBg: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageInfo: { flex: 1 },
  stageLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  stageProvider: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  stageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  stageBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  stageDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  stageDate: {
    ...Typography.tiny,
    color: Colors.textDisabled,
    marginTop: 4,
  },
  stagePending: {
    ...Typography.tiny,
    color: Colors.textDisabled,
    fontStyle: 'italic',
  },

  helpBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  helpText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  helpLink: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
});

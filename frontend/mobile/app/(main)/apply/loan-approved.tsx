import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { StatusAnimation } from '@/src/shared/components/common/StatusAnimation';
import { scale } from '@/src/core/utils/responsive';

interface NextStep {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
  route: string;
  done: boolean;
}

const NEXT_STEPS: NextStep[] = [
  {
    key: 'esign',
    icon: 'pencil-outline',
    label: 'Sign Loan Agreement',
    subtitle: 'eSign via OTP — powered by eMudhra',
    route: '/(main)/apply/esign',
    done: false,
  },
  {
    key: 'enach',
    icon: 'repeat-outline',
    label: 'Set Up Auto-Debit',
    subtitle: 'eNACH mandate for EMI auto-payment',
    route: '/(main)/apply/enach',
    done: false,
  },
  {
    key: 'disburse',
    icon: 'wallet-outline',
    label: 'Receive Disbursement',
    subtitle: 'Amount credited to your bank account',
    route: '',
    done: false,
  },
];

export default function LoanApprovedScreen() {
  const { amount, loanType, tenure, emi } = useLocalSearchParams<{
    amount?: string;
    loanType?: string;
    tenure?: string;
    emi?: string;
  }>();

  const loanAmount = amount ?? '₹5,00,000';
  const loanEMI = emi ?? '₹9,800';
  const loanTenure = tenure ?? '12 months';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <StatusAnimation
            name="loanApproved"
            size={scale(132)}
            accessibilityLabel="Loan approved"
          />
          <Text style={styles.heroTitle}>Loan Approved!</Text>
          <Text style={styles.heroSubtitle}>
            Congratulations! Your loan application has been approved. Complete the steps below to receive your funds.
          </Text>
        </View>

        <View style={styles.loanCard}>
          <View style={styles.loanCardTop}>
            <View style={styles.approvedBadge}>
              <View style={styles.approvedDot} />
              <Text style={styles.approvedBadgeText}>Approved</Text>
            </View>
            <Text style={styles.loanAmount}>{loanAmount}</Text>
            <Text style={styles.loanTypeText}>{loanType ?? 'Consumer Durable Loan'}</Text>
          </View>
          <View style={styles.loanCardMeta}>
            <View style={styles.loanMetaItem}>
              <Text style={styles.loanMetaKey}>Monthly EMI</Text>
              <Text style={styles.loanMetaVal}>{loanEMI}</Text>
            </View>
            <View style={styles.loanMetaDivider} />
            <View style={styles.loanMetaItem}>
              <Text style={styles.loanMetaKey}>Tenure</Text>
              <Text style={styles.loanMetaVal}>{loanTenure}</Text>
            </View>
            <View style={styles.loanMetaDivider} />
            <View style={styles.loanMetaItem}>
              <Text style={styles.loanMetaKey}>Interest</Text>
              <Text style={styles.loanMetaVal}>14% p.a.</Text>
            </View>
          </View>
        </View>

        <View style={styles.stepsSection}>
          <Text style={styles.stepsTitle}>Complete to Receive Funds</Text>
          <View style={styles.stepsList}>
            {NEXT_STEPS.map((step, i) => (
              <View key={step.key} style={styles.stepItem}>
                <View style={styles.stepTimelineCol}>
                  <View style={[styles.stepBullet, step.done && styles.stepBulletDone]}>
                    {step.done ? (
                      <Ionicons name="checkmark" size={scale(12)} color={Colors.textWhite} />
                    ) : (
                      <Text style={styles.stepBulletNum}>{i + 1}</Text>
                    )}
                  </View>
                  {i < NEXT_STEPS.length - 1 && <View style={styles.stepConnector} />}
                </View>

                <Pressable
                  style={[styles.stepCard, step.done && styles.stepCardDone]}
                  onPress={() => step.route && router.push(step.route as any)}
                  disabled={!step.route || step.done}
                  accessibilityRole="button"
                  accessibilityLabel={step.label}
                >
                  <View style={[styles.stepIconBg, step.done && styles.stepIconBgDone]}>
                    <Ionicons
                      name={step.icon as any}
                      size={scale(18)}
                      color={step.done ? Colors.success : Colors.primary}
                    />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                  </View>
                  {step.route && !step.done && (
                    <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
                  )}
                  {step.done && (
                    <Ionicons name="checkmark-circle" size={scale(20)} color={Colors.success} />
                  )}
                  {!step.route && !step.done && (
                    <View style={styles.pendingChip}>
                      <Text style={styles.pendingChipText}>Soon</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="time-outline" size={scale(18)} color={Colors.goldDark} />
          <Text style={styles.infoText}>
            Disbursement typically takes 1–2 business days after eSign and eNACH are completed.
          </Text>
        </View>

        <Button
          title="Sign Loan Agreement Now"
          onPress={() => router.push('/(main)/apply/esign')}
        />

        <Pressable
          style={styles.statusLink}
          onPress={() => router.push('/(main)/loan-detail/status')}
          accessibilityRole="button"
          accessibilityLabel="View application status"
        >
          <Text style={styles.statusLinkText}>View Application Status</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const CIRCLE = scale(120);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },

  content: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  heroSection: { alignItems: 'center', gap: Spacing.md },
  heroCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRing: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  loanCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  loanCardTop: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  approvedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  approvedBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textWhite,
  },
  loanAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['5xl'],
    color: Colors.textWhite,
  },
  loanTypeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.8)',
  },
  loanCardMeta: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  loanMetaItem: { flex: 1, alignItems: 'center' },
  loanMetaKey: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  loanMetaVal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textWhite,
    marginTop: 2,
  },
  loanMetaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  stepsSection: { gap: Spacing.md },
  stepsTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  stepsList: { gap: 0 },
  stepItem: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 0 },
  stepTimelineCol: { alignItems: 'center', width: scale(32) },
  stepBullet: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBulletDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepBulletNum: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    minHeight: Spacing.sm,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  stepCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  stepCardDone: { backgroundColor: Colors.successLight },
  stepIconBg: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconBgDone: { backgroundColor: Colors.successLight },
  stepInfo: { flex: 1 },
  stepLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  stepSubtitle: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pendingChip: {
    backgroundColor: Colors.goldLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  pendingChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.goldDark,
  },

  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    ...Typography.caption,
    color: Colors.goldDark,
    flex: 1,
    lineHeight: 18,
  },

  statusLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statusLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

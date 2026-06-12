import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import type { Loan, ApplicationStatus, LoanType } from '@/src/entities/loan';

interface ActiveLoanCardProps {
  loan: Loan;
  onPayEMI?: () => void;
  onPress?: () => void;
}

const STEPS = [
  { key: 'applied', label: 'Applied' },
  { key: 'approved', label: 'Approved' },
  { key: 'repayment', label: 'Repayment' },
] as const;

const LOAN_TYPE_ICON: Record<LoanType, keyof typeof Ionicons.glyphMap> = {
  consumer_durable: 'phone-portrait',
  affordable_housing: 'business',
  gold_loan: 'diamond',
};

const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  consumer_durable: 'Consumer Durable',
  affordable_housing: 'Home Loan',
  gold_loan: 'Gold Loan',
};

function getStepState(stepIndex: number, status: ApplicationStatus) {
  const currentIndex = STEPS.findIndex((s) => s.key === status);
  return {
    completed: stepIndex <= currentIndex,
    active: stepIndex === currentIndex,
  };
}

interface DaysChipTone {
  bg: string;
  fg: string;
  label: string;
}

function getDueChip(daysUntilDue: number): DaysChipTone {
  if (daysUntilDue < 0) {
    return { bg: 'rgba(239,68,68,0.18)', fg: '#FECACA', label: `${Math.abs(daysUntilDue)}d overdue` };
  }
  if (daysUntilDue === 0) {
    return { bg: 'rgba(245,158,11,0.22)', fg: '#FDE68A', label: 'Due today' };
  }
  if (daysUntilDue <= 3) {
    return { bg: 'rgba(245,158,11,0.22)', fg: '#FDE68A', label: `Due in ${daysUntilDue}d` };
  }
  if (daysUntilDue <= 7) {
    return { bg: 'rgba(255,255,255,0.18)', fg: Colors.textWhite, label: `Due in ${daysUntilDue}d` };
  }
  return { bg: 'rgba(16,185,129,0.20)', fg: '#A7F3D0', label: `Due in ${daysUntilDue}d` };
}

function getDaysUntilDue(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ActiveLoanCard({ loan, onPayEMI, onPress }: ActiveLoanCardProps) {
  const inRepayment = loan.applicationStatus === 'repayment';

  // EMIs paid approximation — sufficient for at-a-glance display.
  const totalEmis = loan.tenure;
  const principalPaid = Math.max(0, loan.amount - loan.outstandingAmount);
  const emisPaid = Math.min(totalEmis, Math.round(principalPaid / Math.max(loan.emi, 1)));
  const progressPct = totalEmis > 0 ? Math.round((emisPaid / totalEmis) * 100) : 0;

  const daysUntilDue = getDaysUntilDue(loan.nextDueDate);
  const dueChip = getDueChip(daysUntilDue);
  const typeIcon = LOAN_TYPE_ICON[loan.type];
  const typeLabel = LOAN_TYPE_LABEL[loan.type];

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push(`/(main)/loan-detail/${loan.id}` as `/(main)/loan-detail/${string}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel}, EMI ${formatCurrency(loan.emi)} per month, ${dueChip.label}`}
    >
      {/* Decorative blob — pure-View, no SVG */}
      <View style={styles.decor} pointerEvents="none" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.labelText}>ACTIVE LOAN · EMI</Text>
          <Text style={styles.emiAmount}>
            {formatCurrency(loan.emi)}
            <Text style={styles.perMonth}> / month</Text>
          </Text>
          <Text style={styles.subMeta}>
            {typeLabel} · {formatCurrency(loan.outstandingAmount, { compact: true })} outstanding
          </Text>
        </View>
        <View
          style={styles.bankIcon}
          accessible
          accessibilityLabel={`${typeLabel} icon`}
        >
          <Ionicons name={typeIcon} size={scale(22)} color="rgba(255,255,255,0.85)" />
        </View>
      </View>

      {inRepayment ? (
        /* Repayment progress — actually useful for active loans */
        <View style={styles.progressBlock}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressLabel}>
              {emisPaid} of {totalEmis} EMIs paid
            </Text>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { flex: Math.max(progressPct, 1) }]} />
            <View style={[styles.progressEmpty, { flex: Math.max(100 - progressPct, 0) }]} />
          </View>
        </View>
      ) : (
        /* Pre-disbursement stepper — Applied → Approved → Repayment */
        <View style={styles.progressContainer}>
          {STEPS.map((step, index) => {
            const { completed, active } = getStepState(index, loan.applicationStatus);
            const nextCompleted = index < STEPS.length - 1
              ? getStepState(index + 1, loan.applicationStatus).completed
              : false;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      completed && styles.stepDotCompleted,
                      active && styles.stepDotActive,
                    ]}
                  >
                    {completed && !active ? <View style={styles.stepDotInner} /> : null}
                  </View>
                  <Text style={[styles.stepLabel, completed && styles.stepLabelActive]}>
                    {step.label}
                  </Text>
                </View>
                {index < STEPS.length - 1 ? (
                  <View style={styles.connectorWrapper}>
                    <View
                      style={[
                        styles.connectorSegment,
                        { backgroundColor: completed ? Colors.textWhite : 'rgba(255,255,255,0.2)' },
                      ]}
                    />
                    <View
                      style={[
                        styles.connectorSegment,
                        { backgroundColor: nextCompleted ? Colors.textWhite : 'rgba(255,255,255,0.2)' },
                      ]}
                    />
                  </View>
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={[styles.dueChip, { backgroundColor: dueChip.bg }]}>
            <Ionicons
              name={daysUntilDue < 0 ? 'warning' : 'time-outline'}
              size={scale(12)}
              color={dueChip.fg}
            />
            <Text style={[styles.dueChipText, { color: dueChip.fg }]}>{dueChip.label}</Text>
          </View>
          <Text style={styles.dueDate}>{formatDate(loan.nextDueDate)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.payButton, pressed && styles.payButtonPressed]}
          onPress={(e) => {
            e.stopPropagation();
            onPayEMI?.();
          }}
          android_ripple={{ color: `${Colors.primary}20` }}
          accessibilityRole="button"
          accessibilityLabel={`Pay EMI of ${formatCurrency(loan.emi)} for loan ${loan.id}`}
          hitSlop={6}
        >
          <Text style={styles.payButtonText}>Pay EMI</Text>
          <Ionicons name="arrow-forward" size={scale(14)} color={Colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.large,
  },
  pressed: {
    opacity: 0.92,
  },
  decor: {
    position: 'absolute',
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
    right: -scale(60),
    bottom: -scale(80),
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  labelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
  },
  emiAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.textWhite,
    marginTop: 2,
  },
  perMonth: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.75)',
  },
  subMeta: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  bankIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress bar (repayment view)
  progressBlock: {
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  progressPct: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.textWhite,
  },
  progressTrack: {
    flexDirection: 'row',
    height: verticalScale(6),
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressFill: {
    backgroundColor: Colors.textWhite,
  },
  progressEmpty: {
    backgroundColor: 'transparent',
  },

  // Stepper (pre-disbursement view)
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    borderColor: Colors.textWhite,
    backgroundColor: Colors.textWhite,
  },
  stepDotActive: {
    borderColor: Colors.textWhite,
    backgroundColor: Colors.textWhite,
  },
  stepDotInner: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: Colors.primary,
  },
  stepLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.55)',
  },
  stepLabelActive: {
    color: Colors.textWhite,
    fontFamily: FontFamily.semiBold,
  },
  connectorWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: 2,
    marginBottom: verticalScale(16),
  },
  connectorSegment: {
    flex: 1,
    height: 2,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  footerLeft: {
    flex: 1,
    gap: 4,
  },
  dueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  dueChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  dueDate: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.textWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    minHeight: verticalScale(40),
  },
  payButtonPressed: {
    opacity: 0.85,
  },
  payButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
});

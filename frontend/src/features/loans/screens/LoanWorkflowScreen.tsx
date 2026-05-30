import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { useKycAnalytics } from '@/src/features/kyc/analytics/useKycAnalytics';
import { KycStep } from '@/src/entities/kyc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'gold' | 'lap';

interface WorkflowStep {
  title: string;
  subtitle: string;
  details: string[];
  isDisbursal?: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const GOLD_LOAN_STEPS: WorkflowStep[] = [
  {
    title: 'Apply online or walk in',
    subtitle: 'Fill form \u00B7 book branch appointment',
    details: [
      'Age 21\u201370 yrs',
      'Indian citizen',
      'Any KYC doc',
      'Gold coins (\u226450 g) accepted',
    ],
  },
  {
    title: 'Gold appraisal at branch',
    subtitle: 'Purity (18\u201322 karat) & weight assessed',
    details: ['Certified appraiser', 'On-the-spot valuation'],
  },
  {
    title: 'Loan offer',
    subtitle: 'Up to 75% of gold value',
    details: [
      '\u20B95,000 to \u20B92 crore',
      'Interest from 9.50% p.a.',
    ],
  },
  {
    title: 'KYC documentation',
    subtitle: 'Any 1 ID proof required',
    details: ['Aadhaar / PAN / Passport / Voter ID'],
  },
  {
    title: 'Gold pledged and stored',
    subtitle: 'Free insurance \u00B7 secured vault',
    details: [
      'Gold insured at no extra cost',
      'Held in secured branch vault',
    ],
  },
  {
    title: 'Loan disbursal',
    subtitle: 'Same-day credit to bank account',
    details: ['Amount credited within hours of approval'],
    isDisbursal: true,
  },
  {
    title: 'Repayment',
    subtitle: 'Flexible interest payment schedule',
    details: [
      'Monthly / bi-monthly / quarterly / half-yearly / annual options',
    ],
    isDisbursal: true,
  },
  {
    title: 'Gold returned',
    subtitle: 'After full repayment or foreclosure',
    details: [
      'Collect gold from branch',
      'Foreclosure allowed anytime',
    ],
    isDisbursal: true,
  },
];

const LAP_STEPS: WorkflowStep[] = [
  {
    title: 'Online application',
    subtitle: 'Fill form \u00B7 OTP verify \u00B7 submit',
    details: [
      'Salaried 21\u201385 yrs',
      'Self-employed 25\u201385 yrs',
      'CIBIL score > 700',
    ],
  },
  {
    title: 'Document submission',
    subtitle: 'KYC \u00B7 income proof \u00B7 property papers',
    details: [
      'Aadhaar / PAN',
      'Salary slips 3 mo.',
      'Bank stmts 6 mo.',
      'ITR / Form 16',
      'Title deeds',
      'Approved plan',
      'No-encumbrance certificate',
    ],
  },
  {
    title: 'Document verification',
    subtitle: 'Personal \u00B7 income \u00B7 employment details',
    details: [
      'Lender verifies all docs',
      'Doorstep pickup available',
    ],
  },
  {
    title: 'Property valuation',
    subtitle: 'Market value & legal title check',
    details: [
      'Residential and commercial property accepted',
      'Independent valuation',
    ],
  },
  {
    title: 'Loan offer',
    subtitle: 'Up to 60\u201370% LTV \u00B7 max \u20B910.50 Cr',
    details: [
      'Interest from 10.10% p.a.',
      'Tenure up to 15 years',
    ],
  },
  {
    title: 'Sanction and agreement',
    subtitle: 'Sanction letter issued \u00B7 agreement signed',
    details: [
      'Review all terms before signing',
      'Processing fee applicable',
    ],
  },
  {
    title: 'Property mortgage',
    subtitle: 'Property registered as collateral',
    details: [
      'Mortgage deed executed',
      'Registered with sub-registrar',
    ],
  },
  {
    title: 'Loan disbursal',
    subtitle: 'Funds credited \u00B7 ~3 working days',
    details: [
      'Direct bank transfer',
      'Confirmation SMS sent',
    ],
    isDisbursal: true,
  },
  {
    title: 'EMI repayment',
    subtitle: 'Monthly EMI or Flexi overdraft',
    details: [
      'Part-prepayment allowed',
      'Flexi loan lets you withdraw repaid amount',
    ],
    isDisbursal: true,
  },
];

interface ComparisonRow {
  label: string;
  gold: string;
  lap: string;
}

const COMPARISON: ComparisonRow[] = [
  { label: 'Disbursal', gold: 'Same day', lap: '~3 working days' },
  { label: 'Documentation', gold: 'Minimal docs', lap: 'Detailed docs' },
  { label: 'Collateral', gold: 'Gold', lap: 'Property' },
  { label: 'Max Amount', gold: '\u20B92 Cr', lap: '\u20B910.50 Cr' },
];

// ---------------------------------------------------------------------------
// Step Card component — expand/collapse animated with Reanimated
// ---------------------------------------------------------------------------

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  accentColor: string;
}

const DETAIL_MAX_HEIGHT = 300;
const TIMING_CONFIG = { duration: 220 };

function StepCard({
  step,
  index,
  isLast,
  isExpanded,
  onToggle,
  accentColor,
}: StepCardProps) {
  const detailsHeight = useSharedValue(isExpanded ? DETAIL_MAX_HEIGHT : 0);
  const detailsOpacity = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    detailsHeight.value = withTiming(isExpanded ? DETAIL_MAX_HEIGHT : 0, TIMING_CONFIG);
    detailsOpacity.value = withTiming(isExpanded ? 1 : 0, TIMING_CONFIG);
  }, [isExpanded]);

  const detailsAnimStyle = useAnimatedStyle(() => ({
    maxHeight: detailsHeight.value,
    opacity: detailsOpacity.value,
    overflow: 'hidden',
  }));

  const borderLeftColor = step.isDisbursal ? Colors.success : accentColor;

  return (
    <View style={styles.stepWrapper}>
      {!isLast && (
        <View style={styles.connectorWrapper}>
          <View style={styles.connectorLine} />
        </View>
      )}

      <Pressable
        style={[styles.stepCard, { borderLeftColor, borderLeftWidth: 3 }]}
        onPress={onToggle}
        android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={`Step ${index + 1}: ${step.title}. ${step.subtitle}. ${isExpanded ? 'Collapse' : 'Expand'} details`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.stepHeader}>
          <View style={[styles.badge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
          <View style={styles.stepTitleBlock}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
          </View>
        </View>

        <Animated.View style={[styles.detailsList, detailsAnimStyle]}>
          {step.details.map((detail) => (
            <View key={detail} style={styles.detailRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen — tab switch animated with Reanimated
// ---------------------------------------------------------------------------

export default function LoanWorkflowScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('gold');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { trackStepViewed } = useKycAnalytics();

  React.useEffect(() => {
    trackStepViewed(KycStep.LOAN_WORKFLOW);
  }, [trackStepViewed]);

  const stepsOpacity = useSharedValue(1);
  const stepsAnimStyle = useAnimatedStyle(() => ({ opacity: stepsOpacity.value }));

  const steps = activeTab === 'gold' ? GOLD_LOAN_STEPS : LAP_STEPS;
  const accentColor = activeTab === 'gold' ? Colors.gold : Colors.purple;

  const applyTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setExpandedIndex(null);
  }, []);

  const switchTab = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return;
      // Reanimated 4: animation callbacks run on JS thread — runOnJS not needed
      stepsOpacity.value = withTiming(0, { duration: 130 }, () => {
        applyTab(tab);
        stepsOpacity.value = withTiming(1, { duration: 200 });
      });
    },
    [activeTab, applyTab],
  );

  const toggleStep = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Loan Workflow" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Tab switcher ── */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'gold' && styles.tabActive]}
            onPress={() => switchTab('gold')}
            android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'gold' }}
            accessibilityLabel="Gold Loan"
          >
            <Text style={[styles.tabLabel, activeTab === 'gold' && styles.tabLabelActive]}>
              Gold Loan
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'lap' && styles.tabActive]}
            onPress={() => switchTab('lap')}
            android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'lap' }}
            accessibilityLabel="Loan Against Property"
          >
            <Text style={[styles.tabLabel, activeTab === 'lap' && styles.tabLabelActive]}>
              Loan Against Property
            </Text>
          </Pressable>
        </View>

        {/* ── Workflow steps ── */}
        <Animated.View style={[styles.stepsContainer, stepsAnimStyle]}>
          {steps.map((step, i) => (
            <StepCard
              key={`${activeTab}-${i}`}
              step={step}
              index={i}
              isLast={i === steps.length - 1}
              isExpanded={expandedIndex === i}
              onToggle={() => toggleStep(i)}
              accentColor={accentColor}
            />
          ))}
        </Animated.View>

        {/* ── Comparison banner ── */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Quick Comparison</Text>

          <View style={styles.comparisonHeaderRow}>
            <View style={styles.comparisonLabelCol} />
            <Text style={styles.comparisonColHeader}>Gold Loan</Text>
            <Text style={styles.comparisonColHeader}>LAP</Text>
          </View>

          {COMPARISON.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.comparisonRow,
                i < COMPARISON.length - 1 && styles.comparisonDivider,
              ]}
            >
              <Text style={styles.comparisonLabel}>{row.label}</Text>
              <Text style={styles.comparisonValue}>{row.gold}</Text>
              <Text style={styles.comparisonValue}>{row.lap}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BADGE_SIZE = 26;
const BADGE_CENTER_X = Spacing.md + BADGE_SIZE / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },

  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.textWhite,
  },

  stepsContainer: {
    marginBottom: Spacing.xl,
  },
  stepWrapper: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  connectorWrapper: {
    position: 'absolute',
    top: 0,
    bottom: -Spacing.lg,
    left: BADGE_CENTER_X - 1 + 3,
    width: 2,
    zIndex: -1,
  },
  connectorLine: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    borderStyle: 'dashed',
  },

  stepCard: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.textWhite,
  },
  stepTitleBlock: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 2,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  detailsList: {
    marginTop: Spacing.sm,
    marginLeft: BADGE_SIZE + Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  bullet: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
    lineHeight: 20,
  },
  detailText: {
    ...Typography.label,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
    letterSpacing: 0,
  },

  comparisonCard: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  comparisonTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  comparisonLabelCol: {
    flex: 1.2,
  },
  comparisonColHeader: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  comparisonDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  comparisonLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    flex: 1.2,
    letterSpacing: 0,
  },
  comparisonValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },

  bottomPad: { height: Spacing.xl },
});

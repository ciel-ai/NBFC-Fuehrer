import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, Shadow } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { useUserStore } from '@/src/store/userStore';
import { useLoanStore } from '@/src/store/loanStore';
import { useKycStore } from '@/src/store/kycStore';
import { KycStatus } from '@/src/entities/kyc';
import type { LoanStatus } from '@/src/entities/loan';
import { SUPPORT_PHONE } from '@/src/core/utils/constants';
import { useCustomerApplyDraft } from '@/src/features/apply/useApplyDraft';

const ANDROID_STATUS_PAD =
  Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0;

type Href = Parameters<typeof router.push>[0];
const go = (route: string) => router.push(route as Href);

const callSupport = () =>
  Alert.alert('Support', `Call us at ${SUPPORT_PHONE}`);

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const HERO_FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'flash-outline', label: 'Instant approval' },
  { icon: 'time-outline', label: '30 sec process' },
  { icon: 'shield-checkmark-outline', label: 'Zero impact on credit score' },
];

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  accent: string;
  route?: string;
  onPress?: () => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'emi', label: 'EMI Calculator', icon: 'calculator-outline', tint: Colors.primaryLight, accent: Colors.primary, route: '/(main)/calculator' },
  { id: 'pay', label: 'Pay EMI', icon: 'wallet-outline', tint: Colors.tealLight, accent: Colors.teal, route: '/(main)/(tabs)/loans' },
  { id: 'track', label: 'Track Loan', icon: 'document-text-outline', tint: Colors.purpleLight, accent: Colors.purple, route: '/(main)/(tabs)/loans' },
  { id: 'support', label: 'Support', icon: 'headset-outline', tint: Colors.errorLight, accent: Colors.error, onPress: callSupport },
];

interface Product {
  id: string;
  title: string;
  amount: string;
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  accent: string;
  badgeBg: string;
  badgeColor: string;
  route: string;
}

const RECOMMENDED: Product[] = [
  { id: 'cdl', title: 'CDL Loan', amount: 'Up to ₹3,00,000', badge: 'Instant approval', icon: 'bag-handle', tint: Colors.primaryLight, accent: Colors.primary, badgeBg: Colors.primaryLight, badgeColor: Colors.primary, route: '/(main)/apply/consumer-durable' },
  { id: 'gold', title: 'Gold Loan', amount: 'Up to ₹5,00,000', badge: 'Interest from 0.88%/mo', icon: 'diamond', tint: Colors.goldLight, accent: Colors.goldDark, badgeBg: Colors.goldLight, badgeColor: Colors.goldDark, route: '/(main)/apply/gold-loan' },
  { id: 'ahl', title: 'AHL Loan', amount: 'Up to ₹50,00,000', badge: 'Interest from 8.40% p.a.', icon: 'home', tint: Colors.tealLight, accent: Colors.teal, badgeBg: Colors.successLight, badgeColor: Colors.success, route: '/(main)/apply/affordable-housing' },
];

type StepState = 'done' | 'active' | 'pending';
interface Step {
  label: string;
  sub: string;
  state: StepState;
}

const STEP_LABELS = [
  'Application Submitted',
  'Documents Verified',
  'Approval in Progress',
  'Disbursal Soon',
] as const;

/** Map the latest loan's status to how many tracker steps are complete. */
function loanStatusProgress(status?: LoanStatus): number {
  switch (status) {
    case 'applied':
      return 1;
    case 'under_review':
      return 2;
    case 'approved':
      return 3;
    case 'disbursed':
    case 'active':
    case 'closed':
      return 4;
    default:
      // 'rejected' / undefined — no forward progress on this tracker.
      return 0;
  }
}

/**
 * Derive the application-tracker steps from real verification + loan state.
 * A brand-new user (no application yet) sits on step 1 with nothing completed.
 */
function buildSteps(args: {
  started: boolean;
  kycVerified: boolean;
  loanStatus?: LoanStatus;
}): Step[] {
  let completed = 0;
  if (args.started) completed = 1; // step 1: application submitted
  if (completed >= 1 && args.kycVerified) completed = 2; // step 2: documents verified
  completed = Math.max(completed, loanStatusProgress(args.loanStatus));
  completed = Math.min(completed, STEP_LABELS.length);

  const active = completed < STEP_LABELS.length ? completed : -1;

  return STEP_LABELS.map((label, i) => {
    const state: StepState =
      i < completed ? 'done' : i === active ? 'active' : 'pending';
    const sub =
      state === 'done'
        ? 'Completed'
        : state === 'active'
        ? args.started
          ? 'Current step'
          : 'Not started'
        : 'Pending';
    return { label, sub, state };
  });
}

const RESOURCES: { id: string; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap; tint: string; accent: string; route: string }[] = [
  { id: 'faq', label: 'Frequently asked questions', sub: 'Answers to common loan queries', icon: 'help-circle-outline', tint: Colors.primaryLight, accent: Colors.primary, route: '/(main)/profile/help-support' },
  { id: 'guide', label: 'How to apply for a loan', sub: 'A quick step-by-step guide', icon: 'book-outline', tint: Colors.purpleLight, accent: Colors.purple, route: '/(main)/apply/loan-products' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={action}>
        <Text style={styles.sectionAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

/** Decorative money-bag illustration built from views (no image assets). */
function MoneyBag() {
  return (
    <View style={styles.bagWrap} pointerEvents="none">
      <View style={[styles.coin, styles.coinTop]}>
        <Text style={styles.coinText}>₹</Text>
      </View>
      <View style={[styles.coin, styles.coinFront]}>
        <Text style={styles.coinText}>₹</Text>
      </View>
      <View style={styles.bagNeck} />
      <View style={styles.bag}>
        <Text style={styles.bagRupee}>₹</Text>
      </View>
    </View>
  );
}

function QuickActionTile({ item }: { item: QuickAction }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.qaTile, pressed && styles.pressed]}
      onPress={() => (item.route ? go(item.route) : item.onPress?.())}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.qaIcon, { backgroundColor: item.tint }]}>
        <Ionicons name={item.icon} size={scale(22)} color={item.accent} />
      </View>
      <Text style={styles.qaLabel} numberOfLines={2}>{item.label}</Text>
    </Pressable>
  );
}

function ProductCard({ item }: { item: Product }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.prodCard, { backgroundColor: item.tint }, pressed && styles.pressed]}
      onPress={() => go(item.route)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.amount}`}
    >
      <View style={styles.prodIcon}>
        <Ionicons name={item.icon} size={scale(30)} color={item.accent} />
      </View>
      <Text style={styles.prodTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.prodAmount} numberOfLines={1}>{item.amount}</Text>
      <View style={[styles.prodBadge, { backgroundColor: item.badgeBg }]}>
        <Text style={[styles.prodBadgeText, { color: item.badgeColor }]} numberOfLines={1}>
          {item.badge}
        </Text>
      </View>
    </Pressable>
  );
}

function StepCircle({ state, index }: { state: StepState; index: number }) {
  if (state === 'done') {
    return (
      <View style={[styles.stepCircle, styles.stepDone]}>
        <Ionicons name="checkmark" size={scale(14)} color={Colors.textWhite} />
      </View>
    );
  }
  if (state === 'active') {
    return (
      <View style={[styles.stepCircle, styles.stepActive]}>
        <View style={styles.stepActiveInner} />
      </View>
    );
  }
  return (
    <View style={[styles.stepCircle, styles.stepPending]}>
      <Text style={styles.stepNum}>{index + 1}</Text>
    </View>
  );
}

function Stepper({ steps }: { steps: Step[] }) {
  const last = steps.length - 1;
  return (
    <View style={styles.stepper}>
      {steps.map((step, i) => {
        const leftFilled = i > 0 && steps[i - 1].state === 'done';
        const rightFilled = step.state === 'done';
        return (
          <View key={step.label} style={styles.stepCol}>
            <View style={styles.stepCircleRow}>
              <View style={[styles.halfLine, i === 0 && styles.lineHidden, leftFilled && styles.lineFilled]} />
              <StepCircle state={step.state} index={i} />
              <View style={[styles.halfLine, i === last && styles.lineHidden, rightFilled && styles.lineFilled]} />
            </View>
            <Text style={styles.stepLabel} numberOfLines={2}>{step.label}</Text>
            <Text style={[styles.stepDate, step.state === 'active' && styles.stepDateActive]} numberOfLines={1}>
              {step.sub}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** "Resume application" card — shown only when a killed flow left a draft. */
function ResumeCard() {
  const { draft, resume, discard } = useCustomerApplyDraft();
  if (!draft) return null;
  return (
    <View style={styles.section}>
      <View style={styles.resumeCard}>
        <View style={styles.resumeIcon}>
          <Ionicons name="hourglass-outline" size={scale(22)} color={Colors.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.resumeTitle}>Resume your application</Text>
          <Text style={styles.resumeSub} numberOfLines={1}>{draft.label}</Text>
        </View>
        <View style={styles.resumeActions}>
          <Pressable
            onPress={resume}
            style={({ pressed }) => [styles.resumeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Resume application"
          >
            <Text style={styles.resumeBtnText}>Resume</Text>
          </Pressable>
          <Pressable
            onPress={() => void discard()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Discard saved application"
          >
            <Ionicons name="close" size={scale(18)} color={Colors.textDisabled} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);
  const activeLoans = useLoanStore((s) => s.activeLoans);
  const applicationStatus = useLoanStore((s) => s.applicationStatus);
  const kycStatus = useKycStore((s) => s.status);

  // Tracker reflects real verification / loan progress. A new user with no
  // application sits on step 1 with nothing completed ("Not started").
  const steps = useMemo(() => {
    const latestLoan = activeLoans[0];
    return buildSteps({
      started: !!latestLoan || applicationStatus != null,
      kycVerified: kycStatus === KycStatus.COMPLETED,
      loanStatus: latestLoan?.status,
    });
  }, [activeLoans, applicationStatus, kycStatus]);

  const hasUnread = true; // TODO(owner, blocked-on-backend 2026-07-08): wire to a notifications store once the API exposes unread counts
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const topPad = (Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_PAD) + Spacing.sm;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName[0]?.toUpperCase() ?? 'A'}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName} numberOfLines={1}>{firstName}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => go('/(main)/notifications')}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={scale(22)} color={Colors.textPrimary} />
              {hasUnread && <View style={styles.bellDot} />}
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={callSupport}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Support"
            >
              <Ionicons name="headset-outline" size={scale(22)} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Hero — eligibility card */}
        <View style={styles.hero}>
          <View style={styles.heroCircle1} pointerEvents="none" />
          <View style={styles.heroCircle2} pointerEvents="none" />
          <MoneyBag />

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>Get loan up to</Text>
            <Text style={styles.heroAmount}>₹5,00,000</Text>

            <View style={styles.featureRow}>
              {HERO_FEATURES.map((f, i) => (
                <React.Fragment key={f.label}>
                  {i > 0 && <View style={styles.featureDivider} />}
                  <View style={styles.feature}>
                    <Ionicons name={f.icon} size={scale(16)} color={Colors.primary} />
                    <Text style={styles.featureText}>{f.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.heroBtn, pressed && styles.pressed]}
              onPress={() => go('/(main)/apply/eligibility-pan')}
              accessibilityRole="button"
              accessibilityLabel="Check eligibility"
            >
              <Text style={styles.heroBtnText}>Check Eligibility</Text>
              <Ionicons name="arrow-forward" size={scale(16)} color={Colors.textWhite} />
            </Pressable>

            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark" size={scale(14)} color={Colors.success} />
              <Text style={styles.trustText}>Trusted by 10L+ customers</Text>
            </View>
          </View>
        </View>

        {/* Resume in-flight application (only renders when a draft exists) */}
        <ResumeCard />

        {/* Quick Actions */}
        <View style={styles.section}>
          {/* Was the CDL product catalogue, which no longer exists — the
              customer enters their own product now. Points at the loan
              products list, which is what "view all" meant to offer. */}
          <SectionHeader title="Quick Actions" action="View all" onAction={() => go('/(main)/apply/loan-products')} />
          <View style={styles.qaRow}>
            {QUICK_ACTIONS.map((item) => (
              <QuickActionTile key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* Customer loan choices */}
        <View style={styles.section}>
          <SectionHeader title="Choose your loan" action="View all" onAction={() => go('/(main)/apply/loan-products')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.prodScroll}
          >
            {RECOMMENDED.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </View>

        {/* Track your application */}
        <View style={styles.section}>
          <SectionHeader title="Track your application" action="View all" onAction={() => go('/(main)/(tabs)/loans')} />
          <View style={styles.trackCard}>
            <Stepper steps={steps} />
          </View>
        </View>

        {/* Exclusive offers banner */}
        <Pressable
          style={({ pressed }) => [styles.offerBanner, pressed && styles.pressed]}
          onPress={() => go('/(main)/apply/loan-products')}
          accessibilityRole="button"
          accessibilityLabel="View exclusive offers"
        >
          <View style={styles.offerIcon}>
            <Ionicons name="gift" size={scale(26)} color={Colors.purple} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.offerTitle}>Exclusive offers for you!</Text>
            <Text style={styles.offerSub} numberOfLines={2}>
              Pre-approved offers with low interest rates & fast disbursal.
            </Text>
          </View>
          <View style={styles.offerBtn}>
            <Text style={styles.offerBtnText}>View Offers</Text>
            <Ionicons name="arrow-forward" size={scale(13)} color={Colors.purple} />
          </View>
        </Pressable>

        {/* Helpful resources */}
        <View style={styles.section}>
          <SectionHeader title="Helpful resources" action="View all" onAction={() => go('/(main)/profile/help-support')} />
          <View style={styles.resourceCard}>
            {RESOURCES.map((item, i) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.resourceRow, i > 0 && styles.resourceBorder, pressed && styles.pressed]}
                onPress={() => go(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={[styles.resourceIcon, { backgroundColor: item.tint }]}>
                  <Ionicons name={item.icon} size={scale(20)} color={item.accent} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.resourceLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.resourceSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const CARD_RADIUS = scale(18);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex1: { flex: 1 },
  pressed: { opacity: 0.75 },
  scrollContent: { paddingBottom: verticalScale(24) },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(14),
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
    marginRight: scale(12),
  },
  avatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textWhite,
  },
  greeting: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  iconBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: scale(8),
    right: scale(9),
    width: scale(9),
    height: scale(9),
    borderRadius: scale(4.5),
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.backgroundLight,
  },

  // Hero
  hero: {
    marginHorizontal: scale(20),
    marginTop: verticalScale(4),
    backgroundColor: Colors.cardBackground,
    borderRadius: scale(22),
    overflow: 'hidden',
    ...Shadow.small,
  },
  heroCircle1: {
    position: 'absolute',
    width: scale(170),
    height: scale(170),
    borderRadius: scale(85),
    backgroundColor: 'rgba(26,86,219,0.06)',
    top: -scale(60),
    right: -scale(50),
  },
  heroCircle2: {
    position: 'absolute',
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: 'rgba(26,86,219,0.05)',
    bottom: -scale(40),
    right: scale(30),
  },
  heroContent: { padding: scale(18), paddingRight: scale(110) },
  heroEyebrow: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  heroAmount: {
    fontFamily: FontFamily.bold,
    fontSize: scale(34),
    color: Colors.textPrimary,
    marginTop: verticalScale(2),
    marginBottom: verticalScale(14),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(16),
  },
  feature: { flex: 1, alignItems: 'flex-start', gap: verticalScale(4), paddingRight: scale(6) },
  featureDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
    marginRight: scale(8),
  },
  featureText: {
    fontFamily: FontFamily.regular,
    fontSize: scale(11),
    color: Colors.textSecondary,
    lineHeight: scale(15),
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(22),
    paddingVertical: verticalScale(13),
    borderRadius: scale(14),
    ...Shadow.medium,
  },
  heroBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textWhite,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(14),
  },
  trustText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Money bag illustration
  bagWrap: {
    position: 'absolute',
    right: scale(18),
    top: 0,
    bottom: 0,
    width: scale(96),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bag: {
    width: scale(66),
    height: scale(62),
    borderRadius: scale(20),
    borderBottomLeftRadius: scale(30),
    borderBottomRightRadius: scale(30),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.medium,
  },
  bagNeck: {
    width: scale(34),
    height: scale(14),
    borderTopLeftRadius: scale(8),
    borderTopRightRadius: scale(8),
    backgroundColor: Colors.primaryDark,
    marginBottom: -scale(3),
    zIndex: 1,
  },
  bagRupee: {
    fontFamily: FontFamily.bold,
    fontSize: scale(30),
    color: Colors.textWhite,
  },
  coin: {
    position: 'absolute',
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.goldDark,
  },
  coinTop: { top: scale(8), right: scale(2) },
  coinFront: { bottom: scale(6), left: scale(4) },
  coinText: {
    fontFamily: FontFamily.bold,
    fontSize: scale(13),
    color: Colors.textWhite,
  },

  // Resume application card
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginHorizontal: scale(20),
    backgroundColor: Colors.primaryLight,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: scale(14),
  },
  resumeIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(13),
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  resumeSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  resumeActions: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  resumeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
  },
  resumeBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: scale(12),
    color: Colors.textWhite,
  },

  // Sections
  section: { marginTop: verticalScale(22) },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  sectionAction: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  // Quick actions
  qaRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    gap: scale(10),
  },
  qaTile: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(6),
    alignItems: 'center',
    gap: verticalScale(8),
    ...Shadow.small,
  },
  qaIcon: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontFamily: FontFamily.medium,
    fontSize: scale(11),
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // Recommended products
  prodScroll: {
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  prodCard: {
    width: scale(150),
    borderRadius: CARD_RADIUS,
    padding: scale(14),
  },
  prodIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  prodTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  prodAmount: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: verticalScale(10),
  },
  prodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  prodBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: scale(10),
  },

  // Track application
  trackCard: {
    marginHorizontal: scale(20),
    backgroundColor: Colors.background,
    borderRadius: CARD_RADIUS,
    paddingVertical: verticalScale(18),
    paddingHorizontal: scale(8),
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  stepper: { flexDirection: 'row' },
  stepCol: { flex: 1, alignItems: 'center' },
  stepCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  halfLine: { flex: 1, height: scale(2), backgroundColor: Colors.border },
  lineHidden: { backgroundColor: 'transparent' },
  lineFilled: { backgroundColor: Colors.primary },
  stepCircle: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { backgroundColor: Colors.primary },
  stepActive: {
    backgroundColor: Colors.background,
    borderWidth: scale(2.5),
    borderColor: Colors.primary,
  },
  stepActiveInner: {
    width: scale(11),
    height: scale(11),
    borderRadius: scale(6),
    backgroundColor: Colors.primary,
  },
  stepPending: { backgroundColor: Colors.backgroundLight, borderWidth: 1.5, borderColor: Colors.border },
  stepNum: {
    fontFamily: FontFamily.semiBold,
    fontSize: scale(12),
    color: Colors.textDisabled,
  },
  stepLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: scale(10.5),
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: verticalScale(8),
    paddingHorizontal: scale(2),
  },
  stepDate: {
    fontFamily: FontFamily.regular,
    fontSize: scale(10),
    color: Colors.textSecondary,
    marginTop: verticalScale(3),
  },
  stepDateActive: { fontFamily: FontFamily.semiBold, color: Colors.primary },

  // Offers banner
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginHorizontal: scale(20),
    marginTop: verticalScale(22),
    backgroundColor: Colors.purpleLight,
    borderRadius: CARD_RADIUS,
    padding: scale(16),
  },
  offerIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  offerSub: {
    fontFamily: FontFamily.regular,
    fontSize: scale(11.5),
    color: Colors.textSecondary,
    marginTop: 2,
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: Colors.background,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  offerBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: scale(11),
    color: Colors.purple,
  },

  // Helpful resources
  resourceCard: {
    marginHorizontal: scale(20),
    backgroundColor: Colors.background,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(14),
  },
  resourceBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  resourceIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  resourceSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  bottomPad: { height: verticalScale(8) },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  StatusBar,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { AgentReviewOutcome } from '@/src/entities/agent';

// ---------------------------------------------------------------------------
// Sparkline (polyline via rotated Views — no SVG dependency)
// ---------------------------------------------------------------------------

const SPARK_PTS = [
  { x: 0, y: 25 },
  { x: 20, y: 22 },
  { x: 40, y: 28 },
  { x: 60, y: 15 },
  { x: 80, y: 18 },
  { x: 100, y: 5 },
];

function Sparkline({ color = Colors.success }: { color?: string }) {
  const [w, setW] = useState(0);
  const h = scale(40);
  const maxX = 100;
  const maxY = 30;

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View style={{ height: h }} onLayout={onLayout}>
      {w > 0 &&
        SPARK_PTS.slice(0, -1).map((p1, i) => {
          const p2 = SPARK_PTS[i + 1];
          const x1 = (p1.x / maxX) * w;
          const y1 = (p1.y / maxY) * h;
          const x2 = (p2.x / maxX) * w;
          const y2 = (p2.y / maxY) * h;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: (x1 + x2) / 2 - len / 2,
                top: (y1 + y2) / 2 - 1,
                width: len,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
          );
        })}
      {w > 0 && (() => {
        const last = SPARK_PTS[SPARK_PTS.length - 1];
        const px = (last.x / maxX) * w;
        const py = (last.y / maxY) * h;
        return (
          <View
            style={{
              position: 'absolute',
              left: px - scale(3),
              top: py - scale(3),
              width: scale(6),
              height: scale(6),
              borderRadius: scale(3),
              backgroundColor: color,
            }}
          />
        );
      })()}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const APPLICANT = {
  name: 'Arun Mehta',
  appId: 'LOS-CR-20611',
  loanAmount: '₹ 5,00,000',
  tenure: '24 Months',
  emi: '₹ 24,500',
  cibil: 742,
  employer: 'TCS Limited',
  employment: 'Salaried',
  since: 'Since 2018',
  foirPct: 42,
  emiObligation: '₹ 38,000',
  grossIncome: '₹ 90,000',
};

const ITR_ROWS = [
  { fy: '2023-24', gross: '₹ 10,80,000', tax: '₹ 42,500' },
  { fy: '2022-23', gross: '₹ 9,50,000', tax: '₹ 38,200' },
  { fy: '2021-22', gross: '₹ 8,75,000', tax: '₹ 32,000' },
];

const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' as const, iconActive: 'grid' as const },
  { id: 'los', label: 'LOS', icon: 'document-text-outline' as const, iconActive: 'document-text' as const },
  { id: 'lms', label: 'LMS', icon: 'cash-outline' as const, iconActive: 'cash' as const },
  { id: 'profile', label: 'Profile', icon: 'person-outline' as const, iconActive: 'person' as const },
];

const ANDROID_STATUS_PAD = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreditReviewScreen() {
  const insets = useSafeAreaInsets();

  const { agentService } = useServices();

  const decide = async (outcome: AgentReviewOutcome) => {
    try {
      const res = await agentService.submitReviewDecision({
        queue: 'credit',
        applicationId: APPLICANT.appId,
        outcome,
      });
      Alert.alert('Credit review', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Action failed', 'Could not record the decision. Please try again.');
    }
  };

  const bottomBarHeight = insets.bottom + scale(130);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: ANDROID_STATUS_PAD + Spacing.sm }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.back()}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={scale(22)} color={Colors.textWhite} />
            </Pressable>

            <Text style={styles.headerTitle}>Credit Review</Text>

            <View style={styles.headerRight}>
              <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Search">
                <Ionicons name="search-outline" size={scale(20)} color={Colors.textWhite} />
              </Pressable>
              <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="More options">
                <Ionicons name="ellipsis-vertical" size={scale(20)} color={Colors.textWhite} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: bottomBarHeight + Spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Loan Request Summary Card */}
        <View style={styles.loanCard}>
          <View style={styles.loanCardInner}>
            <View style={styles.loanLeft}>
              <Text style={styles.loanLabel}>LOAN REQUEST</Text>
              <Text style={styles.loanAmount}>{APPLICANT.loanAmount}</Text>
              <View style={styles.loanMeta}>
                <View style={styles.loanMetaItem}>
                  <Text style={styles.loanMetaLabel}>Tenure</Text>
                  <Text style={styles.loanMetaValue}>{APPLICANT.tenure}</Text>
                </View>
                <View style={styles.loanMetaDivider} />
                <View style={styles.loanMetaItem}>
                  <Text style={styles.loanMetaLabel}>EMI</Text>
                  <Text style={styles.loanMetaValue}>{APPLICANT.emi}</Text>
                </View>
              </View>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet-outline" size={scale(28)} color={Colors.textWhite} />
            </View>
          </View>
          {/* Decorative circle */}
          <View style={styles.loanDecor} />
        </View>

        {/* CIBIL + Employment Bento */}
        <View style={styles.bento}>
          {/* CIBIL Score */}
          <View style={[styles.bentoCard, styles.bentoHalf]}>
            <Text style={styles.bentoTitle}>CIBIL SCORE</Text>
            <View style={styles.cibilRow}>
              <Text style={styles.cibilScore}>{APPLICANT.cibil}</Text>
              <Text style={styles.cibilLabel}>Excellent</Text>
            </View>
            <Sparkline color={Colors.success} />
          </View>

          {/* Employment */}
          <View style={[styles.bentoCard, styles.bentoHalf]}>
            <Text style={styles.bentoTitle}>EMPLOYMENT</Text>
            <View style={styles.empBadge}>
              <Text style={styles.empBadgeText}>{APPLICANT.employment}</Text>
            </View>
            <Text style={styles.empSince}>{APPLICANT.since}</Text>
            <View style={styles.empEmployer}>
              <Text style={styles.empEmployerLabel}>Employer</Text>
              <Text style={styles.empEmployerName}>{APPLICANT.employer}</Text>
            </View>
          </View>
        </View>

        {/* FOIR Calculator */}
        <View style={styles.card}>
          <View style={styles.foirHeader}>
            <Text style={styles.cardTitle}>FOIR Calculator</Text>
            <View style={styles.foirPctRow}>
              <Text style={styles.foirPct}>{APPLICANT.foirPct}%</Text>
              <Text style={styles.foirPctLabel}>FOIR</Text>
            </View>
          </View>
          <View style={styles.foirTrack}>
            <View style={[styles.foirFill, { flex: APPLICANT.foirPct }]} />
            <View style={[styles.foirRemainder, { flex: 100 - APPLICANT.foirPct }]} />
          </View>
          <View style={styles.foirMeta}>
            <Text style={styles.foirMetaText}>EMI Obligation: {APPLICANT.emiObligation}</Text>
            <Text style={styles.foirMetaText}>Gross Income: {APPLICANT.grossIncome}</Text>
          </View>
        </View>

        {/* ITR Summary Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderTitle}>ITR SUMMARY (LAST 3 YEARS)</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Download ITR summary">
              <Ionicons name="download-outline" size={scale(20)} color={Colors.primary} />
            </Pressable>
          </View>
          {/* Column headers */}
          <View style={[styles.tableRow, styles.tableColHeader]}>
            <Text style={[styles.tableColText, styles.colFy]}>FY</Text>
            <Text style={[styles.tableColText, styles.colGross]}>Gross Total</Text>
            <Text style={[styles.tableColText, styles.colTax]}>Tax Paid</Text>
          </View>
          {ITR_ROWS.map((row, idx) => (
            <View
              key={row.fy}
              style={[styles.tableRow, idx < ITR_ROWS.length - 1 && styles.tableBorder]}
            >
              <Text style={[styles.tableCell, styles.tableCellBold, styles.colFy]}>{row.fy}</Text>
              <Text style={[styles.tableCell, styles.colGross]}>{row.gross}</Text>
              <Text style={[styles.tableCell, styles.tableCellSuccess, styles.colTax]}>{row.tax}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed bottom: action bar + bottom nav */}
      <View style={[styles.bottomFixed, { paddingBottom: insets.bottom }]}>
        {/* Action bar */}
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.actionBtn, styles.actionOutline]}
            onPress={() => decide('request_docs')}
            android_ripple={{ color: `${Colors.primary}15` }}
            accessibilityRole="button"
            accessibilityLabel="Request additional documents"
          >
            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Request Docs</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionOutlineError]}
            onPress={() => decide('reject')}
            android_ripple={{ color: `${Colors.error}15` }}
            accessibilityRole="button"
            accessibilityLabel="Reject credit application"
          >
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionFilled, { flex: 1.5 }]}
            onPress={() => decide('approve')}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            accessibilityRole="button"
            accessibilityLabel="Approve credit application"
          >
            <Ionicons name="checkmark-circle-outline" size={scale(16)} color={Colors.textWhite} />
            <Text style={[styles.actionBtnText, { color: Colors.textWhite }]}>Approve</Text>
          </Pressable>
        </View>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          {NAV_TABS.map((tab) => {
            const isActive = tab.id === 'los';
            return (
              <Pressable
                key={tab.id}
                style={styles.navItem}
                onPress={() => tab.id === 'dashboard' && router.push('/(main)/agent/dashboard')}
                android_ripple={{ color: `${Colors.primary}15`, borderless: true, radius: 36 }}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                {isActive ? (
                  <View style={styles.navPill}>
                    <Ionicons name={tab.iconActive} size={scale(20)} color="#001e30" />
                    <Text style={styles.navLabelActive}>{tab.label}</Text>
                  </View>
                ) : (
                  <View style={styles.navItemInner}>
                    <Ionicons name={tab.icon} size={scale(22)} color={Colors.textSecondary} />
                    <Text style={styles.navLabel}>{tab.label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FF' },
  flex: { flex: 1 },

  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    ...Shadow.medium,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: verticalScale(44),
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textWhite,
    flex: 1,
    marginLeft: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Loan card
  loanCard: {
    backgroundColor: '#1a3fd8',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.medium,
  },
  loanCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loanLeft: { flex: 1 },
  loanLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  loanAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.textWhite,
    marginBottom: Spacing.sm,
  },
  loanMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  loanMetaItem: { gap: 2 },
  loanMetaLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  loanMetaValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textWhite,
  },
  loanMetaDivider: {
    width: 1,
    height: verticalScale(32),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  walletIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanDecor: {
    position: 'absolute',
    right: -scale(32),
    bottom: -scale(32),
    width: scale(128),
    height: scale(128),
    borderRadius: scale(64),
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Bento
  bento: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  bentoCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  bentoHalf: { flex: 1 },
  bentoTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  // CIBIL
  cibilRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  cibilScore: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.success,
    lineHeight: FontSize['4xl'] * 1.1,
  },
  cibilLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.success,
    marginBottom: scale(4),
  },

  // Employment
  empBadge: {
    backgroundColor: 'rgba(139,202,253,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: scale(3),
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  empBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: '#005580',
  },
  empSince: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  empEmployer: { marginTop: Spacing.xs },
  empEmployerLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  empEmployerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },

  // Card (shared)
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },

  // FOIR
  foirHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  foirPctRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  foirPct: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  foirPctLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  foirTrack: {
    flexDirection: 'row',
    height: verticalScale(32),
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: '#e3e0f4',
  },
  foirFill: {
    backgroundColor: Colors.primary,
  },
  foirRemainder: {
    backgroundColor: '#e3e0f4',
  },
  foirMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  foirMetaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Table
  tableCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  tableHeaderTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  tableColHeader: {
    backgroundColor: '#F5F7FF',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  tableBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableColText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableCell: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  tableCellBold: {
    fontFamily: FontFamily.bold,
  },
  tableCellSuccess: {
    color: Colors.success,
  },
  colFy: { flex: 1 },
  colGross: { flex: 1.4 },
  colTax: { flex: 1, textAlign: 'right' },

  // Bottom fixed area
  bottomFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.large,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    borderWidth: 1.5,
  },
  actionOutline: {
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  actionOutlineError: {
    borderColor: Colors.error,
    backgroundColor: 'transparent',
  },
  actionFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  navItemInner: {
    alignItems: 'center',
    gap: 2,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8bcafd',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  navLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  navLabelActive: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: '#001e30',
  },
});

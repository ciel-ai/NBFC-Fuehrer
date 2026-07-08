import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency, calculateEMI } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { HOUSING_INTEREST_RATE } from '@/src/entities/housingLoan';

function generateRef() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `FHR-HL-2026-${n.toString().padStart(5, '0')}`;
}

const REF_NUMBER = generateRef();

const REVIEWERS = [
  { name: 'Credit Officer',     desc: 'Income, FOIR, repayment capacity' },
  { name: 'Legal Counsel',      desc: 'Title chain, encumbrance, builder agreement' },
  { name: 'Technical Valuer',   desc: 'Property value, construction stage' },
  { name: 'Credit Committee',   desc: 'Final approval & sanction letter' },
];

export default function HousingReviewPendingScreen() {
  const params = useLocalSearchParams<Record<string, string>>();

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [])
  );

  const { housingLoanService } = useServices();
  const [deciding, setDeciding] = useState(false);

  const loanAmount = Number(params.amount) || 3600000;
  const propertyValue = Number(params.agreementValue) || 4500000;
  const ltv = Math.round((loanAmount / propertyValue) * 100);
  const tenureYears = Number(params.tenure) || 20;
  const emi = Number(params.emi) || calculateEMI(loanAmount, HOUSING_INTEREST_RATE, tenureYears * 12);

  const handleDecision = async () => {
    setDeciding(true);
    try {
      const decision = await housingLoanService.getCommitteeDecision(
        params.applicationId ?? 'hl_mock',
        { amount: loanAmount, emi },
      );
      if (decision.decision === 'approved') {
        router.replace({
          pathname: '/(main)/apply/housing-agreement',
          params: { ...params, emi: String(emi) },
        });
      } else {
        router.replace({ pathname: '/(main)/apply/loan-rejected', params: { reason: decision.note ?? '' } });
      }
    } catch {
      Alert.alert('Decision unavailable', 'Please try again.');
    } finally {
      setDeciding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroCircle}>
            <View style={styles.heroRing}>
              <Ionicons name="document-text" size={scale(40)} color={Colors.textWhite} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Submitted for{'\n'}Manual Review</Text>
          <Text style={styles.heroSubtitle}>
            Your housing loan application is now with our credit committee. Housing loans always require
            manual review per RBI guidelines.
          </Text>
        </View>

        <View style={styles.refCard}>
          <View style={styles.refHeader}>
            <Ionicons name="finger-print-outline" size={16} color={Colors.primary} />
            <Text style={styles.refHeaderText}>Application Reference</Text>
          </View>
          <Text style={styles.refNumber}>{REF_NUMBER}</Text>

          <View style={styles.refDivider} />

          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Loan Amount</Text>
            <Text style={styles.refValue}>{formatCurrency(loanAmount)}</Text>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Property Value</Text>
            <Text style={styles.refValue}>{formatCurrency(propertyValue)}</Text>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>LTV Ratio</Text>
            <Text style={[styles.refValue, ltv > 80 && { color: Colors.error }]}>{ltv}%</Text>
          </View>
          {params.hasCoApplicant === '1' && (
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>Applicants</Text>
              <Text style={styles.refValue}>2 (Joint)</Text>
            </View>
          )}
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Under Committee Review</Text>
            </View>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Decision SLA</Text>
            <Text style={styles.refValue}>2 business days</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Reviewers Assigned</Text>
        <View style={styles.reviewerList}>
          {REVIEWERS.map((r, i) => (
            <View key={r.name} style={styles.reviewerRow}>
              <View style={styles.reviewerNum}>
                <Text style={styles.reviewerNumText}>{i + 1}</Text>
              </View>
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>{r.name}</Text>
                <Text style={styles.reviewerDesc}>{r.desc}</Text>
              </View>
              <View style={styles.reviewerStatusChip}>
                <Text style={styles.reviewerStatusText}>Queued</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.callbackBox}>
          <Ionicons name="call-outline" size={20} color={Colors.primary} />
          <View style={styles.callbackInfo}>
            <Text style={styles.callbackTitle}>You'll be contacted for site visit</Text>
            <Text style={styles.callbackSubtitle}>
              The technical valuer will call within 24 hours to schedule a property site visit. Please keep
              your property documents handy.
            </Text>
          </View>
        </View>

        <View style={styles.timelineNote}>
          <Text style={styles.timelineHeader}>WHAT HAPPENS NEXT</Text>
          {[
            'Site visit by technical valuer (Day 1)',
            'Legal title verification by panel counsel (Day 1–2)',
            'Credit committee sanction decision (Day 2)',
            'Sanction letter eSigned via eMudhra (Day 2)',
            'You complete eSign + eNACH → Disbursal to builder',
          ].map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={deciding ? 'Getting committee decision…' : 'Get Committee Decision'}
          loading={deciding}
          disabled={deciding}
          onPress={handleDecision}
        />
        <TouchableOpacity
          style={styles.homeLink}
          onPress={() => router.replace('/(main)/(tabs)/loans')}
        >
          <Ionicons name="time-outline" size={16} color={Colors.primary} />
          <Text style={styles.homeLinkText}>Track later from My Loans</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CIRCLE = scale(110);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },

  heroSection: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md },
  heroCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRing: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 28,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  refCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.medium,
  },
  refHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  refHeaderText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refNumber: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  refDivider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.sm },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  refLabel: { ...Typography.caption, color: Colors.textSecondary },
  refValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.goldDark,
  },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  reviewerList: { gap: Spacing.xs },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewerNum: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerNumText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  reviewerInfo: { flex: 1 },
  reviewerName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  reviewerDesc: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reviewerStatusChip: {
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  reviewerStatusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
  },

  callbackBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  callbackInfo: { flex: 1 },
  callbackTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  callbackSubtitle: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: 4,
    lineHeight: 18,
  },

  timelineNote: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  timelineHeader: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  timelineText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  homeLinkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  debugBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.gold,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  debugTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.goldDark,
    letterSpacing: 0.8,
  },
  debugRow: { flexDirection: 'row', gap: Spacing.xs },
  debugBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    backgroundColor: Colors.background,
  },
  debugBtnApprove: { borderColor: Colors.success },
  debugBtnReject: { borderColor: Colors.error },
  debugBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
});

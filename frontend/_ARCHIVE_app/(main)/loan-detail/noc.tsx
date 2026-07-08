import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';

const LOAN_DETAIL = {
  id: 'LOS-20611',
  type: 'Consumer Durable Loan',
  amount: 500000,
  tenure: 12,
  startDate: '2025-07-05',
  closedDate: '2026-05-05',
  totalPaid: 117600,
  totalInterest: 17600,
};

const ACHIEVEMENTS = [
  { icon: 'shield-checkmark', label: 'No Defaults',    color: Colors.success },
  { icon: 'time',             label: 'Always On-Time', color: Colors.primary },
  { icon: 'star',             label: 'CIBIL Boost',    color: Colors.gold },
];

export default function NOCScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const handleDownloadNOC = () => {
    Alert.alert(
      'NOC Downloaded',
      'Your No-Objection Certificate has been saved to your device and sent to your registered email.',
      [{ text: 'OK' }]
    );
  };

  const handleShareNOC = () => {
    Alert.alert('Share NOC', 'Share feature coming soon.', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroCircle}>
            <View style={styles.heroRing}>
              <Ionicons name="trophy" size={scale(44)} color={Colors.textWhite} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Loan Fully Repaid!</Text>
          <Text style={styles.heroSubtitle}>
            Congratulations! You have successfully repaid your loan. Your No-Objection Certificate (NOC) is ready.
          </Text>
        </View>

        <View style={styles.achievementsRow}>
          {ACHIEVEMENTS.map((a) => (
            <View key={a.label} style={styles.achievementItem}>
              <View style={[styles.achievementIcon, { backgroundColor: `${a.color}20` }]}>
                <Ionicons name={a.icon as any} size={scale(22)} color={a.color} />
              </View>
              <Text style={styles.achievementLabel}>{a.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.nocCard}>
          <View style={styles.nocHeader}>
            <View style={styles.nocHeaderLeft}>
              <Ionicons name="document-text" size={scale(24)} color={Colors.primary} />
              <View>
                <Text style={styles.nocTitle}>No-Objection Certificate</Text>
                <Text style={styles.nocRef}>NOC-{LOAN_DETAIL.id}</Text>
              </View>
            </View>
            <View style={styles.nocBadge}>
              <Ionicons name="checkmark-circle" size={scale(14)} color={Colors.success} />
              <Text style={styles.nocBadgeText}>Issued</Text>
            </View>
          </View>

          <View style={styles.nocDivider} />

          <Text style={styles.nocBodyText}>
            This is to certify that the above borrower has repaid the entire loan amount and there
            are no outstanding dues against Loan ID {LOAN_DETAIL.id}. All obligations under the
            loan agreement have been fulfilled.
          </Text>

          <View style={styles.nocDivider} />

          {[
            { label: 'Borrower',       value: 'Arun Kumar Mehta' },
            { label: 'Loan Type',      value: LOAN_DETAIL.type },
            { label: 'Loan ID',        value: LOAN_DETAIL.id },
            { label: 'Disbursed Date', value: formatDate(LOAN_DETAIL.startDate) },
            { label: 'Closure Date',   value: formatDate(LOAN_DETAIL.closedDate) },
            { label: 'Loan Amount',    value: formatCurrency(LOAN_DETAIL.amount) },
            { label: 'Total Paid',     value: formatCurrency(LOAN_DETAIL.totalPaid) },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={styles.nocRow}>
                <Text style={styles.nocKey}>{item.label}</Text>
                <Text style={styles.nocVal}>{item.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.nocLineDivider} />}
            </View>
          ))}

          <View style={styles.nocStamp}>
            <Ionicons name="shield-checkmark" size={scale(16)} color={Colors.primary} />
            <Text style={styles.nocStampText}>
              Digitally signed · NeSL · {formatDate(LOAN_DETAIL.closedDate)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Loan Journey Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridValue}>{LOAN_DETAIL.tenure}</Text>
              <Text style={styles.summaryGridKey}>EMIs Paid</Text>
            </View>
            <View style={styles.summaryGridDivider} />
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridValue}>{formatCurrency(LOAN_DETAIL.totalInterest, { compact: true })}</Text>
              <Text style={styles.summaryGridKey}>Interest Paid</Text>
            </View>
            <View style={styles.summaryGridDivider} />
            <View style={styles.summaryGridItem}>
              <Text style={[styles.summaryGridValue, { color: Colors.success }]}>0</Text>
              <Text style={styles.summaryGridKey}>Defaults</Text>
            </View>
          </View>
        </View>

        <View style={styles.cibilBox}>
          <Ionicons name="trending-up" size={scale(20)} color={Colors.success} />
          <View style={styles.cibilInfo}>
            <Text style={styles.cibilTitle}>Your CIBIL Score Improved!</Text>
            <Text style={styles.cibilSubtitle}>
              On-time repayment has positively impacted your credit profile. Check your score now.
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button title="Download NOC (PDF)" onPress={handleDownloadNOC} />
          <Pressable
            style={styles.shareBtn}
            onPress={handleShareNOC}
            accessibilityRole="button"
            accessibilityLabel="Share NOC"
          >
            <Ionicons name="share-outline" size={scale(18)} color={Colors.primary} />
            <Text style={styles.shareBtnText}>Share NOC</Text>
          </Pressable>
        </View>

        <View style={styles.newLoanSection}>
          <Text style={styles.newLoanTitle}>Ready for Your Next Goal?</Text>
          <Pressable
            style={styles.newLoanCard}
            onPress={() => router.replace('/(main)/(tabs)/home')}
            accessibilityRole="button"
            accessibilityLabel="Apply for a new loan"
          >
            <View style={styles.newLoanIcon}>
              <Ionicons name="add-circle" size={scale(24)} color={Colors.primary} />
            </View>
            <View style={styles.newLoanInfo}>
              <Text style={styles.newLoanCardTitle}>Apply for a New Loan</Text>
              <Text style={styles.newLoanCardSub}>Better rates for returning customers</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
          </Pressable>
        </View>
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
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRing: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: Colors.gold,
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

  achievementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  achievementItem: { alignItems: 'center', gap: Spacing.sm },
  achievementIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  nocCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    ...Shadow.small,
  },
  nocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nocHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nocTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  nocRef: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  nocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  nocBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.success,
  },
  nocDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  nocBodyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  nocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  nocKey: { ...Typography.body, color: Colors.textSecondary },
  nocVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  nocLineDivider: { height: 1, backgroundColor: Colors.border },
  nocStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nocStampText: {
    ...Typography.tiny,
    color: Colors.primary,
  },

  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  summaryTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryGridItem: { flex: 1, alignItems: 'center' },
  summaryGridValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  summaryGridKey: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryGridDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  cibilBox: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  cibilInfo: { flex: 1 },
  cibilTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  cibilSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  actionButtons: { gap: Spacing.sm },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  shareBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },

  newLoanSection: { gap: Spacing.sm },
  newLoanTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  newLoanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  newLoanIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLoanInfo: { flex: 1 },
  newLoanCardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  newLoanCardSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

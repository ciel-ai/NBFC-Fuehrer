import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';

interface RejectionReason {
  key: string;
  label: string;
  detail: string;
  icon: string;
}

const REJECTION_REASONS: RejectionReason[] = [
  {
    key: 'cibil',
    label: 'Low CIBIL Score',
    detail: 'Your credit score of 612 is below our minimum threshold of 650.',
    icon: 'bar-chart-outline',
  },
  {
    key: 'foir',
    label: 'High FOIR',
    detail: 'Your Fixed Obligation to Income Ratio of 68% exceeds our limit of 55%.',
    icon: 'analytics-outline',
  },
];

const IMPROVEMENT_TIPS = [
  { icon: 'card-outline',         tip: 'Pay all existing EMIs and credit card bills on time.' },
  { icon: 'close-circle-outline', tip: 'Reduce or close existing loans before reapplying.' },
  { icon: 'trending-up-outline',  tip: 'Improve your CIBIL score to 700+ for better eligibility.' },
  { icon: 'calendar-outline',     tip: 'Reapply after 6 months with an improved financial profile.' },
];

export default function LoanRejectedScreen() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroCircle}>
            <Ionicons name="close" size={scale(52)} color={Colors.error} />
          </View>
          <Text style={styles.heroTitle}>Application Declined</Text>
          <Text style={styles.heroSubtitle}>
            We are unable to process your loan application at this time. Here's why, and what you can do next.
          </Text>
        </View>

        <View style={styles.reasonsCard}>
          <View style={styles.reasonsHeader}>
            <Ionicons name="information-circle" size={scale(20)} color={Colors.error} />
            <Text style={styles.reasonsTitle}>Reasons for Rejection</Text>
          </View>
          {REJECTION_REASONS.map((r, i) => (
            <View key={r.key}>
              <View style={styles.reasonRow}>
                <View style={styles.reasonIconBg}>
                  <Ionicons name={r.icon as any} size={scale(18)} color={Colors.error} />
                </View>
                <View style={styles.reasonInfo}>
                  <Text style={styles.reasonLabel}>{r.label}</Text>
                  <Text style={styles.reasonDetail}>{r.detail}</Text>
                </View>
              </View>
              {i < REJECTION_REASONS.length - 1 && <View style={styles.reasonDivider} />}
            </View>
          ))}
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>How to Improve Your Chances</Text>
          <View style={styles.tipsList}>
            {IMPROVEMENT_TIPS.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <View style={styles.tipIconBg}>
                  <Ionicons name={tip.icon as any} size={scale(16)} color={Colors.primary} />
                </View>
                <Text style={styles.tipText}>{tip.tip}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          style={styles.detailsToggle}
          onPress={() => setShowDetails((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Toggle rejection details"
        >
          <Text style={styles.detailsToggleText}>
            {showDetails ? 'Hide' : 'View'} Full Details
          </Text>
          <Ionicons
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={scale(16)}
            color={Colors.primary}
          />
        </Pressable>

        {showDetails && (
          <View style={styles.detailsBox}>
            <Text style={styles.detailsBoxTitle}>Application Summary</Text>
            {[
              { label: 'Application ID',  value: 'LOS-20611' },
              { label: 'Loan Amount',     value: '₹5,00,000' },
              { label: 'Decision Date',   value: '13 May 2026' },
              { label: 'CIBIL Score',     value: '612 (Min: 650)' },
              { label: 'FOIR',            value: '68% (Max: 55%)' },
              { label: 'Decision',        value: 'Rejected' },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>{item.label}</Text>
                  <Text style={[styles.detailVal, item.label === 'Decision' && { color: Colors.error }]}>
                    {item.value}
                  </Text>
                </View>
                {i < arr.length - 1 && <View style={styles.detailDivider} />}
              </View>
            ))}
          </View>
        )}

        <View style={styles.altOptions}>
          <Text style={styles.altOptionsTitle}>Explore Alternatives</Text>
          <View style={styles.altOptionsList}>
            {[
              { label: 'Gold Loan',      subtitle: 'Secured loan against your gold', icon: 'diamond-outline', color: Colors.goldDark, bg: Colors.goldLight },
              { label: 'Smaller Amount', subtitle: 'Try applying for ₹1–2 Lakhs',     icon: 'remove-circle-outline', color: Colors.primary, bg: Colors.primaryLight },
            ].map((opt) => (
              <Pressable
                key={opt.label}
                style={styles.altOptionCard}
                onPress={() => router.push('/(main)/(tabs)/home')}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <View style={[styles.altOptionIcon, { backgroundColor: opt.bg }]}>
                  <Ionicons name={opt.icon as any} size={scale(20)} color={opt.color} />
                </View>
                <View style={styles.altOptionInfo}>
                  <Text style={styles.altOptionLabel}>{opt.label}</Text>
                  <Text style={styles.altOptionSub}>{opt.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          title="Apply for a Different Loan"
          onPress={() => router.replace('/(main)/(tabs)/home')}
        />

        <Pressable
          style={styles.contactLink}
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
        >
          <Ionicons name="call-outline" size={scale(14)} color={Colors.textSecondary} />
          <Text style={styles.contactLinkText}>Contact Support</Text>
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
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  reasonsCard: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  reasonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  reasonsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.error,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  reasonIconBg: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonInfo: { flex: 1 },
  reasonLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  reasonDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  reasonDivider: { height: 1, backgroundColor: `${Colors.error}20`, marginVertical: Spacing.xs },

  tipsSection: { gap: Spacing.md },
  tipsTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  tipsList: { gap: Spacing.sm },
  tipItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  tipIconBg: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },

  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  detailsToggleText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  detailsBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  detailsBoxTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailKey: { ...Typography.body, color: Colors.textSecondary },
  detailVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  detailDivider: { height: 1, backgroundColor: Colors.border },

  altOptions: { gap: Spacing.md },
  altOptionsTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  altOptionsList: { gap: Spacing.sm },
  altOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  altOptionIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  altOptionInfo: { flex: 1 },
  altOptionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  altOptionSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  contactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  contactLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

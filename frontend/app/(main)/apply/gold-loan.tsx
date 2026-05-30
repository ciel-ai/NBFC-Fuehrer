import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { StepItem } from '@/src/shared/components/common/StepItem';
import { scale } from '@/src/core/utils/responsive';

const HIGHLIGHTS = [
  { icon: 'trending-down' as const, label: 'Low interest rate' },
  { icon: 'flash' as const, label: 'Disbursal in 30 mins' },
  { icon: 'document-text' as const, label: 'No income proof needed' },
];

const FEATURES = [
  { icon: 'shield-checkmark' as const, title: 'Safe & Secure', desc: 'Your gold is insured and stored in RBI-certified vaults.' },
  { icon: 'cash' as const, title: 'Up to 75% LTV', desc: 'Get up to 75% of your gold value as loan instantly.' },
  { icon: 'refresh-circle' as const, title: 'Flexible Repayment', desc: 'Choose EMI, interest-only, or bullet repayment plans.' },
  { icon: 'star' as const, title: 'Competitive Rates', desc: 'Starting at 0.88% per month — one of the lowest in market.' },
];

export default function GoldLoanLandingScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Gold Loan" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero section */}
        <View style={styles.heroCard}>
          <View style={styles.goldIconCircle}>
            <Ionicons name="diamond" size={scale(44)} color={Colors.gold} />
          </View>
          <Text style={styles.heroTitle}>Instant loan against{'\n'}your gold</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the value of your idle gold jewellery or coins — no income proof required.
          </Text>

          <View style={styles.chipsRow}>
            {HIGHLIGHTS.map((h) => (
              <View key={h.label} style={styles.chip}>
                <Ionicons name={h.icon} size={scale(13)} color={Colors.goldDark} />
                <Text style={styles.chipText}>{h.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Rate banner */}
        <View style={styles.rateBanner}>
          <Ionicons name="pricetag" size={scale(15)} color={Colors.goldDark} />
          <Text style={styles.rateBannerText}>Starting @ <Text style={styles.rateBannerBold}>0.88% per month</Text> · Up to ₹25 Lakhs</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>Why choose Gold Loan?</Text>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={scale(18)} color={Colors.gold} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Process steps */}
        <View style={styles.stepsCard}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <StepItem step={1} title="Estimate your gold value using our calculator" dotColor={Colors.goldLight} textColor={Colors.goldDark} />
          <StepItem step={2} title="Upload KYC documents for quick verification" dotColor={Colors.goldLight} textColor={Colors.goldDark} />
          <StepItem step={3} title="Book a branch visit for gold assessment" dotColor={Colors.goldLight} textColor={Colors.goldDark} />
          <StepItem step={4} title="Get loan disbursed to your bank account" dotColor={Colors.goldLight} textColor={Colors.goldDark} />
        </View>

        {/* Calculate link */}
        <Pressable
          style={({ pressed }) => [styles.calcLink, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(main)/apply/gold-loan-estimator')}
          android_ripple={{ color: `${Colors.primary}15`, borderless: false }}
          accessibilityRole="button"
          accessibilityLabel="Calculate loan value"
        >
          <Ionicons name="calculator" size={scale(18)} color={Colors.primary} />
          <Text style={styles.calcLinkText}>Calculate Loan Value</Text>
          <Ionicons name="chevron-forward" size={scale(16)} color={Colors.primary} />
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button
          title="Apply Now"
          onPress={() => router.push('/(main)/apply/gold-loan-estimator')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg },

  heroCard: {
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.comingSoonBorder,
    gap: Spacing.sm,
  },
  goldIconCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.comingSoonBorder,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.goldDark,
    textAlign: 'center',
    lineHeight: 30,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.comingSoonBorder,
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.goldDark,
  },

  rateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.comingSoonBorder,
  },
  rateBannerText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.goldDark,
  },
  rateBannerBold: {
    fontFamily: FontFamily.bold,
    color: Colors.goldDark,
  },

  featuresCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.small,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureContent: { flex: 1 },
  featureTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  stepsCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.small,
  },

  calcLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calcLinkText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

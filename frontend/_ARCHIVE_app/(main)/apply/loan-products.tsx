import React from 'react';
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
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { scale } from '@/src/core/utils/responsive';

interface LoanProduct {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  accent: string;
  rate: string;
  maxAmount: string;
  tenure: string;
  route?: string;
  soon?: boolean;
}

const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: 'cdl',
    title: 'CDL Loan',
    description: 'Finance phones, appliances & electronics on easy EMIs.',
    icon: 'phone-portrait',
    tint: Colors.primaryLight,
    accent: Colors.primary,
    rate: '9% p.a.',
    maxAmount: '₹5 Lakhs',
    tenure: '3 – 24 mo',
    route: '/(main)/apply/consumer-durable',
  },
  {
    id: 'gold',
    title: 'Gold Loan',
    description: 'Instant cash against your gold with same-day branch appraisal.',
    icon: 'diamond',
    tint: Colors.goldLight,
    accent: Colors.goldDark,
    rate: '0.88% / mo',
    maxAmount: '₹25 Lakhs',
    tenure: 'Up to 12 mo',
    route: '/(main)/apply/gold-loan',
  },
  {
    id: 'ahl',
    title: 'AHL Loan',
    description: 'Affordable housing finance with income and property review.',
    icon: 'home',
    tint: Colors.tealLight,
    accent: Colors.teal,
    rate: '8.40% p.a.',
    maxAmount: '₹50 Lakhs',
    tenure: 'Up to 20 yrs',
    route: '/(main)/apply/affordable-housing',
  },
];

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHl]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LoanCard({ p }: { p: LoanProduct }) {
  const soon = !!p.soon;

  const onApply = () => {
    if (p.route) {
      router.push(p.route as Parameters<typeof router.push>[0]);
    }
  };

  return (
    <View style={[styles.card, soon && styles.cardSoon]}>
      <View style={styles.cardTop}>
        <View
          style={[
            styles.icon,
            { backgroundColor: soon ? Colors.backgroundLight : p.tint },
          ]}
        >
          <Ionicons
            name={p.icon}
            size={scale(26)}
            color={soon ? Colors.textDisabled : p.accent}
          />
        </View>
        <View style={styles.flex1}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, soon && styles.muted]} numberOfLines={1}>
              {p.title}
            </Text>
            {soon && (
              <View style={styles.soonBadge}>
                <Text style={styles.soonText}>SOON</Text>
              </View>
            )}
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {p.description}
          </Text>
        </View>
      </View>

      {!soon && (
        <View style={styles.stats}>
          <Stat label="Interest" value={p.rate} highlight />
          <View style={styles.statDiv} />
          <Stat label="Max amount" value={p.maxAmount} />
          <View style={styles.statDiv} />
          <Stat label="Tenure" value={p.tenure} />
        </View>
      )}

      {soon ? (
        <View style={[styles.cta, styles.ctaSoon]}>
          <Text style={styles.ctaSoonText}>Coming Soon</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.cta, styles.ctaApply, pressed && { opacity: 0.85 }]}
          onPress={onApply}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={`Apply for ${p.title}`}
        >
          <Text style={styles.ctaApplyText}>Apply Now</Text>
          <Ionicons name="arrow-forward" size={scale(16)} color={Colors.textWhite} />
        </Pressable>
      )}
    </View>
  );
}

export default function LoanProductsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Loan Products" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.intro}>
          Choose one of the available customer loans and continue to the application.
        </Text>

        {LOAN_PRODUCTS.map((p) => (
          <LoanCard key={p.id} p={p} />
        ))}

        <View style={styles.footerNote}>
          <Ionicons name="lock-closed" size={scale(13)} color={Colors.textSecondary} />
          <Text style={styles.footerText}>RBI Registered NBFC · 256-bit secure</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex1: { flex: 1 },
  muted: { color: Colors.textDisabled },

  content: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  intro: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.xs,
  },

  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.medium,
  },
  cardSoon: {
    backgroundColor: Colors.backgroundLight,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 3,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  desc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  soonBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: scale(6),
    paddingVertical: 2,
    borderRadius: scale(6),
  },
  soonText: {
    fontFamily: FontFamily.bold,
    fontSize: 8.5,
    color: Colors.textWhite,
    letterSpacing: 0.3,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  statValueHl: {
    color: Colors.primary,
  },
  statDiv: {
    width: 1,
    height: scale(28),
    backgroundColor: Colors.border,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: scale(46),
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  ctaApply: {
    backgroundColor: Colors.primary,
  },
  ctaApplyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textWhite,
  },
  ctaSoon: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaSoonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textDisabled,
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

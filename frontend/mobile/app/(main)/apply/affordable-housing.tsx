import React from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { useLoanConsent } from '@/src/features/loans/components/LoanConsentGate';

export default function AffordableHousingScreen() {
  const { ensureConsent, consentGate } = useLoanConsent();
  const details = [
    { label: 'Loan Amount', value: 'Up to ₹50 Lakhs' },
    { label: 'Tenure', value: 'Up to 30 Years' },
    { label: 'Interest Rate', value: 'Starting 8.40%' },
    { label: 'Example EMI', value: '₹7,689/Lakh' },
  ];

  const features = [
    { icon: 'time-outline' as const, label: 'Long repayment tenure', desc: 'Flexible loan terms up to 30 years' },
    { icon: 'trending-down-outline' as const, label: 'Competitive interest rates', desc: 'Starting at 8.40% per annum' },
    { icon: 'card-outline' as const, label: 'Flexible repayment options', desc: 'EMI aligned with your cash flow' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Affordable Housing Loan" showBack titleColor={Colors.primary} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Affordable Housing Loan</Text>
        <Text style={styles.subtitle}>Long-term home financing</Text>

        {/* PMAY subsidy banner */}
        <View style={styles.pmayBanner}>
          <View style={styles.pmayBadge}>
            <Text style={styles.pmayBadgeText}>PMAY SUBSIDY</Text>
          </View>
          <Text style={styles.pmayTitle}>Get PMAY Subsidy benefits up to ₹2.67 Lakh</Text>
          <Pressable
            onPress={() => Alert.alert('PMAY', 'Pradhan Mantri Awas Yojana provides credit linked subsidy to home loan borrowers.')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            accessibilityRole="button"
          >
            <Text style={styles.pmayLink}>Check Details →</Text>
          </Pressable>
        </View>

        {/* Details grid */}
        <View style={styles.detailsGrid}>
          {details.map((d) => (
            <View key={d.label} style={styles.detailCard}>
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text style={styles.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why Choose Us?</Text>
          {features.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={Colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Eligibility */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eligibility</Text>
          {[
            'Indian citizen aged 18–65 years',
            'Annual household income ≤ ₹18 Lakhs (EWS/LIG/MIG)',
            'No existing pucca house in your name',
            'First-time homebuyer preferred',
          ].map((item, i) => (
            <View key={i} style={styles.eligibilityRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.eligibilityText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Check Eligibility"
          onPress={() => ensureConsent(() => router.push('/(main)/apply/housing-apply'))}
        />
      </View>
      {consentGate}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: Spacing.lg },
  pmayBanner: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pmayBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  pmayBadgeText: { fontFamily: FontFamily.bold, fontSize: 9, color: Colors.textWhite, letterSpacing: 1 },
  pmayTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textWhite, marginBottom: Spacing.sm },
  pmayLink: { fontFamily: FontFamily.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  detailCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  detailLabel: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  detailValue: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.md },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureContent: { flex: 1 },
  featureLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: 2 },
  featureDesc: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textSecondary },
  eligibilityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  eligibilityText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

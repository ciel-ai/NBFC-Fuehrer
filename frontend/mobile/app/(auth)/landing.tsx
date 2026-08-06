import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';

// Consent (T&C / KYC / bureau) is NOT collected here — browsing the app needs
// no consent. The gate lives at the loan-application entry points instead
// (src/features/loans/components/LoanConsentGate.tsx).

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.brandName}>Fuehrer</Text>
          <Text style={styles.brandTagline}>NBFC</Text>
        </View>

        {/* Headline */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Login to access your loans, track applications, and manage your EMIs — all in one place.
        </Text>

        {/* Trust badges */}
        <View style={styles.badgesRow}>
          {[
            { icon: 'shield-checkmark' as const, label: 'RBI Registered' },
            { icon: 'lock-closed' as const, label: '256-bit SSL' },
            { icon: 'flash' as const, label: 'Instant Approval' },
          ].map((badge) => (
            <View key={badge.label} style={styles.badge}>
              <Ionicons name={badge.icon} size={13} color={Colors.success} />
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          ))}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          {[
            { icon: 'phone-portrait' as const, text: 'Consumer Durable Loans up to ₹5 Lakhs' },
            { icon: 'home' as const, text: 'Affordable Housing Finance' },
            { icon: 'diamond' as const, text: 'Gold Loans @ 0.88% per month' },
          ].map((item) => (
            <View key={item.text} style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <Ionicons name={item.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button title="Get Started" onPress={() => router.push('/(auth)/permissions')} />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary,
    letterSpacing: 1,
  },
  brandTagline: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginTop: 2,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
});

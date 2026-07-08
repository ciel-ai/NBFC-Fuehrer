import React, { useState, useCallback } from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { useLoans } from '@/src/features/loans/queries/useLoans';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { scale } from '@/src/core/utils/responsive';

export default function LoansScreen() {
  const { data: activeLoans = [], refetch } = useLoans();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Keep the spinner visible briefly even when the (mock) data resolves
    // instantly, so the pull-to-refresh feedback is actually seen.
    await Promise.all([
      refetch(),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
    setRefreshing(false);
  }, [refetch]);

  const loanProducts = [
    {
      id: 'consumer_durable',
      title: 'Consumer Durable Loan',
      description: 'Finance electronics, appliances, and more.',
      rate: 'From 9% p.a.',
      icon: 'phone-portrait' as const,
      route: '/(main)/apply/consumer-durable',
      tint: Colors.primaryLight, // light blue
      accent: Colors.primary,
    },
    {
      id: 'affordable_housing',
      title: 'Affordable Housing Loan',
      description: 'Long-term home financing with PMAY benefits.',
      rate: 'From 8.40% p.a.',
      icon: 'home' as const,
      route: '/(main)/apply/affordable-housing',
      tint: Colors.successLight, // light green
      accent: Colors.success,
    },
    {
      id: 'gold_loan',
      title: 'Gold Loan',
      description: 'Pledge gold and get same-day disbursal.',
      rate: 'From 0.88%/month',
      icon: 'diamond' as const,
      route: '/(main)/apply/gold-loan',
      tint: Colors.goldLight, // light yellow
      accent: Colors.goldDark,
    },
  ];

  const loanTypeLabel = (type: string) => {
    if (type === 'gold_loan') return 'Gold Loan';
    if (type === 'affordable_housing') return 'Affordable Housing Loan';
    return 'Consumer Durable Loan';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Loans</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {activeLoans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Loans</Text>
            {activeLoans.map((loan) => (
              <Pressable
                key={loan.id}
                style={({ pressed }) => [styles.loanCard, pressed && { opacity: 0.85 }]}
                onPress={() => router.push({ pathname: '/(main)/loan-detail/[id]', params: { id: loan.id } })}
                android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={`View loan ${loan.id}`}
              >
                <View style={styles.loanCardHeader}>
                  <View>
                    <Text style={styles.loanType}>{loanTypeLabel(loan.type)}</Text>
                    <Text style={styles.loanId}>#{loan.id.toUpperCase()}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>
                <View style={styles.loanDetails}>
                  <View style={styles.loanDetail}>
                    <Text style={styles.detailLabel}>EMI</Text>
                    <Text style={styles.detailValue}>{formatCurrency(loan.emi)}/mo</Text>
                  </View>
                  <View style={styles.loanDetail}>
                    <Text style={styles.detailLabel}>Outstanding</Text>
                    <Text style={styles.detailValue}>{formatCurrency(loan.outstandingAmount, { compact: true })}</Text>
                  </View>
                  <View style={styles.loanDetail}>
                    <Text style={styles.detailLabel}>Next Due</Text>
                    <Text style={styles.detailValue}>{formatDate(loan.nextDueDate)}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apply for a Loan</Text>
          {loanProducts.map((product) => (
            <Pressable
              key={product.id}
              style={({ pressed }) => [
                styles.productRow,
                { backgroundColor: product.tint, borderColor: `${product.accent}33` },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.push(product.route as Parameters<typeof router.push>[0])}
              android_ripple={{ color: `${product.accent}10`, borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={`Apply for ${product.title}`}
            >
              <View style={[styles.productIcon, { backgroundColor: Colors.background }]}>
                <Ionicons name={product.icon} size={scale(20)} color={product.accent} />
              </View>
              <View style={styles.productContent}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productDesc}>{product.description}</Text>
              </View>
              <View style={styles.productRate}>
                <Text style={[styles.productRateText, { color: product.accent }]}>{product.rate}</Text>
                <Ionicons name="chevron-forward" size={scale(14)} color={Colors.textDisabled} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  content: { padding: Spacing.xl },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  loanCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  loanType: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textWhite,
  },
  loanId: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: `${Colors.success}33`,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  statusText: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.success },
  loanDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  loanDetail: { alignItems: 'center' },
  detailLabel: { fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  detailValue: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textWhite },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.medium,
  },
  productIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  productContent: { flex: 1 },
  productTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: 2 },
  productDesc: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textSecondary },
  productRate: { alignItems: 'flex-end', gap: 2 },
  productRateText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary },
});

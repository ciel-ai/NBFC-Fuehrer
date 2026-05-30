import React, { useState, useCallback } from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing } from '@/src/core/theme/spacing';
import { PromoCarousel } from '@/src/features/loans/components/PromoCarousel';
import { ActiveLoanCard } from '@/src/features/loans/components/ActiveLoanCard';
import { EMIReminderCard } from '@/src/features/loans/components/EMIReminderCard';
import { LoanProductCard } from '@/src/features/loans/components/LoanProductCard';
import { QuickServicesGrid } from '@/src/features/loans/components/QuickServicesGrid';
import { ExploreSection } from '@/src/features/loans/components/ExploreSection';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { useUserStore } from '@/src/store/userStore';
import { useLoans } from '@/src/features/loans/queries/useLoans';
import { scale } from '@/src/core/utils/responsive';

interface LoanProduct {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: string;
  isComingSoon?: boolean;
}

const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: 'consumer_durable',
    title: 'Consumer Durable',
    subtitle: 'Check eligibility now',
    icon: 'phone-portrait',
    iconColor: Colors.primary,
    iconBg: Colors.primaryLight,
    route: '/(main)/apply/consumer-durable',
  },
  {
    id: 'affordable_housing',
    title: 'Affordable Housing',
    subtitle: 'Starting @ 9% p.a.',
    icon: 'home',
    iconColor: '#0D9488',
    iconBg: '#CCFBF1',
    route: '/(main)/apply/affordable-housing',
  },
  {
    id: 'gold_loan',
    title: 'Gold Loan',
    subtitle: 'Starting @ 0.88%/month',
    icon: 'diamond',
    iconColor: Colors.gold,
    iconBg: Colors.goldLight,
    route: '/(main)/apply/gold-loan',
  },
];

export default function HomeScreen() {
  const user = useUserStore((s) => s.user);
  const { width: screenWidth } = useWindowDimensions();
  const gridItemWidth = (screenWidth - Spacing.xl * 2 - Spacing.sm) / 2;

  const {
    data: activeLoans = [],
    isLoading: isLoansLoading,
    isError: loansError,
    refetch: fetchLoans
  } = useLoans();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLoans();
    setRefreshing(false);
  }, [fetchLoans]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  const FEATURE_FLAGS = { cibil: true, payments: true, support: true };

  const quickServices = [
    {
      id: 'calculator',
      label: 'Calculator',
      icon: 'calculator' as const,
      onPress: () => router.push('/(main)/calculator'),
    },
    FEATURE_FLAGS.cibil && {
      id: 'cibil',
      label: 'CIBIL',
      icon: 'bar-chart' as const,
      onPress: () => Alert.alert('CIBIL Score', 'Your CIBIL score and report will be available here. Coming soon.'),
    },
    FEATURE_FLAGS.payments && {
      id: 'payments',
      label: 'Payments',
      icon: 'wallet' as const,
      onPress: () => Alert.alert('Payments', 'View EMI history, make prepayments, and download receipts here. Coming soon.'),
    },
    FEATURE_FLAGS.support && {
      id: 'support',
      label: 'Support',
      icon: 'headset' as const,
      onPress: () => Alert.alert('Support', 'Call us at 1800-XXX-XXXX'),
    },
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.greetingRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() ?? 'A'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
            </View>
          </View>
          <Pressable
            style={styles.bellButton}
            onPress={() => router.push('/(main)/notifications')}
            android_ripple={{ color: `${Colors.primary}15`, borderless: true, radius: 20 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={scale(24)} color={Colors.textPrimary} />
            <View style={styles.notifDot} />
          </Pressable>
        </View>

        <PromoCarousel />

        {isLoansLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size={32} color={Colors.primary} />
          </View>
        ) : loansError ? (
          <ErrorView
            title="Failed to load loans"
            message="We couldn't fetch your active loans. Please check your connection."
            onRetry={fetchLoans}
          />
        ) : activeLoans.length > 0 ? (
          <ActiveLoanCard
            loan={activeLoans[0]}
            onPayEMI={() => Alert.alert('Pay EMI', 'Redirecting to payment gateway...')}
          />
        ) : null}

        <EMIReminderCard
          daysUntilDue={3}
          bankName="HDFC A/C"
          onPress={() => Alert.alert('EMI Reminder', 'Your EMI will be auto-debited.')}
        />

        {/* Quick Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Services</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="See all quick services">
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          <QuickServicesGrid services={quickServices} />
        </View>

        {/* Explore More */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore More</Text>
          <ExploreSection />
        </View>

        {/* Loan Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Products</Text>
          <View style={styles.loanGrid}>
            {LOAN_PRODUCTS.map((product) => (
              <View key={product.id} style={{ width: gridItemWidth }}>
                <LoanProductCard
                  title={product.title}
                  subtitle={product.subtitle}
                  icon={product.icon}
                  iconColor={product.iconColor}
                  iconBg={product.iconBg}
                  isComingSoon={product.isComingSoon}
                  onPress={() => router.push(product.route as Parameters<typeof router.push>[0])}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: Spacing.md },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary,
  },
  greeting: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  bellButton: {
    position: 'relative',
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.backgroundLight,
  },

  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },

  loanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  bottomPad: { height: Spacing.xl },
});

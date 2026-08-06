import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { Header } from '@/src/shared/components/common/Header';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { EmptyState } from '@/src/shared/components/common/EmptyState';
import { dialPhone } from '@/src/core/utils/linking';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { LinkedBankAccount, MandateState } from '@/src/entities/payment';

const SUPPORT_PHONE = '+91 1800-200-7773';

/* Every mandate state gets its own row treatment. The screen used to know only
   "active" and "pending", which meant a revoked or bounced mandate rendered as
   a calm grey "Pending" — the customer had no way to learn their auto-debit had
   stopped working until the DPD showed up. */
const MANDATE_TONE: Record<
  MandateState,
  { bg: string; fg: string; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  active: { bg: Colors.successLight, fg: Colors.success, label: 'Active', icon: 'shield-checkmark' },
  pending: { bg: Colors.warningLight, fg: Colors.warning, label: 'Pending', icon: 'time-outline' },
  paused: { bg: Colors.warningLight, fg: Colors.warning, label: 'Paused', icon: 'pause-circle-outline' },
  failed: { bg: Colors.errorLight, fg: Colors.error, label: 'Failed', icon: 'alert-circle-outline' },
  cancelled: { bg: Colors.errorLight, fg: Colors.error, label: 'Cancelled', icon: 'close-circle-outline' },
  expired: { bg: Colors.errorLight, fg: Colors.error, label: 'Expired', icon: 'calendar-outline' },
  none: { bg: Colors.errorLight, fg: Colors.error, label: 'Not set up', icon: 'remove-circle-outline' },
};

const mandateState = (acc: LinkedBankAccount): MandateState => acc.mandate?.status ?? 'none';

export default function BankAccountsScreen() {
  const { paymentService } = useServices();
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchAccounts = useCallback(async () => {
    try {
      setErrorMessage(null);
      const rows = await paymentService.getBankAccounts();
      if (!isMountedRef.current) return;
      setAccounts(rows);
    } catch {
      /* A failed fetch shows nothing rather than stale or invented accounts —
         a wrong mandate status here is worse than no screen at all. */
      if (isMountedRef.current) {
        setAccounts([]);
        setErrorMessage('Could not load your bank accounts. Please check your connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [paymentService]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchAccounts();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAccounts]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchAccounts();
  }, [fetchAccounts]);

  const onLinkNew = () => {
    Alert.alert(
      'Link new account',
      'You will be redirected to bank verification via Penny Drop. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => {} },
      ],
    );
  };

  const onAccountPress = (acc: LinkedBankAccount) => {
    Alert.alert(
      acc.bankName,
      `${acc.accountMasked} · ${acc.accountType}\nIFSC: ${acc.ifsc}` +
        (acc.mandate?.umrn ? `\nUMRN: ${acc.mandate.umrn}` : ''),
    );
  };

  const onMandateHelp = () => {
    void dialPhone(SUPPORT_PHONE);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bank Accounts" showBack />
        <View style={styles.centered}>
          <LoadingSpinner size={48} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bank Accounts" showBack />
        <ErrorView
          title="Bank accounts unavailable"
          message={errorMessage}
          onRetry={() => {
            setIsLoading(true);
            void fetchAccounts();
          }}
        />
      </SafeAreaView>
    );
  }

  if (accounts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Bank Accounts" showBack />
        <View style={styles.centered}>
          <EmptyState
            icon="card-outline"
            title="No bank accounts linked"
            subtitle="Link an account to receive disbursements and pay EMIs by auto-debit."
            actionLabel="Link New Account"
            onAction={onLinkNew}
          />
        </View>
      </SafeAreaView>
    );
  }

  const primary = accounts.find((a) => a.isPrimary) ?? accounts[0]!;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Bank Accounts" showBack />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="card" size={scale(18)} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{accounts.length}</Text>
            <Text style={styles.statLabel}>Linked Accounts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="star" size={scale(18)} color={Colors.success} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{primary.bankName}</Text>
            <Text style={styles.statLabel}>Primary Bank</Text>
          </View>
        </View>

        {/* Info banner */}
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={scale(18)} color={Colors.primary} />
          <Text style={styles.bannerText}>
            Your primary account is used for loan disbursements and EMI collections.
          </Text>
        </View>

        {/* Linked accounts */}
        <Text style={styles.sectionLabel}>Linked Accounts</Text>
        <View style={styles.card}>
          {accounts.map((acc, idx) => (
            <Pressable
              key={acc.id}
              style={[styles.row, idx < accounts.length - 1 && styles.rowDivider]}
              onPress={() => onAccountPress(acc)}
              android_ripple={{ color: `${Colors.primary}10` }}
              accessibilityRole="button"
              accessibilityLabel={`${acc.bankName}, ${acc.accountMasked}, ${acc.accountType}${acc.isPrimary ? ', primary account' : ''}`}
            >
              <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="business" size={scale(18)} color={Colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowValue} numberOfLines={1}>{acc.bankName}</Text>
                  {acc.isPrimary ? (
                    <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
                      <Text style={[styles.badgeText, { color: Colors.primary }]}>Primary</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rowDetail}>
                  {acc.accountMasked} · {acc.accountType}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
            </Pressable>
          ))}
        </View>

        {/* Mandate status */}
        <Text style={styles.sectionLabel}>Mandate Status</Text>
        <View style={styles.card}>
          {accounts.map((acc, idx) => {
            const state = mandateState(acc);
            const tone = MANDATE_TONE[state];
            return (
              <View
                key={acc.id}
                style={[styles.row, idx < accounts.length - 1 && styles.rowDivider]}
                accessibilityLabel={`${acc.bankName} auto-debit mandate: ${tone.label}${acc.mandate?.failureReason ? `. ${acc.mandate.failureReason}` : ''}`}
              >
                <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
                  <Ionicons name={tone.icon} size={scale(18)} color={tone.fg} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowValue} numberOfLines={1}>{acc.bankName}</Text>
                  <Text style={styles.rowDetail}>
                    eNACH · {acc.accountMasked.slice(-4)}
                  </Text>
                  {/* The reason a mandate is failing is the only actionable part
                      of this screen — never hide it behind a coloured chip. */}
                  {acc.mandate?.failureReason ? (
                    <Text style={styles.rowAlert}>{acc.mandate.failureReason}</Text>
                  ) : null}
                </View>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.fg }]}>{tone.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          style={styles.helpRow}
          onPress={onMandateHelp}
          android_ripple={{ color: `${Colors.primary}10` }}
          accessibilityRole="button"
          accessibilityLabel={`Need help with mandate setup, call ${SUPPORT_PHONE}`}
        >
          <Ionicons name="call-outline" size={scale(16)} color={Colors.primary} />
          <Text style={styles.helpRowText}>Need help with mandate setup? Call support</Text>
        </Pressable>

        {/* CTA */}
        <Pressable
          style={styles.ctaBtn}
          onPress={onLinkNew}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          accessibilityRole="button"
          accessibilityLabel="Link a new bank account"
        >
          <Ionicons name="add-circle-outline" size={scale(18)} color={Colors.textWhite} />
          <Text style={styles.ctaBtnText}>Link New Account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

  content: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  statIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  bannerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: FontSize.sm * 1.4,
  },

  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    gap: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  rowDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowAlert: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 3,
  },

  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },

  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  helpRowText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    minHeight: verticalScale(48),
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  ctaBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textWhite,
  },
});

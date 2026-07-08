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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { Header } from '@/src/shared/components/common/Header';
import { dialPhone } from '@/src/core/utils/linking';

type MandateStatus = 'active' | 'pending';

interface BankAccount {
  id: string;
  bank: string;
  accountMasked: string;
  type: 'Savings' | 'Current';
  ifsc: string;
  isPrimary: boolean;
  mandate: MandateStatus;
}

const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-hdfc',
    bank: 'HDFC Bank',
    accountMasked: 'XXXX XXXX 4521',
    type: 'Savings',
    ifsc: 'HDFC0001234',
    isPrimary: true,
    mandate: 'active',
  },
  {
    id: 'acc-icici',
    bank: 'ICICI Bank',
    accountMasked: 'XXXX XXXX 8847',
    type: 'Savings',
    ifsc: 'ICIC0007722',
    isPrimary: false,
    mandate: 'pending',
  },
];

const SUPPORT_PHONE = '+91 1800-200-7773';

const MANDATE_TONE: Record<MandateStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: Colors.successLight, fg: Colors.success, label: 'Active' },
  pending: { bg: '#F0F0F0', fg: Colors.textSecondary, label: 'Pending' },
};

export default function BankAccountsScreen() {
  const primary = MOCK_ACCOUNTS.find((a) => a.isPrimary) ?? MOCK_ACCOUNTS[0];

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

  const onAccountPress = (acc: BankAccount) => {
    Alert.alert(acc.bank, `${acc.accountMasked} · ${acc.type}\nIFSC: ${acc.ifsc}`);
  };

  const onMandateHelp = () => {
    void dialPhone(SUPPORT_PHONE);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Bank Accounts" showBack />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="card" size={scale(18)} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{MOCK_ACCOUNTS.length}</Text>
            <Text style={styles.statLabel}>Linked Accounts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="star" size={scale(18)} color={Colors.success} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{primary.bank}</Text>
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
          {MOCK_ACCOUNTS.map((acc, idx) => (
            <Pressable
              key={acc.id}
              style={[styles.row, idx < MOCK_ACCOUNTS.length - 1 && styles.rowDivider]}
              onPress={() => onAccountPress(acc)}
              android_ripple={{ color: `${Colors.primary}10` }}
              accessibilityRole="button"
              accessibilityLabel={`${acc.bank}, ${acc.accountMasked}, ${acc.type}${acc.isPrimary ? ', primary account' : ''}`}
            >
              <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="business" size={scale(18)} color={Colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowValue} numberOfLines={1}>{acc.bank}</Text>
                  {acc.isPrimary ? (
                    <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
                      <Text style={[styles.badgeText, { color: Colors.primary }]}>Primary</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rowDetail}>
                  {acc.accountMasked} · {acc.type}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
            </Pressable>
          ))}
        </View>

        {/* Mandate status */}
        <Text style={styles.sectionLabel}>Mandate Status</Text>
        <View style={styles.card}>
          {MOCK_ACCOUNTS.map((acc, idx) => {
            const tone = MANDATE_TONE[acc.mandate];
            return (
              <View key={acc.id} style={[styles.row, idx < MOCK_ACCOUNTS.length - 1 && styles.rowDivider]}>
                <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
                  <Ionicons
                    name={acc.mandate === 'active' ? 'shield-checkmark' : 'time-outline'}
                    size={scale(18)}
                    color={tone.fg}
                  />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowValue} numberOfLines={1}>{acc.bank}</Text>
                  <Text style={styles.rowDetail}>eNACH · {acc.accountMasked.slice(-4)}</Text>
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

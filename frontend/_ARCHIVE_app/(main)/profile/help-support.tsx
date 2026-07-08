import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import { Header } from '@/src/shared/components/common/Header';
import { dialPhone } from '@/src/core/utils/linking';

const SUPPORT_PHONE = '+91 1800-200-7773';
const SUPPORT_HOURS = 'Mon–Sat · 9 AM – 7 PM';
const TERMS_URL = 'https://www.fuehrer-nbfc.example.in/legal/terms';
const PRIVACY_URL = 'https://www.fuehrer-nbfc.example.in/legal/privacy';
const APP_VERSION = 'v1.0.0 (build 124)';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'purple';

interface HelpCategory {
  id: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
}

const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'loan-emi', label: 'Loan & EMI Queries', subtitle: 'Disbursement, prepayment, EMI changes', icon: 'wallet-outline', tone: 'blue' },
  { id: 'kyc-docs', label: 'KYC & Documents', subtitle: 'Aadhaar, PAN, income proof uploads', icon: 'document-text-outline', tone: 'green' },
  { id: 'bank-account', label: 'Bank Account Issues', subtitle: 'Mandate, debit failures, account linking', icon: 'card-outline', tone: 'amber' },
  { id: 'security', label: 'Security & Fraud', subtitle: 'Suspicious activity, account safety', icon: 'shield-checkmark-outline', tone: 'red' },
  { id: 'faqs', label: 'FAQs', subtitle: 'Browse frequently asked questions', icon: 'help-buoy-outline', tone: 'purple' },
];

interface Ticket {
  id: string;
  ticketNo: string;
  subject: string;
  raisedOn: string;
  status: 'open' | 'closed';
}

const ACTIVE_TICKETS: Ticket[] = [
  {
    id: 't1',
    ticketNo: '#FUE-2026-04827',
    subject: 'Form 16 upload — clarification needed',
    raisedOn: '21 May 2026',
    status: 'open',
  },
];

const TONE_MAP: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: Colors.primary, bg: Colors.primaryLight },
  green: { fg: Colors.success, bg: Colors.successLight },
  amber: { fg: Colors.goldDark, bg: Colors.goldLight },
  red: { fg: Colors.error, bg: Colors.errorLight },
  purple: { fg: Colors.purple, bg: Colors.purpleLight },
};

async function openLink(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Cannot open link', 'No app can handle this link.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', 'Please try again.');
  }
}

export default function HelpSupportScreen() {
  const onCallSupport = () => {
    void dialPhone(SUPPORT_PHONE);
  };

  const onChatSupport = () => {
    Alert.alert('Chat support', 'Live chat will open in the next release. For now, call support or raise a ticket.');
  };

  const onCategoryPress = (cat: HelpCategory) => {
    Alert.alert(cat.label, cat.subtitle);
  };

  const onTicketPress = (ticket: Ticket) => {
    Alert.alert(ticket.ticketNo, `${ticket.subject}\nRaised: ${ticket.raisedOn}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Help & Support" showBack />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Talk to us banner */}
        <View style={styles.talkBanner}>
          <View style={styles.talkLeft}>
            <Text style={styles.talkTitle}>Talk to us</Text>
            <Text style={styles.talkSubtitle}>{SUPPORT_HOURS}</Text>
            <Text style={styles.talkPhone}>{SUPPORT_PHONE}</Text>
          </View>
          <View style={styles.talkActions}>
            <Pressable
              style={styles.talkBtn}
              onPress={onCallSupport}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: scale(24) }}
              accessibilityRole="button"
              accessibilityLabel={`Call support at ${SUPPORT_PHONE}`}
            >
              <Ionicons name="call" size={scale(20)} color={Colors.textWhite} />
            </Pressable>
            <Pressable
              style={[styles.talkBtn, styles.talkBtnChat]}
              onPress={onChatSupport}
              android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: scale(24) }}
              accessibilityRole="button"
              accessibilityLabel="Open chat support"
            >
              <Ionicons name="chatbubble-ellipses" size={scale(20)} color={Colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Quick help */}
        <Text style={styles.sectionLabel}>Quick Help</Text>
        <View style={styles.card}>
          {HELP_CATEGORIES.map((cat, idx) => {
            const tone = TONE_MAP[cat.tone];
            const isLast = idx === HELP_CATEGORIES.length - 1;
            return (
              <Pressable
                key={cat.id}
                style={[styles.row, !isLast && styles.rowDivider]}
                onPress={() => onCategoryPress(cat)}
                android_ripple={{ color: `${Colors.primary}10` }}
                accessibilityRole="button"
                accessibilityLabel={`${cat.label}. ${cat.subtitle}`}
              >
                <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
                  <Ionicons name={cat.icon} size={scale(18)} color={tone.fg} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{cat.label}</Text>
                  <Text style={styles.rowSubtitle}>{cat.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
              </Pressable>
            );
          })}
        </View>

        {/* Active tickets */}
        <Text style={styles.sectionLabel}>Active Tickets</Text>
        <View style={styles.card}>
          {ACTIVE_TICKETS.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="checkmark-done-circle-outline" size={scale(24)} color={Colors.success} />
              <Text style={styles.emptyText}>No active tickets</Text>
            </View>
          ) : (
            ACTIVE_TICKETS.map((t, idx) => {
              const isLast = idx === ACTIVE_TICKETS.length - 1;
              return (
                <Pressable
                  key={t.id}
                  style={[styles.row, !isLast && styles.rowDivider]}
                  onPress={() => onTicketPress(t)}
                  android_ripple={{ color: `${Colors.primary}10` }}
                  accessibilityRole="button"
                  accessibilityLabel={`Ticket ${t.ticketNo}, ${t.subject}, raised ${t.raisedOn}, status open`}
                >
                  <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight }]}>
                    <Ionicons name="ticket-outline" size={scale(18)} color={Colors.primary} />
                  </View>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{t.ticketNo}</Text>
                      <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
                        <Text style={[styles.badgeText, { color: Colors.primary }]}>Open</Text>
                      </View>
                    </View>
                    <Text style={styles.rowSubtitle} numberOfLines={2}>{t.subject}</Text>
                    <Text style={styles.feedTimestamp}>Raised {t.raisedOn}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
                </Pressable>
              );
            })
          )}
        </View>

        {/* Footer */}
        <View style={styles.footerCard}>
          <View style={styles.footerLinkRow}>
            <Pressable
              onPress={() => openLink(TERMS_URL)}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Open Terms of Service"
            >
              <Text style={styles.footerLink}>Terms of Service</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable
              onPress={() => openLink(PRIVACY_URL)}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Open Privacy Policy"
            >
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>
          </View>
          <Text style={styles.footerVersion}>Fuehrer NBFC · {APP_VERSION}</Text>
        </View>
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

  talkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  talkLeft: { flex: 1, gap: 2 },
  talkTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
  },
  talkSubtitle: {
    ...Typography.caption,
    color: Colors.primary,
    opacity: 0.85,
  },
  talkPhone: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
    marginTop: 4,
  },
  talkActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  talkBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  talkBtnChat: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
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
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  feedTimestamp: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    marginTop: 4,
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

  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  footerCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerLink: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  footerDot: {
    color: Colors.textDisabled,
  },
  footerVersion: {
    ...Typography.tiny,
    color: Colors.textDisabled,
    marginTop: Spacing.xs,
  },
});

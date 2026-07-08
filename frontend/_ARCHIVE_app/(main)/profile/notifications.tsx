import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import { Header } from '@/src/shared/components/common/Header';

type Tone = 'blue' | 'green' | 'amber' | 'red';

interface PreferenceItem {
  id: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  defaultValue: boolean;
}

const PREFERENCES: PreferenceItem[] = [
  { id: 'emi-reminders', label: 'EMI Reminders', subtitle: 'Get notified 3 days before due date', icon: 'calendar-outline', tone: 'blue', defaultValue: true },
  { id: 'loan-approvals', label: 'Loan Approvals', subtitle: 'Updates on application status', icon: 'checkmark-circle-outline', tone: 'green', defaultValue: true },
  { id: 'offers', label: 'Offers & Promotions', subtitle: 'Personalised loan and card offers', icon: 'pricetag-outline', tone: 'amber', defaultValue: false },
  { id: 'overdue', label: 'Overdue Alerts', subtitle: 'Critical alerts for missed EMIs', icon: 'warning-outline', tone: 'red', defaultValue: true },
  { id: 'sms', label: 'SMS Alerts', subtitle: 'Receive notifications by SMS', icon: 'chatbubble-ellipses-outline', tone: 'blue', defaultValue: true },
];

interface NotificationFeedItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  title: string;
  subtitle: string;
  timestamp: string;
  unread: boolean;
}

const NOTIFICATIONS: NotificationFeedItem[] = [
  {
    id: 'n1',
    icon: 'cash-outline',
    tone: 'green',
    title: 'EMI collected successfully',
    subtitle: '₹12,450 debited from HDFC ····4521',
    timestamp: 'Today 9:00 AM',
    unread: false,
  },
  {
    id: 'n2',
    icon: 'document-text-outline',
    tone: 'blue',
    title: 'Document verified',
    subtitle: 'Form 16 (FY 2023-24) approved',
    timestamp: 'Yesterday 3:45 PM',
    unread: true,
  },
  {
    id: 'n3',
    icon: 'time-outline',
    tone: 'amber',
    title: 'EMI due in 3 days',
    subtitle: '₹12,450 due on 29 May',
    timestamp: '25 May 10:00 AM',
    unread: true,
  },
];

const TONE_MAP: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: Colors.primary, bg: Colors.primaryLight },
  green: { fg: Colors.success, bg: Colors.successLight },
  amber: { fg: Colors.goldDark, bg: Colors.goldLight },
  red: { fg: Colors.error, bg: Colors.errorLight },
};

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREFERENCES.map((p) => [p.id, p.defaultValue])),
  );

  const togglePref = (id: string) => {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Notifications" showBack />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          {PREFERENCES.map((pref, idx) => {
            const tone = TONE_MAP[pref.tone];
            const value = prefs[pref.id];
            const isLast = idx === PREFERENCES.length - 1;
            return (
              <View key={pref.id} style={[styles.row, !isLast && styles.rowDivider]}>
                <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
                  <Ionicons name={pref.icon} size={scale(18)} color={tone.fg} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{pref.label}</Text>
                  <Text style={styles.rowSubtitle}>{pref.subtitle}</Text>
                </View>
                <Switch
                  value={value}
                  onValueChange={() => togglePref(pref.id)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.surface}
                  accessibilityRole="switch"
                  accessibilityLabel={pref.label}
                  accessibilityState={{ checked: value }}
                />
              </View>
            );
          })}
        </View>

        {/* Recent notifications */}
        <Text style={styles.sectionLabel}>Recent Notifications</Text>
        <View style={styles.card}>
          {NOTIFICATIONS.map((n, idx) => {
            const tone = TONE_MAP[n.tone];
            const isLast = idx === NOTIFICATIONS.length - 1;
            return (
              <View key={n.id} style={[styles.row, styles.feedRow, !isLast && styles.rowDivider]}>
                <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
                  <Ionicons name={n.icon} size={scale(18)} color={tone.fg} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTitleLine}>
                    <Text style={[styles.rowLabel, n.unread && styles.rowLabelUnread]} numberOfLines={1}>
                      {n.title}
                    </Text>
                    {n.unread ? (
                      <View style={[styles.unreadDot, { backgroundColor: tone.fg }]} />
                    ) : null}
                  </View>
                  <Text style={styles.rowSubtitle} numberOfLines={2}>{n.subtitle}</Text>
                  <Text style={styles.feedTimestamp}>{n.timestamp}</Text>
                </View>
              </View>
            );
          })}
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
  feedRow: {
    alignItems: 'flex-start',
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
  rowLabelUnread: {
    fontFamily: FontFamily.bold,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  feedTimestamp: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    marginTop: 4,
  },
});

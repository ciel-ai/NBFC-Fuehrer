import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { EmptyState } from '@/src/shared/components/common/EmptyState';
import { scale } from '@/src/core/utils/responsive';

type NotifType = 'case' | 'overdue' | 'escalation' | 'gold_alert' | 'approved';

interface AgentNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  route?: Parameters<typeof router.push>[0];
}

const ICON_MAP: Record<NotifType, { name: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  case:       { name: 'document-text', bg: Colors.primaryLight, color: Colors.primary },
  overdue:    { name: 'call',          bg: Colors.errorLight,   color: Colors.error },
  escalation: { name: 'arrow-up-circle', bg: Colors.goldLight,  color: Colors.goldDark },
  gold_alert: { name: 'diamond',       bg: Colors.tealLight,    color: Colors.teal },
  approved:   { name: 'checkmark-circle', bg: Colors.successLight, color: Colors.success },
};

// Placeholder data — replace with the agent notification feed when backend is ready.
const MOCK_NOTIFICATIONS: AgentNotification[] = [
  { id: 'n1', type: 'case', title: 'New KYC review assigned', body: 'Application LOS-AP-20583 was flagged for low face match. Review pending.', time: '5m ago', isRead: false, route: '/(main)/agent/kyc-review' },
  { id: 'n2', type: 'case', title: 'New compliance review', body: 'PEP flag raised on LOS-CMP-20640. Needs human judgment.', time: '20m ago', isRead: false, route: '/(main)/agent/compliance-review' },
  { id: 'n3', type: 'overdue', title: 'Overdue follow-up due', body: 'Ramesh Babu (LOS-GL-19211) is 12 days overdue. Call scheduled.', time: '1h ago', isRead: false, route: '/(main)/agent/overdue' },
  { id: 'n4', type: 'gold_alert', title: 'Gold LTV breach', body: 'LTV crossed 90% on LOS-GL-19211. Contact customer for top-up.', time: '3h ago', isRead: true, route: '/(main)/agent/gold-price-alert' },
  { id: 'n5', type: 'escalation', title: 'NPA escalation update', body: 'Lakshmi V. (LOS-CD-19847) forwarded to senior recovery officer.', time: '1d ago', isRead: true, route: '/(main)/agent/escalation' },
  { id: 'n6', type: 'approved', title: 'Appraisal confirmed', body: 'Gold appraisal for Sundaram K. confirmed — LOS proceeding.', time: '2d ago', isRead: true },
];

function NotificationItem({ item }: { item: AgentNotification }) {
  const cfg = ICON_MAP[item.type];
  return (
    <Pressable
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => { if (item.route) router.push(item.route); }}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}. ${item.time}`}
      accessibilityState={{ selected: !item.isRead }}
    >
      {!item.isRead && <View style={styles.unreadDot} />}
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.name} size={scale(20)} color={cfg.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
      </View>
    </Pressable>
  );
}

export default function AgentNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Notifications" showBack onBack={() => router.back()} />
      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} />}
        removeClippedSubviews
        contentContainerStyle={[
          styles.list,
          MOCK_NOTIFICATIONS.length === 0 && styles.listEmpty,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="No notifications" subtitle="New case assignments, overdue alerts, and escalations will appear here." />
        }
        accessibilityLabel="Agent notifications list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingTop: Spacing.sm },
  listEmpty: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.background, position: 'relative' },
  itemUnread: { backgroundColor: Colors.primaryLight },
  unreadDot: { position: 'absolute', top: Spacing.md + 6, left: Spacing.sm, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  iconWrap: { width: scale(40), height: scale(40), borderRadius: scale(20), alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md, flexShrink: 0 },
  body: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  title: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  time: { ...Typography.caption, color: Colors.textSecondary, flexShrink: 0 },
  bodyText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.xl + scale(40) + Spacing.md },
});

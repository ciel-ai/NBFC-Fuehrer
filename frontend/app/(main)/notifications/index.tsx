import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { EmptyState } from '@/src/shared/components/common/EmptyState';
import { scale } from '@/src/core/utils/responsive';

type NotifType = 'emi' | 'loan' | 'kyc' | 'offer';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
}

const ICON_MAP: Record<NotifType, { name: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  emi:   { name: 'calendar',           bg: Colors.errorLight,    color: Colors.error },
  loan:  { name: 'checkmark-circle',   bg: Colors.successLight,  color: Colors.success },
  kyc:   { name: 'shield-checkmark',   bg: Colors.primaryLight,  color: Colors.primary },
  offer: { name: 'pricetag',           bg: Colors.goldLight,     color: Colors.goldDark },
};

// Placeholder data — replace with real API call when notification service is ready
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'emi',
    title: 'EMI Due in 3 Days',
    body: 'Your EMI of ₹4,523 for Loan #GL2024001 is due on 21 May 2026.',
    time: '2h ago',
    isRead: false,
  },
  {
    id: 'n2',
    type: 'loan',
    title: 'Loan Disbursed',
    body: 'Your Gold Loan of ₹75,000 has been credited to your account.',
    time: '1d ago',
    isRead: false,
  },
  {
    id: 'n3',
    type: 'kyc',
    title: 'KYC Verified',
    body: 'Your PAN and Aadhaar details have been successfully verified.',
    time: '3d ago',
    isRead: true,
  },
  {
    id: 'n4',
    type: 'offer',
    title: 'Pre-approved Offer',
    body: 'You are pre-approved for a Consumer Durable Loan of up to ₹2,00,000. Check details.',
    time: '5d ago',
    isRead: true,
  },
];

function NotificationItem({ item }: { item: Notification }) {
  const iconCfg = ICON_MAP[item.type];
  return (
    <Pressable
      style={[styles.item, !item.isRead && styles.itemUnread]}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}. ${item.time}`}
      accessibilityState={{ selected: !item.isRead }}
    >
      {!item.isRead && <View style={styles.unreadDot} />}
      <View style={[styles.iconWrap, { backgroundColor: iconCfg.bg }]}>
        <Ionicons name={iconCfg.name} size={scale(20)} color={iconCfg.color} />
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

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Notifications" showBack />

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            subtitle="We'll notify you about EMI reminders, loan updates, and exclusive offers."
          />
        }
        accessibilityLabel="Notifications list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingTop: Spacing.sm },
  listEmpty: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  itemUnread: {
    backgroundColor: Colors.primaryLight,
  },
  unreadDot: {
    position: 'absolute',
    top: Spacing.md + 6,
    left: Spacing.sm,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  body: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  title: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  time: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  bodyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.xl + scale(40) + Spacing.md,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { EmptyState } from '@/src/shared/components/common/EmptyState';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { scale } from '@/src/core/utils/responsive';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { AppNotification, NotificationType } from '@/src/entities/notification';

const ICON_MAP: Record<NotificationType, { name: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  emi_due:         { name: 'calendar',         bg: Colors.errorLight,   color: Colors.error },
  emi_paid:        { name: 'checkmark-circle', bg: Colors.successLight, color: Colors.success },
  loan_approved:   { name: 'checkmark-circle', bg: Colors.successLight, color: Colors.success },
  loan_disbursed:  { name: 'cash',             bg: Colors.successLight, color: Colors.success },
  kyc_update:      { name: 'shield-checkmark', bg: Colors.primaryLight, color: Colors.primary },
  payment_failed:  { name: 'alert-circle',     bg: Colors.errorLight,   color: Colors.error },
  nach_registered: { name: 'repeat',           bg: Colors.primaryLight, color: Colors.primary },
  general:         { name: 'notifications',    bg: Colors.primaryLight, color: Colors.primary },
};

/** Compact "time ago" label from an ISO timestamp. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.floor(mon / 12)}y ago`;
}

function NotificationItem({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  const iconCfg = ICON_MAP[item.type] ?? ICON_MAP.general;
  return (
    <Pressable
      style={[styles.item, !item.isRead && styles.itemUnread]}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}. ${relativeTime(item.createdAt)}`}
      accessibilityState={{ selected: !item.isRead }}
    >
      {!item.isRead && <View style={styles.unreadDot} />}
      <View style={[styles.iconWrap, { backgroundColor: iconCfg.bg }]}>
        <Ionicons name={iconCfg.name} size={scale(20)} color={iconCfg.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { notificationService } = useServices();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await notificationService.getNotifications();
        if (!isMountedRef.current) return;
        setNotifications(res.notifications);
      } catch {
        if (isMountedRef.current) {
          setErrorMessage('Could not load notifications. Please check your connection.');
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    [notificationService],
  );

  useEffect(() => {
    isMountedRef.current = true;
    void load('initial');
    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load('refresh');
    if (isMountedRef.current) setRefreshing(false);
  }, [load]);

  const handlePress = useCallback(
    async (item: AppNotification) => {
      // Optimistically mark read, then persist.
      if (!item.isRead) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        try {
          await notificationService.markAsRead(item.id);
        } catch {
          // Non-fatal: the unread badge will reconcile on next load.
        }
      }
      // Deep-link to the referenced loan when present.
      const loanId = item.data?.loanId;
      if (loanId) {
        router.push({ pathname: '/(main)/loan-detail/[id]', params: { id: loanId } });
      }
    },
    [notificationService],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Notifications" showBack />
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Notifications" showBack />
        <ErrorView
          title="Notifications unavailable"
          message={errorMessage}
          onRetry={() => load('initial')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Notifications" showBack />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
        removeClippedSubviews
        contentContainerStyle={[
          styles.list,
          notifications.length === 0 && styles.listEmpty,
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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

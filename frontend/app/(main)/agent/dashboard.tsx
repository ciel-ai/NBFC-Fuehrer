import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { useUserStore } from '@/src/store/userStore';
import { useAuthStore } from '@/src/store/authStore';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { AgentPendingCounters } from '@/src/entities/agent';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface PendingAction {
  id: string;
  label: string;
  sublabel: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  fg: string;
  bg: string;
  route: Parameters<typeof router.push>[0];
}

function buildPendingActions(c: AgentPendingCounters): PendingAction[] {
  return [
    { id: 'kyc', label: 'KYC Review', sublabel: 'Applications flagged', count: c.kycReview, icon: 'document-text-outline', fg: Colors.primary, bg: Colors.primaryLight, route: '/(main)/agent/kyc-review' },
    { id: 'compliance', label: 'Compliance Review', sublabel: 'PEP / alert flags', count: c.complianceReview, icon: 'shield-checkmark-outline', fg: Colors.purple, bg: Colors.purpleLight, route: '/(main)/agent/compliance-review' },
    { id: 'credit', label: 'Credit Review', sublabel: 'CIBIL 550–700', count: c.creditReview, icon: 'trending-up-outline', fg: Colors.goldDark, bg: Colors.goldLight, route: '/(main)/agent/credit-review' },
    { id: 'gold', label: 'Gold Appraisal', sublabel: 'Valuation needed', count: c.goldAppraisal, icon: 'diamond-outline', fg: Colors.teal, bg: Colors.tealLight, route: '/(main)/agent/gold-appraisal' },
    { id: 'housing', label: 'Housing Review', sublabel: 'Manual sign-off', count: c.housingReview, icon: 'home-outline', fg: Colors.primary, bg: Colors.primaryLight, route: '/(main)/agent/housing-review' },
    { id: 'overdue', label: 'Overdue Follow-up', sublabel: 'High priority', count: c.overdueFollowup, icon: 'call-outline', fg: Colors.error, bg: Colors.errorLight, route: '/(main)/agent/overdue' },
  ];
}

const EMPTY_COUNTERS: AgentPendingCounters = {
  kycReview: 0,
  complianceReview: 0,
  creditReview: 0,
  goldAppraisal: 0,
  housingReview: 0,
  overdueFollowup: 0,
};

interface ActivityItem {
  id: string;
  title: string;
  meta: string;
  dot: string;
}

const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    title: 'Loan Approved: #LN-9021',
    meta: '2 mins ago • Gold Loan',
    dot: Colors.success,
  },
  {
    id: '2',
    title: 'KYC Re-submitted: #LN-8812',
    meta: '45 mins ago • Gold Loan',
    dot: Colors.goldDark,
  },
  {
    id: '3',
    title: 'Doc Uploaded: #LN-9044',
    meta: '2 hours ago • Home Loan',
    dot: Colors.primary,
  },
  {
    id: '4',
    title: 'Follow-up Failed: #LN-7721',
    meta: '4 hours ago • Collections',
    dot: Colors.error,
  },
  {
    id: '5',
    title: 'Disbursement Finalized',
    meta: 'Yesterday • #LN-8800',
    dot: Colors.success,
  },
];

interface NavTab {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const NAV_TABS: NavTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
  { id: 'los', label: 'LOS', icon: 'document-text-outline', iconActive: 'document-text' },
  { id: 'lms', label: 'LMS', icon: 'cash-outline', iconActive: 'cash' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ANDROID_STATUS_PAD = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

export default function AgentDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { agentService } = useServices();
  const [counters, setCounters] = React.useState<AgentPendingCounters>(EMPTY_COUNTERS);

  React.useEffect(() => {
    let mounted = true;
    void agentService
      .getPendingCounters()
      .then((c) => { if (mounted) setCounters(c); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [agentService]);

  const pendingActions = buildPendingActions(counters);
  const user = useUserStore((s) => s.user);
  const fallback = 'Rajesh Kumar';
  const agentName = user?.name ?? fallback;
  const agentInitials = agentName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const onLogout = () => {
    Alert.alert('Sign out?', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await useAuthStore.getState().logout();
          router.replace('/(public)');
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
      <View style={[styles.header, { paddingTop: ANDROID_STATUS_PAD + Spacing.sm }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.iconBtn}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              onPress={onLogout}
            >
              <Ionicons name="menu" size={scale(24)} color={Colors.textWhite} />
            </Pressable>

            <Text style={styles.headerTitle}>Dashboard</Text>

            <View style={styles.headerRight}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => router.push('/(main)/agent/notifications')}
                android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 20 }}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={scale(22)} color={Colors.textWhite} />
                <View style={styles.notifBadge} />
              </Pressable>

              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{agentInitials}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ---------------------------------------------------------------- */}
      {/* Scrollable body                                                  */}
      {/* ---------------------------------------------------------------- */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Agent Info Card */}
        <View style={styles.agentCard}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agentName}</Text>
            <Text style={styles.agentId}>ID: AGT-88291</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        {/* Pending Actions */}
        <Text style={styles.sectionLabel}>PENDING ACTIONS</Text>
        <View style={styles.bentoGrid}>
          {pendingActions.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.bentoCell, pressed && styles.pressed]}
              onPress={() => router.push(item.route)}
              android_ripple={{ color: `${item.fg}18` }}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${item.count}`}
            >
              <View style={[styles.bentoIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={scale(20)} color={item.fg} />
              </View>
              <Text style={[styles.bentoCount, { color: Colors.textPrimary }]}>{item.count}</Text>
              <Text style={styles.bentoLabel}>{item.label}</Text>
              <Text style={styles.bentoSub}>{item.sublabel}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="View all recent activity">
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.activityCard}>
          {RECENT_ACTIVITY.map((item, idx) => (
            <Pressable
              key={item.id}
              style={[
                styles.activityRow,
                idx < RECENT_ACTIVITY.length - 1 && styles.activityBorder,
              ]}
              android_ripple={{ color: `${Colors.primary}10` }}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.meta}`}
            >
              <View style={[styles.dot, { backgroundColor: item.dot }]} />
              <View style={styles.activityText}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.activityMeta}>{item.meta}</Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ---------------------------------------------------------------- */}
      {/* Bottom Nav                                                        */}
      {/* ---------------------------------------------------------------- */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + Spacing.xs }]}>
        {NAV_TABS.map((tab) => {
          const isActive = tab.id === 'dashboard';
          return (
            <Pressable
              key={tab.id}
              style={styles.navItem}
              onPress={() => {
                if (tab.id === 'profile') router.push('/(main)/agent/profile');
                else if (tab.id === 'lms') router.push('/(main)/agent/overdue');
              }}
              android_ripple={{ color: `${Colors.primary}15`, borderless: true, radius: 36 }}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              {isActive ? (
                <View style={styles.navPill}>
                  <Ionicons name={tab.iconActive} size={scale(20)} color={Colors.textPrimary} />
                  <Text style={styles.navLabelActive}>{tab.label}</Text>
                </View>
              ) : (
                <View style={styles.navItemInner}>
                  <Ionicons name={tab.icon} size={scale(22)} color={Colors.textSecondary} />
                  <Text style={styles.navLabel}>{tab.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FF' },
  flex: { flex: 1 },

  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    ...Shadow.medium,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: verticalScale(44),
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textWhite,
    flex: 1,
    marginLeft: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: scale(6),
    right: scale(6),
    width: scale(7),
    height: scale(7),
    borderRadius: scale(4),
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  avatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#8bcafd',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: '#001e30',
  },

  // Content
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },

  // Agent Card
  agentCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  agentInfo: { gap: 2 },
  agentName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  agentId: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  activeBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  activeBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.success,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: Spacing.sm,
  },
  viewAll: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  bentoCell: {
    width: '46%',
    flex: 1,
    minWidth: scale(140),
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  pressed: { opacity: 0.75 },
  bentoIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  bentoCount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.textPrimary,
  },
  bentoLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  bentoSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Activity
  activityCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  activityText: { flex: 1 },
  activityTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  activityMeta: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.medium,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  navItemInner: {
    alignItems: 'center',
    gap: 2,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8bcafd',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  navLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  navLabelActive: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
});

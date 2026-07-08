import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { EMISchedule } from '@/src/entities/loan';

type FilterTab = 'all' | 'paid' | 'upcoming' | 'overdue';

// Fallback for legacy seeded loans that have no generated schedule.
const MOCK_SCHEDULE: EMISchedule[] = [
  { id: 'e1',  loanId: 'L1', dueDate: '2025-07-05', amount: 9800, principal: 6200, interest: 3600, status: 'paid',    paidAt: '2025-07-03' },
  { id: 'e2',  loanId: 'L1', dueDate: '2025-08-05', amount: 9800, principal: 6350, interest: 3450, status: 'paid',    paidAt: '2025-08-04' },
  { id: 'e3',  loanId: 'L1', dueDate: '2025-09-05', amount: 9800, principal: 6500, interest: 3300, status: 'paid',    paidAt: '2025-09-05' },
  { id: 'e4',  loanId: 'L1', dueDate: '2025-10-05', amount: 9800, principal: 6650, interest: 3150, status: 'overdue', },
  { id: 'e5',  loanId: 'L1', dueDate: '2025-11-05', amount: 9800, principal: 6810, interest: 2990, status: 'pending', },
  { id: 'e6',  loanId: 'L1', dueDate: '2025-12-05', amount: 9800, principal: 6970, interest: 2830, status: 'pending', },
  { id: 'e7',  loanId: 'L1', dueDate: '2026-01-05', amount: 9800, principal: 7130, interest: 2670, status: 'pending', },
  { id: 'e8',  loanId: 'L1', dueDate: '2026-02-05', amount: 9800, principal: 7300, interest: 2500, status: 'pending', },
  { id: 'e9',  loanId: 'L1', dueDate: '2026-03-05', amount: 9800, principal: 7470, interest: 2330, status: 'pending', },
  { id: 'e10', loanId: 'L1', dueDate: '2026-04-05', amount: 9800, principal: 7640, interest: 2160, status: 'pending', },
  { id: 'e11', loanId: 'L1', dueDate: '2026-05-05', amount: 9800, principal: 7820, interest: 1980, status: 'pending', },
  { id: 'e12', loanId: 'L1', dueDate: '2026-06-05', amount: 9800, principal: 8000, interest: 1800, status: 'pending', },
];

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'paid',     label: 'Paid' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue',  label: 'Overdue' },
];

const STATUS_META: Record<EMISchedule['status'], { label: string; color: string; bg: string; icon: string }> = {
  paid:    { label: 'Paid',    color: Colors.success, bg: Colors.successLight, icon: 'checkmark-circle' },
  pending: { label: 'Due',     color: Colors.primary, bg: Colors.primaryLight, icon: 'time-outline' },
  overdue: { label: 'Overdue', color: Colors.error,   bg: Colors.errorLight,   icon: 'warning-outline' },
};

function EMIRow({ emi, index, onPayPress }: { emi: EMISchedule; index: number; onPayPress: () => void }) {
  const meta = STATUS_META[emi.status];
  const isOverdue = emi.status === 'overdue';

  return (
    <View style={[styles.emiRow, isOverdue && styles.emiRowOverdue]}>
      <View style={styles.emiLeft}>
        <Text style={styles.emiIndex}>#{String(index).padStart(2, '0')}</Text>
        <View style={styles.emiDetails}>
          <Text style={styles.emiDate}>{formatDate(emi.dueDate)}</Text>
          <Text style={styles.emiBreakdown}>
            P: {formatCurrency(emi.principal)} · I: {formatCurrency(emi.interest)}
          </Text>
          {emi.paidAt && (
            <Text style={styles.emiPaidOn}>Paid on {formatDate(emi.paidAt)}</Text>
          )}
        </View>
      </View>

      <View style={styles.emiRight}>
        <Text style={styles.emiAmount}>{formatCurrency(emi.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={scale(10)} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {(emi.status === 'pending' || emi.status === 'overdue') && (
          <Pressable
            style={styles.payBtn}
            onPress={onPayPress}
            accessibilityRole="button"
            accessibilityLabel={`Pay EMI ${index}`}
          >
            <Text style={styles.payBtnText}>Pay</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function EMIScheduleScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loanService } = useServices();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [fetched, setFetched] = useState<EMISchedule[] | null>(null);

  useEffect(() => {
    let mounted = true;
    const loanId = Array.isArray(id) ? id[0] : id;
    if (!loanId) return;
    void loanService
      .getEMISchedule(loanId)
      .then((data) => { if (mounted && data.length > 0) setFetched(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [id, loanService]);

  // Dynamic schedule (generated from actual amount/tenure/18% interest) when
  // available; falls back to the demo schedule for legacy seeded loans.
  const schedule = fetched ?? MOCK_SCHEDULE;

  const nextDue = schedule.find((e) => e.status === 'pending');

  const filteredEMIs = schedule.filter((e) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'paid') return e.status === 'paid';
    if (activeTab === 'upcoming') return e.status === 'pending';
    if (activeTab === 'overdue') return e.status === 'overdue';
    return true;
  });

  const paidCount = schedule.filter((e) => e.status === 'paid').length;
  const overdueCount = schedule.filter((e) => e.status === 'overdue').length;
  const outstanding = schedule
    .filter((e) => e.status !== 'paid')
    .reduce((s, e) => s + e.amount, 0);

  const handlePayEMI = (emi: EMISchedule) => {
    router.push({
      pathname: '/(main)/loan-detail/pay-emi',
      params: { emiId: emi.id, loanId: id ?? 'L1', amount: String(emi.amount), dueDate: emi.dueDate },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="EMI Schedule" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{schedule.length}</Text>
              <Text style={styles.summaryKey}>Total EMIs</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>{paidCount}</Text>
              <Text style={styles.summaryKey}>Paid</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: schedule.length - paidCount > 0 ? Colors.primary : Colors.success }]}>
                {schedule.length - paidCount}
              </Text>
              <Text style={styles.summaryKey}>Remaining</Text>
            </View>
            {overdueCount > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: Colors.error }]}>{overdueCount}</Text>
                  <Text style={styles.summaryKey}>Overdue</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.outstandingRow}>
            <Text style={styles.outstandingLabel}>Outstanding Amount</Text>
            <Text style={styles.outstandingVal}>{formatCurrency(outstanding)}</Text>
          </View>
        </View>

        {nextDue && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderRow}>
              <Ionicons name="notifications-outline" size={scale(16)} color={Colors.primary} />
              <Text style={styles.reminderText}>
                Reminder scheduled (AWS SNS) before {formatDate(nextDue.dueDate)}.
              </Text>
            </View>
            <View style={styles.reminderRow}>
              <Ionicons name="repeat" size={scale(16)} color={Colors.primary} />
              <Text style={styles.reminderText}>
                NACH auto-debit of {formatCurrency(nextDue.amount)} on the 5th via Razorpay.
              </Text>
            </View>
            <View style={styles.reminderRow}>
              <Ionicons name="receipt-outline" size={scale(16)} color={Colors.primary} />
              <Text style={styles.reminderText}>Receipts are generated and stored in AWS S3 after each successful debit.</Text>
            </View>
          </View>
        )}

        {overdueCount > 0 && (
          <View style={styles.overdueAlert}>
            <Ionicons name="warning" size={scale(18)} color={Colors.error} />
            <Text style={styles.overdueAlertText}>
              You have {overdueCount} overdue EMI{overdueCount > 1 ? 's' : ''}. Pay now to avoid
              late penalty charges.
            </Text>
          </View>
        )}

        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const count = tab.key === 'all' ? schedule.length
              : tab.key === 'paid' ? paidCount
              : tab.key === 'upcoming' ? schedule.filter((e) => e.status === 'pending').length
              : overdueCount;

            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: activeTab === tab.key }}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>#  EMI</Text>
          <Text style={styles.tableHeaderText}>Amount</Text>
        </View>

        <View style={styles.emiList}>
          {filteredEMIs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={scale(40)} color={Colors.textDisabled} />
              <Text style={styles.emptyText}>No EMIs in this category</Text>
            </View>
          ) : (
            filteredEMIs.map((emi, i) => (
              <EMIRow
                key={emi.id}
                emi={emi}
                index={schedule.indexOf(emi) + 1}
                onPayPress={() => handlePayEMI(emi)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  summaryKey: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  outstandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  outstandingLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },
  outstandingVal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
  },

  reminderCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reminderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  reminderText: { ...Typography.caption, color: Colors.primary, flex: 1, lineHeight: 18 },

  overdueAlert: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  overdueAlertText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
    lineHeight: 18,
  },

  tabRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  tabActive: { backgroundColor: Colors.background, ...Shadow.small },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  tabTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold },
  tabBadge: {
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeActive: { backgroundColor: Colors.primaryLight },
  tabBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: { color: Colors.primary },

  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  tableHeaderText: {
    ...Typography.label,
    color: Colors.textDisabled,
  },

  emiList: { gap: Spacing.xs },

  emiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  emiRowOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  emiLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  emiIndex: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    width: scale(28),
  },
  emiDetails: { flex: 1 },
  emiDate: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  emiBreakdown: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emiPaidOn: {
    ...Typography.tiny,
    color: Colors.success,
    marginTop: 2,
  },

  emiRight: { alignItems: 'flex-end', gap: 4 },
  emiAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: 2,
  },
  payBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textWhite,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textDisabled,
  },
});

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import {
  CallLogItem,
  OverdueCustomer,
} from '@/src/features/agent/components/CallLogItem';
import { dialPhone } from '@/src/core/utils/linking';

const ALL: OverdueCustomer[] = [
  { id: 'c1', name: 'Ramesh Babu',    loanId: 'LOS-GL-19211', emiAmount: '₹4,250',  daysOverdue: 12, severity: 'overdue', phone: '+91 98XX XXX 781' },
  { id: 'c2', name: 'Lakshmi V.',     loanId: 'LOS-CD-19847', emiAmount: '₹6,180',  daysOverdue: 38, severity: 'npa',     phone: '+91 98XX XXX 102' },
  { id: 'c3', name: 'Saurabh Gupta',  loanId: 'LOS-HL-19012', emiAmount: '₹28,750', daysOverdue: 67, severity: 'auction', phone: '+91 98XX XXX 553' },
  { id: 'c4', name: 'Anjali Rao',     loanId: 'LOS-CD-19915', emiAmount: '₹3,120',  daysOverdue: 8,  severity: 'overdue', phone: '+91 98XX XXX 247' },
  { id: 'c5', name: 'Mohammed Faiz',  loanId: 'LOS-GL-19320', emiAmount: '₹5,400',  daysOverdue: 45, severity: 'npa',     phone: '+91 98XX XXX 631' },
  { id: 'c6', name: 'Deepak Sharma',  loanId: 'LOS-CD-19888', emiAmount: '₹4,850',  daysOverdue: 15, severity: 'overdue', phone: '+91 98XX XXX 415' },
  { id: 'c7', name: 'Kavya Pillai',   loanId: 'LOS-CD-19944', emiAmount: '₹2,990',  daysOverdue: 22, severity: 'overdue', phone: '+91 98XX XXX 882' },
  { id: 'c8', name: 'Tej Singh',      loanId: 'LOS-HL-19121', emiAmount: '₹31,400', daysOverdue: 92, severity: 'auction', phone: '+91 98XX XXX 199' },
  { id: 'c9', name: 'Sara Khan',      loanId: 'LOS-CD-19901', emiAmount: '₹3,750',  daysOverdue: 6,  severity: 'overdue', phone: '+91 98XX XXX 044' },
];

type Filter = 'all' | 'overdue' | 'npa' | 'auction';

const FILTERS: { id: Filter; label: string; count?: number }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'npa', label: 'NPA risk' },
  { id: 'auction', label: 'Auction' },
];

export default function OverdueListScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return ALL.filter((c) => {
      const matchesFilter = filter === 'all' || c.severity === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.loanId.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Overdue accounts"
        subtitle={`${filtered.length} customer${filtered.length === 1 ? '' : 's'}`}
      />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={scale(18)} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or loan ID"
              placeholderTextColor={Colors.textDisabled}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search overdue accounts"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={scale(18)} color={Colors.textDisabled} />
              </Pressable>
            )}
          </View>

          {/* Filter chips */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter: ${f.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active && styles.filterTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <CallLogItem
              customer={item}
              onPress={() => {
                // Route by severity: auction → gold auction; NPA → legal (housing) /
                // escalation (others); otherwise the standard call-log follow-up.
                if (item.severity === 'auction') {
                  router.push({ pathname: '/(main)/agent/gold-auction', params: { loanId: item.loanId } });
                } else if (item.severity === 'npa') {
                  router.push({
                    pathname: item.loanId.startsWith('LOS-HL')
                      ? '/(main)/agent/legal-notice'
                      : '/(main)/agent/escalation',
                    params: { loanId: item.loanId },
                  });
                } else {
                  router.push({ pathname: '/(main)/agent/call-log', params: { id: item.id, name: item.name } });
                }
              }}
              onCallPress={item.phone ? () => void dialPhone(item.phone!) : undefined}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle" size={scale(40)} color={Colors.success} />
              <Text style={styles.emptyTitle}>No overdue accounts</Text>
              <Text style={styles.emptySub}>You're all caught up.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    minHeight: verticalScale(44),
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minHeight: verticalScale(32),
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textWhite,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  sep: { height: Spacing.sm },
  empty: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  emptySub: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});

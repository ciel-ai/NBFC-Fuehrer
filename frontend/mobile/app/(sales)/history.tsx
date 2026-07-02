import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Badge } from '@/src/shared/components/common/Badge';
import { EmptyState } from '@/src/shared/components/common/EmptyState';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { getProductConfig } from '@/src/features/sales/config';
import { useApplicationList } from '@/src/features/sales/queries/useSalesQueries';
import { useSalesStore } from '@/src/store/salesStore';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { scale } from '@/src/core/utils/responsive';
import type {
  SalesApplicationStatus,
  SalesApplicationSummary,
  SalesProduct,
} from '@/src/entities/salesAgent';

const COMPLETED_STATUSES: SalesApplicationStatus[] = ['submitted', 'approved', 'disbursed', 'rejected'];

const STATUS_META: Record<
  SalesApplicationStatus,
  { label: string; variant: 'success' | 'error' | 'info' | 'warning' }
> = {
  draft: { label: 'Draft', variant: 'warning' },
  submitted: { label: 'Submitted', variant: 'info' },
  in_review: { label: 'In Review', variant: 'info' },
  site_visit_pending: { label: 'Site Visit Pending', variant: 'warning' },
  valuation_pending: { label: 'Valuation Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  disbursed: { label: 'Disbursed', variant: 'success' },
};

function useActiveSalesProduct(): SalesProduct {
  return useSalesStore((s) => s.product ?? s.agent?.product ?? 'cdl');
}

function HistorySection({
  product,
  status,
  onItems,
}: {
  product: SalesProduct;
  status: SalesApplicationStatus;
  onItems: (status: SalesApplicationStatus, count: number) => void;
}) {
  const { data, isLoading, isError, refetch } = useApplicationList(product, status);

  React.useEffect(() => {
    onItems(status, data?.length ?? 0);
  }, [data?.length, onItems, status]);

  if (isLoading) {
    return (
      <View style={styles.loadingRow}>
        <LoadingSpinner size={scale(28)} />
      </View>
    );
  }

  if (isError) {
    return <ErrorView title="Could not load history" message="Please try again." onRetry={() => refetch()} />;
  }

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{STATUS_META[status].label}</Text>
      {data.map((item) => (
        <HistoryRow key={item.applicationId} item={item} />
      ))}
    </View>
  );
}

function HistoryRow({ item }: { item: SalesApplicationSummary }) {
  const meta = STATUS_META[item.status];
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <Text style={styles.metaText}>
          {item.applicationId}
          {item.amount ? ` · ${formatCurrency(item.amount)}` : ''}
        </Text>
        <Text style={styles.metaText}>Updated {formatDate(item.updatedAt)}</Text>
      </View>
      <Badge label={meta.label} variant={meta.variant} />
    </View>
  );
}

export default function SalesHistoryRoute() {
  const product = useActiveSalesProduct();
  const config = getProductConfig(product);
  const [itemCounts, setItemCounts] = React.useState<Record<SalesApplicationStatus, number>>(
    {} as Record<SalesApplicationStatus, number>,
  );

  const setCount = React.useCallback((status: SalesApplicationStatus, count: number) => {
    setItemCounts((current) => {
      if ((current[status] ?? 0) === count) return current;
      return { ...current, [status]: count };
    });
  }, []);

  const hasAny = COMPLETED_STATUSES.some((status) => (itemCounts[status] ?? 0) > 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={`${config.shortTitle} History`} showBack={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {COMPLETED_STATUSES.map((status) => (
          <HistorySection
            key={status}
            product={product}
            status={status}
            onItems={setCount}
          />
        ))}
        {!hasAny ? (
          <EmptyState
            icon="time-outline"
            title="No completed sales yet"
            subtitle="Submitted, approved, disbursed, and rejected applications will appear here."
            style={styles.empty}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowBody: { flex: 1 },
  customerName: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  empty: {
    flex: 0,
    paddingVertical: Spacing.xl,
  },
});

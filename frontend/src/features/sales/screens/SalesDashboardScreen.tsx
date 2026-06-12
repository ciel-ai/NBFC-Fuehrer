import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { Badge } from '@/src/shared/components/common/Badge';
import { EmptyState } from '@/src/shared/components/common/EmptyState';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency } from '@/src/core/utils/formatters';
import { DashboardTile } from '@/src/features/sales/components/DashboardTile';
import { DraftCard } from '@/src/features/sales/components/DraftCard';
import { getProductConfig } from '@/src/features/sales/config';
import {
  useApplicationList,
  useCustomerSearch,
  useDashboardCounts,
} from '@/src/features/sales/queries/useSalesQueries';
import { useOfflineFlush } from '@/src/features/sales/hooks/useOfflineFlush';
import { useSalesStore } from '@/src/store/salesStore';
import { resetAllStores } from '@/src/store/storeResetters';
import { SALES_PRODUCT_SHORT } from '@/src/entities/salesAgent';
import type {
  SalesApplicationStatus,
  SalesProduct,
} from '@/src/entities/salesAgent';

const STATUS_META: Record<
  string,
  { label: string; variant: 'success' | 'error' | 'info' | 'warning' }
> = {
  submitted: { label: 'Submitted', variant: 'info' },
  in_review: { label: 'In Review', variant: 'info' },
  site_visit_pending: { label: 'Site Visit Pending', variant: 'warning' },
  valuation_pending: { label: 'Valuation Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  disbursed: { label: 'Disbursed', variant: 'success' },
};

export function SalesDashboardScreen({ product }: { product: SalesProduct }) {
  const config = getProductConfig(product);
  const totalSteps = config.steps.length;

  const agentName = useSalesStore((s) => s.agent?.name ?? 'Agent');
  const branch = useSalesStore((s) => s.agent?.branch ?? '');
  const allDrafts = useSalesStore((s) => s.drafts);
  const deleteDraft = useSalesStore((s) => s.deleteDraft);
  const startDraft = useSalesStore((s) => s.startDraft);

  const drafts = useMemo(
    () =>
      Object.values(allDrafts)
        .filter((d) => d.product === product)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [allDrafts, product],
  );

  const { counts, isLoading, isError, refetch } = useDashboardCounts(product);
  const { pending } = useOfflineFlush();

  const [selectedStatus, setSelectedStatus] = useState<SalesApplicationStatus | null>(null);
  const [search, setSearch] = useState('');

  const handleTile = (key: string) => {
    if (key === 'new') {
      const id = startDraft(product);
      router.push({ pathname: '/(sales)/new-sale', params: { draftId: id } });
      return;
    }
    if (key === 'draft') {
      setSelectedStatus(null);
      return;
    }
    setSelectedStatus((prev) => (prev === key ? null : (key as SalesApplicationStatus)));
  };

  const handleNew = () => {
    const id = startDraft(product);
    router.push({ pathname: '/(sales)/new-sale', params: { draftId: id } });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Leave the sales dashboard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await resetAllStores();
          router.replace('/(public)');
        },
      },
    ]);
  };

  const resumeDraft = (draftId: string) => {
    router.push({ pathname: '/(sales)/new-sale', params: { draftId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={`${config.shortTitle} Dashboard`}
        showBack={false}
        rightComponent={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/(main)/notifications')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={scale(22)} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={scale(22)} color={Colors.error} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>Hello, {agentName}</Text>
        {branch ? <Text style={styles.branch}>{branch}</Text> : null}

        {/* Offline sync banner */}
        {pending > 0 ? (
          <View style={styles.offlineBanner} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={scale(18)} color={Colors.goldDark} />
            <Text style={styles.offlineText}>
              {pending} application{pending > 1 ? 's' : ''} waiting to sync
            </Text>
          </View>
        ) : null}

        {/* Search customer */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={scale(18)} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer by name or phone"
            placeholderTextColor={Colors.textDisabled}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            accessibilityLabel="Search customer"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={scale(18)} color={Colors.textDisabled} />
            </Pressable>
          ) : null}
        </View>
        {search.trim().length >= 3 ? <CustomerResults query={search} /> : null}

        {/* Tiles / counts */}
        {isError ? (
          <ErrorView
            title="Couldn’t load dashboard"
            message="We couldn’t fetch your application counts."
            onRetry={() => refetch()}
          />
        ) : (
          <View style={styles.tilesGrid}>
            {config.tiles.map((tile) => (
              <View key={tile.key} style={styles.tileCol}>
                <DashboardTile
                  label={tile.label}
                  icon={tile.icon}
                  color={tile.color}
                  bg={tile.bg}
                  count={tile.key === 'draft' ? drafts.length : counts[tile.key as keyof typeof counts]}
                  loading={isLoading && tile.key !== 'draft' && tile.key !== 'new'}
                  onPress={() => handleTile(tile.key)}
                />
              </View>
            ))}
          </View>
        )}

        {/* Status drill-down */}
        {selectedStatus ? (
          <StatusList product={product} status={selectedStatus} />
        ) : null}

        {/* New application CTA */}
        <View style={styles.ctaWrap}>
          <Button title={config.newLabel} onPress={handleNew} />
        </View>

        {/* Drafts */}
        <Text style={styles.sectionTitle}>Resume a draft</Text>
        {drafts.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No drafts yet"
            subtitle={`Start a ${config.newLabel.toLowerCase()} — your progress auto-saves so you can resume anytime.`}
            style={styles.emptyDrafts}
          />
        ) : (
          <View style={styles.draftList}>
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                totalSteps={totalSteps}
                onResume={() => resumeDraft(draft.id)}
                onDelete={() => deleteDraft(draft.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Customer search results ─────────────────────────────────────────────────
function CustomerResults({ query }: { query: string }) {
  const { data, isLoading, isError, refetch } = useCustomerSearch(query);

  if (isLoading) {
    return (
      <View style={styles.searchPanel}>
        <LoadingSpinner size={scale(28)} />
      </View>
    );
  }
  if (isError) {
    return (
      <ErrorView title="Search failed" message="Couldn’t search customers." onRetry={() => refetch()} />
    );
  }
  if (!data || data.length === 0) {
    return (
      <View style={styles.searchPanel}>
        <Text style={styles.searchEmpty}>No customers match “{query}”.</Text>
      </View>
    );
  }
  return (
    <View style={styles.searchPanel}>
      {data.map((c) => (
        <View key={c.id} style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{c.name}</Text>
            <Text style={styles.customerMeta}>
              {c.phone}
              {c.maskedPan ? ` · ${c.maskedPan}` : ''}
            </Text>
          </View>
          <Badge label={SALES_PRODUCT_SHORT[c.product]} variant="info" />
        </View>
      ))}
    </View>
  );
}

// ── Status drill-down list ──────────────────────────────────────────────────
function StatusList({
  product,
  status,
}: {
  product: SalesProduct;
  status: SalesApplicationStatus;
}) {
  const { data, isLoading, isError, refetch } = useApplicationList(product, status);
  const meta = STATUS_META[status];

  return (
    <View style={styles.statusPanel}>
      <Text style={styles.sectionTitle}>{meta?.label ?? status}</Text>
      {isLoading ? (
        <View style={styles.statusLoading}>
          <LoadingSpinner size={scale(28)} />
        </View>
      ) : isError ? (
        <ErrorView title="Couldn’t load" message="Please try again." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <Text style={styles.searchEmpty}>No applications in this status.</Text>
      ) : (
        data.map((app) => (
          <View key={app.applicationId} style={styles.appRow}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{app.customerName}</Text>
              <Text style={styles.customerMeta}>
                {app.applicationId}
                {app.amount ? ` · ${formatCurrency(app.amount)}` : ''}
              </Text>
            </View>
            {meta ? <Badge label={meta.label} variant={meta.variant} /> : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  greeting: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  branch: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm + 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  offlineText: {
    ...Typography.captionMedium,
    color: Colors.goldDark,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: scale(48),
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  searchPanel: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchEmpty: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customerInfo: { flex: 1, marginRight: Spacing.sm },
  customerName: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  customerMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tileCol: {
    width: '31.5%',
    flexGrow: 1,
  },
  statusPanel: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  statusLoading: { paddingVertical: Spacing.lg, alignItems: 'center' },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ctaWrap: { marginTop: Spacing.xs },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyDrafts: {
    flex: 0,
    paddingVertical: Spacing.lg,
  },
  draftList: { gap: Spacing.sm },
});

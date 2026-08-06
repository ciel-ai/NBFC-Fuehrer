import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { Payment, PaymentMethod, PaymentStatus } from '@/src/entities/payment';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: 'UPI',
  net_banking: 'Net Banking',
  debit_card: 'Debit Card',
  nach: 'NACH Auto-debit',
};

const STATUS_META: Record<PaymentStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { label: 'Success', color: Colors.success, icon: 'checkmark-circle' },
  processing: { label: 'Processing', color: Colors.gold, icon: 'time' },
  pending: { label: 'Pending', color: Colors.gold, icon: 'time' },
  failed: { label: 'Failed', color: Colors.error, icon: 'close-circle' },
  refunded: { label: 'Refunded', color: Colors.textSecondary, icon: 'return-down-back' },
};

export default function TransactionHistoryScreen() {
  const { loanId } = useLocalSearchParams<{ loanId?: string }>();
  const { paymentService } = useServices();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const id = Array.isArray(loanId) ? loanId[0] : loanId;
    if (!id) {
      setErrorMessage('Invalid loan link.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await paymentService.getPaymentHistory(id);
      if (!isMountedRef.current) return;
      setPayments(data);
    } catch {
      if (isMountedRef.current) {
        setErrorMessage('Could not load transactions. Please check your connection.');
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [loanId, paymentService]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Transaction History" showBack />
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Transaction History" showBack />
        <ErrorView
          title="Transactions unavailable"
          message={errorMessage}
          onRetry={fetchData}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Transaction History" showBack />
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, payments.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="file-tray-outline" size={scale(28)} color={Colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySub}>
              Payments you make towards this loan will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: `${meta.color}1A` }]}>
                <Ionicons name={meta.icon} size={scale(20)} color={meta.color} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
                <Text style={styles.rowSub}>
                  {METHOD_LABEL[item.method]} · {formatDate(item.createdAt)}
                </Text>
                {item.transactionRef ? (
                  <Text style={styles.rowRef}>Ref: {item.transactionRef}</Text>
                ) : null}
              </View>
              <View style={[styles.statusChip, { backgroundColor: `${meta.color}1A` }]}>
                <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { padding: Spacing.md, gap: Spacing.sm },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  rowIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowAmount: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary },
  rowSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  rowRef: { ...Typography.tiny, color: Colors.textDisabled, marginTop: 2 },

  statusChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusChipText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },

  emptyWrap: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  emptyIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary },
  emptySub: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { ErrorView } from '@/src/shared/components/common/ErrorView';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { Loan, EMISchedule } from '@/src/entities/loan';
import { useScreenGuard } from '@/src/shared/hooks/useScreenGuard';

export default function LoanDetailScreen() {
  useScreenGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [emiSchedule, setEMISchedule] = useState<EMISchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { loanService } = useServices();
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const loanId = Array.isArray(id) ? id[0] : id;
    if (!loanId) {
      setLoan(null);
      setErrorMessage('Invalid loan link.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const [loanData, emiData] = await Promise.all([
        loanService.getLoanById(loanId),
        loanService.getEMISchedule(loanId),
      ]);
      if (!isMountedRef.current) return;
      setLoan(loanData);
      setEMISchedule(emiData);
    } catch {
      if (isMountedRef.current) {
        setErrorMessage('Could not load loan details. Please check your connection.');
        Alert.alert('Error', 'Could not load loan details.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [id, loanService]);

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
        <Header title="Loan Details" showBack />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={48} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Loan Details" showBack />
        <ErrorView
          title="Loan details unavailable"
          message={errorMessage}
          onRetry={fetchData}
        />
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Loan Details" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Loan not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const loanTypeLabel =
    loan.type === 'gold_loan'
      ? 'Gold Loan'
      : loan.type === 'affordable_housing'
        ? 'Affordable Housing Loan'
        : 'Consumer Durable Loan';

  // The instalment the customer should actually pay next: the earliest overdue
  // one, else the earliest pending one. Passing this through prevents the
  // pay screen from defaulting to a hardcoded EMI id.
  const nextPayableEmi =
    emiSchedule.find((e) => e.status === 'overdue') ??
    emiSchedule.find((e) => e.status === 'pending');

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Loan Details" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Loan summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>LOAN ID</Text>
            <Text style={styles.summaryValue}>#{loan.id.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>LOAN TYPE</Text>
            <Text style={styles.summaryValue}>{loanTypeLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>AMOUNT</Text>
            <Text style={styles.summaryValue}>{formatCurrency(loan.amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>MONTHLY EMI</Text>
            <Text style={[styles.summaryValue, styles.emiHighlight]}>{formatCurrency(loan.emi)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>NEXT DUE DATE</Text>
            <Text style={styles.summaryValue}>{formatDate(loan.nextDueDate)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>OUTSTANDING</Text>
            <Text style={styles.summaryValue}>{formatCurrency(loan.outstandingAmount)}</Text>
          </View>
        </View>

        {/* EMI Schedule */}
        <Text style={styles.sectionTitle}>EMI Schedule</Text>
        {emiSchedule.map((emi) => (
          <View key={emi.id} style={styles.emiRow}>
            <View style={styles.emiDateBlock}>
              <Text style={styles.emiDate}>{formatDate(emi.dueDate)}</Text>
              <View style={[styles.emiStatusDot, emi.status === 'paid' ? styles.dotPaid : emi.status === 'overdue' ? styles.dotOverdue : styles.dotPending]} />
            </View>
            <View style={styles.emiAmounts}>
              <Text style={styles.emiTotal}>{formatCurrency(emi.amount)}</Text>
              <Text style={styles.emiBreakdown}>P: {formatCurrency(emi.principal)} | I: {formatCurrency(emi.interest)}</Text>
            </View>
            <View style={[styles.statusChip, emi.status === 'paid' && styles.chipPaid]}>
              <Text style={[styles.statusChipText, emi.status === 'paid' && styles.chipPaidText]}>
                {emi.status.charAt(0).toUpperCase() + emi.status.slice(1)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {loan.status === 'closed' && (
          <Button
            title="Download NOC"
            onPress={() =>
              router.push({ pathname: '/(main)/loan-detail/noc', params: { id: loan.id } })
            }
          />
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() =>
              router.push({ pathname: '/(main)/loan-detail/emi-schedule', params: { id: loan.id } })
            }
            accessibilityRole="button"
            accessibilityLabel="View EMI Schedule"
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionBtnText}>EMI Schedule</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() =>
              router.push({ pathname: '/(main)/loan-detail/status', params: { id: loan.id } })
            }
            accessibilityRole="button"
            accessibilityLabel="Loan Status"
          >
            <Ionicons name="list-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Loan Status</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() =>
              router.push({
                pathname: '/(main)/loan-detail/transaction-history',
                params: { loanId: loan.id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Transaction History"
          >
            <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Transactions</Text>
          </Pressable>
        </View>

        {loan.type === 'gold_loan' && (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/(main)/loan-detail/gold-monitoring', params: { id: loan.id } })
              }
              accessibilityRole="button"
              accessibilityLabel="Gold Price Monitoring"
            >
              <Ionicons name="analytics-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Gold LTV</Text>
            </Pressable>

            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/(main)/loan-detail/gold-closure', params: { id: loan.id } })
              }
              accessibilityRole="button"
              accessibilityLabel="Gold Loan Closure"
            >
              <Ionicons name="lock-open-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Closure</Text>
            </Pressable>
          </View>
        )}

        {loan.type === 'consumer_durable' && loan.status !== 'closed' && (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/(main)/loan-detail/overdue-management', params: { loanId: loan.id } })
              }
              accessibilityRole="button"
              accessibilityLabel="Overdue Management"
            >
              <Ionicons name="warning-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Overdue</Text>
            </Pressable>

            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/(main)/loan-detail/cdl-closure', params: { id: loan.id } })
              }
              accessibilityRole="button"
              accessibilityLabel="Close Loan"
            >
              <Ionicons name="lock-open-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Closure</Text>
            </Pressable>
          </View>
        )}

        {loan.type === 'affordable_housing' && loan.status !== 'closed' && (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/(main)/loan-detail/housing-prepayment', params: { id: loan.id } })
              }
              accessibilityRole="button"
              accessibilityLabel="Partial Prepayment"
            >
              <Ionicons name="cash-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Prepay</Text>
            </Pressable>

            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({ pathname: '/(main)/loan-detail/housing-closure', params: { id: loan.id } })
              }
              accessibilityRole="button"
              accessibilityLabel="Close Loan"
            >
              <Ionicons name="lock-open-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Closure</Text>
            </Pressable>
          </View>
        )}

        {loan.status !== 'closed' && (
          <Button
            title="Pay EMI"
            onPress={() =>
              router.push({
                pathname: '/(main)/loan-detail/pay-emi',
                params: {
                  loanId: loan.id,
                  emiId: nextPayableEmi?.id,
                  amount: String(nextPayableEmi?.amount ?? loan.emi),
                  dueDate: nextPayableEmi?.dueDate ?? loan.nextDueDate,
                },
              })
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary },
  content: { padding: Spacing.xl, paddingBottom: Spacing.md },
  summaryCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    ...Shadow.medium,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  summaryValue: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textWhite },
  emiHighlight: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textWhite },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  emiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emiDateBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  emiDate: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.textPrimary },
  emiStatusDot: { width: 8, height: 8, borderRadius: 4 },
  dotPaid: { backgroundColor: Colors.success },
  dotOverdue: { backgroundColor: Colors.error },
  dotPending: { backgroundColor: Colors.textDisabled },
  emiAmounts: { flex: 1 },
  emiTotal: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary },
  emiBreakdown: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textSecondary },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipPaid: { backgroundColor: Colors.successLight, borderColor: Colors.success },
  statusChipText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.textSecondary },
  chipPaidText: { color: Colors.success },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});

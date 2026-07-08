import React, { useEffect } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';

const TXN_ID = `TXN${Date.now().toString().slice(-10)}`;

export default function PaymentSuccessScreen() {
  const { amount, emiId, loanId, receiptId, nextDueDate } = useLocalSearchParams<{
    amount?: string;
    emiId?: string;
    loanId?: string;
    receiptId?: string;
    nextDueDate?: string;
  }>();
  const queryClient = useQueryClient();

  // Outstanding balance changed — refresh the dashboard.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['activeLoans'] });
  }, [queryClient]);

  const paidAmount = Number(amount ?? 9800);
  const today = formatDate(new Date().toISOString());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successCircle}>
          <View style={styles.successRing}>
            <Ionicons name="checkmark" size={scale(52)} color={Colors.textWhite} />
          </View>
        </View>

        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>Your EMI has been received. Thank you for paying on time.</Text>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>{formatCurrency(paidAmount)}</Text>
        </View>

        <View style={styles.detailCard}>
          {[
            { label: 'Transaction ID', value: TXN_ID },
            { label: 'Payment Date',   value: today },
            { label: 'Loan ID',        value: loanId ?? 'L1' },
            { label: 'EMI Reference',  value: emiId ?? 'e4' },
            { label: 'Payment Mode',   value: 'UPI — GPay' },
            ...(receiptId ? [{ label: 'Receipt (AWS S3)', value: receiptId }] : []),
            { label: 'Status',         value: 'Settled', isStatus: true },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>{item.label}</Text>
                <Text style={[styles.detailVal, item.isStatus && { color: Colors.success }]}>
                  {item.isStatus && (
                    <Ionicons name="checkmark-circle" size={scale(12)} color={Colors.success} />
                  )}{' '}{item.value}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={styles.detailDivider} />}
            </View>
          ))}
        </View>

        <View style={styles.nextEmiBox}>
          <Ionicons name="calendar-outline" size={scale(18)} color={Colors.primary} />
          <View style={styles.nextEmiInfo}>
            <Text style={styles.nextEmiLabel}>{nextDueDate ? 'Next EMI Due' : 'Loan Status'}</Text>
            <Text style={styles.nextEmiDate}>
              {nextDueDate ? formatDate(nextDueDate) : 'All EMIs cleared'}
            </Text>
          </View>
          <View style={styles.nextEmiAuto}>
            <Text style={styles.nextEmiAutoText}>{nextDueDate ? 'Auto-debit set' : 'Up to date'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="View EMI Schedule"
            onPress={() =>
              router.replace({
                pathname: '/(main)/loan-detail/emi-schedule',
                params: { id: loanId },
              })
            }
          />
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(main)/(tabs)/home')}
            accessibilityRole="button"
            accessibilityLabel="Go to home"
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.downloadBtn}
          accessibilityRole="button"
          accessibilityLabel="Download payment receipt"
        >
          <Ionicons name="download-outline" size={scale(16)} color={Colors.textSecondary} />
          <Text style={styles.downloadText}>Download Receipt</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const CIRCLE_SIZE = scale(120);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  content: {
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },

  successCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successRing: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  amountCard: {
    width: '100%',
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  amountLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  amountValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['5xl'],
    color: Colors.textWhite,
  },

  detailCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailKey: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  detailVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  detailDivider: { height: 1, backgroundColor: Colors.border },

  nextEmiBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  nextEmiInfo: { flex: 1 },
  nextEmiLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  nextEmiDate: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  nextEmiAuto: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  nextEmiAutoText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.success,
  },

  actions: { width: '100%', gap: Spacing.sm },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },

  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  downloadText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

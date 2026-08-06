import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency } from '@/src/core/utils/formatters';

/**
 * Payment receipt. Renders the confirmed details of a captured EMI payment and
 * lets the customer share a plain-text copy. All values are passed in from the
 * payment-success screen (which sources them from the gateway response) — this
 * screen never fabricates a payment.
 */
export default function ReceiptScreen() {
  const {
    amount,
    transactionId,
    paymentDate,
    loanId,
    emiId,
    method,
    receiptId,
  } = useLocalSearchParams<{
    amount?: string;
    transactionId?: string;
    paymentDate?: string;
    loanId?: string;
    emiId?: string;
    method?: string;
    receiptId?: string;
  }>();

  const paidAmount = Number(amount ?? 0);

  const rows: { label: string; value: string }[] = [
    { label: 'Transaction ID', value: transactionId ?? '—' },
    { label: 'Payment Date', value: paymentDate ?? '—' },
    { label: 'Loan ID', value: loanId ?? '—' },
    ...(emiId ? [{ label: 'EMI Reference', value: emiId }] : []),
    { label: 'Payment Mode', value: method ?? '—' },
    ...(receiptId ? [{ label: 'Receipt Ref', value: receiptId }] : []),
    { label: 'Status', value: 'Settled' },
  ];

  const handleShare = async () => {
    try {
      const lines = [
        'Fuehrer NBFC — Payment Receipt',
        '',
        `Amount Paid: ${formatCurrency(paidAmount)}`,
        ...rows.map((r) => `${r.label}: ${r.value}`),
      ];
      await Share.share({
        title: 'Payment Receipt',
        message: lines.join('\n'),
      });
    } catch {
      Alert.alert('Could not share receipt', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Payment Receipt" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.receiptCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Ionicons name="receipt-outline" size={scale(20)} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.brandName}>Fuehrer NBFC</Text>
              <Text style={styles.brandSub}>Payment Receipt</Text>
            </View>
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Amount Paid</Text>
            <Text style={styles.amountValue}>{formatCurrency(paidAmount)}</Text>
          </View>

          <View style={styles.divider} />

          {rows.map((row, i) => (
            <View key={row.label} style={[styles.row, i === rows.length - 1 && styles.rowLast]}>
              <Text style={styles.rowKey}>{row.label}</Text>
              <Text
                style={[styles.rowVal, row.label === 'Status' && { color: Colors.success }]}
              >
                {row.value}
              </Text>
            </View>
          ))}

          <View style={styles.footerNoteWrap}>
            <Ionicons name="shield-checkmark-outline" size={scale(14)} color={Colors.textSecondary} />
            <Text style={styles.footerNote}>
              This is a system-generated receipt and does not require a signature.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Share Receipt" onPress={handleShare} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md },

  receiptCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  brandBadge: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary },
  brandSub: { ...Typography.caption, color: Colors.textSecondary },

  amountBlock: { alignItems: 'center', gap: 2, paddingVertical: Spacing.sm },
  amountLabel: { ...Typography.caption, color: Colors.textSecondary },
  amountValue: { fontFamily: FontFamily.bold, fontSize: FontSize['4xl'], color: Colors.primary },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowKey: { ...Typography.body, color: Colors.textSecondary },
  rowVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },

  footerNoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  footerNote: { ...Typography.tiny, color: Colors.textSecondary, flex: 1 },

  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

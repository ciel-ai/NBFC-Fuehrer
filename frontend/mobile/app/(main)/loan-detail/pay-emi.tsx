import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useIdempotencyKey } from '@/src/core/api/idempotency';
import { openRazorpayCheckout, RazorpayError } from '@/src/core/payments/razorpay';

type PaymentMethod = 'upi' | 'netbanking' | 'debit_card';

interface PayMethod {
  key: PaymentMethod;
  label: string;
  subtitle: string;
  icon: string;
}

const PAY_METHODS: PayMethod[] = [
  { key: 'upi',        label: 'UPI',          subtitle: 'Pay via any UPI app',        icon: 'qr-code-outline' },
  { key: 'netbanking', label: 'Net Banking',   subtitle: 'All major banks supported',  icon: 'globe-outline' },
  { key: 'debit_card', label: 'Debit Card',    subtitle: 'Visa, Mastercard, RuPay',    icon: 'card-outline' },
];

const UPI_APPS = [
  { id: 'gpay',   label: 'GPay',    color: '#1A73E8' },
  { id: 'phonepe',label: 'PhonePe', color: '#5F259F' },
  { id: 'paytm',  label: 'Paytm',   color: '#00BAF2' },
  { id: 'other',  label: 'Other',   color: Colors.textSecondary },
];

export default function PayEMIScreen() {
  const { emiId, loanId, amount, dueDate } = useLocalSearchParams<{
    emiId?: string;
    loanId?: string;
    amount?: string;
    dueDate?: string;
  }>();
  const { consumerDurableLoanService } = useServices();
  const { getKey } = useIdempotencyKey();
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Amount/date come from the selected EMI; fall back for legacy seeded loans.
  const EMI_AMOUNT = Number(amount) || 9800;
  const DUE_DATE = dueDate || '2025-10-05';

  const canPay =
    method === 'upi' ? upiId.includes('@') || selectedUpiApp !== 'other' :
    method === 'netbanking' ? true :
    true;

  // Human-readable payment mode threaded to the receipt — no longer hardcoded.
  const methodLabel =
    method === 'upi'
      ? selectedUpiApp !== 'other'
        ? `UPI — ${UPI_APPS.find((a) => a.id === selectedUpiApp)?.label ?? 'UPI'}`
        : 'UPI'
      : method === 'netbanking'
        ? 'Net Banking'
        : 'Debit Card';

  const handlePay = async () => {
    setLoading(true);
    try {
      // 1) Open the Razorpay checkout sheet. Simulated under USE_MOCK; a real
      //    gateway capture once the SDK + keys are activated (see razorpay.ts).
      await openRazorpayCheckout({
        amount: EMI_AMOUNT,
        description: `EMI payment · Loan ${loanId ?? 'L1'}`,
        // orderId: <backend create-order id>  — wire when the endpoint lands
      });

      // 2) Capture succeeded — mark the EMI paid and fetch the receipt. A thrown
      //    error here means the capture did NOT settle, so we must surface the
      //    failure, never a false confirmation.
      const result = await consumerDurableLoanService.processManualPayment(
        loanId ?? 'L1',
        emiId ?? 'e1',
        getKey(),
      );
      if (!isMountedRef.current) return;
      setLoading(false);
      router.replace({
        pathname: '/(main)/loan-detail/payment-success',
        params: {
          amount: String(result.amount || EMI_AMOUNT),
          emiId: result.emiId,
          loanId: loanId ?? 'L1',
          receiptId: result.receiptId,
          receiptUrl: result.receiptS3Url,
          nextDueDate: result.nextDueDate ?? '',
          paymentId: result.paymentId,
          method: methodLabel,
          paidAt: result.paidAt,
        },
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      setLoading(false);
      // User dismissed the Razorpay sheet — stay put, don't show a failure.
      if (err instanceof RazorpayError && err.code === 'RAZORPAY_CANCELLED') {
        return;
      }
      // Capture failed — route to the failure screen (retry / penalty details)
      // rather than showing a success the customer never actually completed.
      router.replace({
        pathname: '/(main)/loan-detail/payment-failure',
        params: { loanId: loanId ?? 'L1', emiId: emiId ?? 'e1' },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Pay EMI" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emiCard}>
            <View style={styles.emiCardTop}>
              <View>
                <Text style={styles.emiCardLabel}>EMI Amount Due</Text>
                <Text style={styles.emiCardAmount}>{formatCurrency(EMI_AMOUNT)}</Text>
              </View>
              <View style={styles.overdueChip}>
                <Ionicons name="warning-outline" size={scale(12)} color={Colors.error} />
                <Text style={styles.overdueChipText}>Overdue</Text>
              </View>
            </View>
            <View style={styles.emiCardMeta}>
              <View style={styles.emiMetaItem}>
                <Text style={styles.emiMetaKey}>Due Date</Text>
                <Text style={styles.emiMetaVal}>{formatDate(DUE_DATE)}</Text>
              </View>
              <View style={styles.emiMetaDivider} />
              <View style={styles.emiMetaItem}>
                <Text style={styles.emiMetaKey}>Loan ID</Text>
                <Text style={styles.emiMetaVal}>{loanId ?? 'L1'}</Text>
              </View>
              <View style={styles.emiMetaDivider} />
              <View style={styles.emiMetaItem}>
                <Text style={styles.emiMetaKey}>EMI #</Text>
                <Text style={styles.emiMetaVal}>4 of 12</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          <View style={styles.methodList}>
            {PAY_METHODS.map((m) => (
              <Pressable
                key={m.key}
                style={[styles.methodRow, method === m.key && styles.methodRowActive]}
                onPress={() => setMethod(m.key)}
                accessibilityRole="radio"
                accessibilityLabel={m.label}
                accessibilityState={{ selected: method === m.key }}
              >
                <View style={[styles.methodIconBg, method === m.key && styles.methodIconBgActive]}>
                  <Ionicons name={m.icon as any} size={scale(20)} color={method === m.key ? Colors.primary : Colors.textSecondary} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>
                    {m.label}
                  </Text>
                  <Text style={styles.methodSubtitle}>{m.subtitle}</Text>
                </View>
                <View style={[styles.radioOuter, method === m.key && styles.radioOuterActive]}>
                  {method === m.key && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            ))}
          </View>

          {method === 'upi' && (
            <View style={styles.upiSection}>
              <Text style={styles.upiSectionTitle}>Quick Pay via UPI App</Text>
              <View style={styles.upiAppsRow}>
                {UPI_APPS.map((app) => (
                  <Pressable
                    key={app.id}
                    style={[styles.upiApp, selectedUpiApp === app.id && styles.upiAppActive]}
                    onPress={() => setSelectedUpiApp(app.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Pay with ${app.label}`}
                  >
                    <View style={[styles.upiAppIcon, { backgroundColor: `${app.color}20` }]}>
                      <Text style={[styles.upiAppInitial, { color: app.color }]}>
                        {app.label[0]}
                      </Text>
                    </View>
                    <Text style={[styles.upiAppLabel, selectedUpiApp === app.id && { color: Colors.primary }]}>
                      {app.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {selectedUpiApp === 'other' && (
                <View style={styles.upiIdField}>
                  <Text style={styles.upiIdLabel}>ENTER UPI ID</Text>
                  <View style={styles.upiIdRow}>
                    <TextInput
                      style={styles.upiIdInput}
                      placeholder="yourname@upi"
                      placeholderTextColor={Colors.textDisabled}
                      value={upiId}
                      onChangeText={setUpiId}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      accessibilityLabel="UPI ID"
                    />
                    {upiId.includes('@') && (
                      <Ionicons name="checkmark-circle" size={scale(20)} color={Colors.success} />
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {method === 'netbanking' && (
            <View style={styles.netbankingInfo}>
              <Ionicons name="information-circle-outline" size={scale(16)} color={Colors.primary} />
              <Text style={styles.netbankingText}>
                You will be redirected to your bank's secure net banking portal to complete the payment.
              </Text>
            </View>
          )}

          {method === 'debit_card' && (
            <View style={styles.netbankingInfo}>
              <Ionicons name="shield-checkmark-outline" size={scale(16)} color={Colors.success} />
              <Text style={styles.netbankingText}>
                Your card details are encrypted and processed securely via Razorpay PCI-DSS certified gateway.
              </Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalAmount}>{formatCurrency(EMI_AMOUNT)}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={loading ? 'Processing…' : `Pay ${formatCurrency(EMI_AMOUNT)}`}
            onPress={handlePay}
            disabled={!canPay || loading}
            loading={loading}
          />
          <Text style={styles.footerNote}>
            Powered by Razorpay · 256-bit SSL encrypted
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  emiCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  emiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  emiCardLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  emiCardAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.textWhite,
    marginTop: 4,
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  overdueChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
  emiCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  emiMetaItem: { flex: 1, alignItems: 'center' },
  emiMetaKey: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  emiMetaVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textWhite,
    marginTop: 2,
  },
  emiMetaDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  methodList: { gap: Spacing.sm },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  methodRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  methodIconBg: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconBgActive: { backgroundColor: Colors.background },
  methodInfo: { flex: 1 },
  methodLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  methodLabelActive: { color: Colors.primary },
  methodSubtitle: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: Colors.primary,
  },

  upiSection: { gap: Spacing.md },
  upiSectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  upiAppsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  upiApp: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  upiAppActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  upiAppIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiAppInitial: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
  },
  upiAppLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  upiIdField: { gap: Spacing.xs },
  upiIdLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  upiIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: scale(48),
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  upiIdInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },

  netbankingInfo: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  netbankingText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },

  totalRow: {
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
  totalLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  totalAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.xs,
  },
  footerNote: {
    ...Typography.tiny,
    color: Colors.textDisabled,
    textAlign: 'center',
  },
});

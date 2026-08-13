// Consumer Durable Loan — product details.
//
// The customer types the product name and value by hand. There is no catalogue:
// the screens this replaced offered three category cards leading to a hardcoded
// list of invented SKUs (iPhone 15, MacBook Air, Dell XPS…) with invented MRPs
// and sanction limits, and the customer could only finance something on that
// list. CDL finances whatever the customer is actually buying, so the item and
// its invoice value are entered here.
//
// EMI and the processing fee are NOT computed on this screen. Both come from
// GET /consumer-durable-loans/quote, which runs the same calculation that books
// the loan — a second formula living in the app could disagree with it, and the
// customer would be shown a figure the loan is not written at.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useLoanConsent } from '@/src/features/loans/components/LoanConsentGate';
import {
  cdlInterestRatesFor,
  toCdlEmploymentType,
  CDL_MAX_LOAN_AMOUNT,
  CDL_MIN_LOAN_AMOUNT,
  CDL_TENURE_OPTIONS,
  type CdlCustomerType,
  type CdlQuoteResult,
} from '@/src/entities/consumerDurableLoan';

const CUSTOMER_TYPES: { value: CdlCustomerType; label: string }[] = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-employed' },
];

const PRODUCT_NAME_MAX = 200;

/** Digits only — the rupee sign and separators are presentation. */
const toAmount = (raw: string): number => {
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
};

export default function ConsumerDurableLoanScreen() {
  const { consumerDurableLoanService } = useServices();
  const { ensureConsent, consentGate } = useLoanConsent();

  const [productName, setProductName] = useState('');
  const [productValueInput, setProductValueInput] = useState('');
  const [downPaymentInput, setDownPaymentInput] = useState('');
  const [loanAmountInput, setLoanAmountInput] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [customerType, setCustomerType] = useState<CdlCustomerType>('salaried');
  const [tenureMonths, setTenureMonths] = useState(12);

  const rates = useMemo(() => cdlInterestRatesFor(customerType), [customerType]);
  const [interestRate, setInterestRate] = useState<number>(rates[1] ?? 0);

  const [quote, setQuote] = useState<CdlQuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);

  const productValue = toAmount(productValueInput);
  const downPayment = toAmount(downPaymentInput);
  const loanAmount = toAmount(loanAmountInput);

  // Switching customer type can invalidate the chosen rate (13% is salaried-
  // only, 15% self-employed-only) — fall back to that type's default.
  const handleCustomerType = (next: CdlCustomerType) => {
    setCustomerType(next);
    const nextRates = cdlInterestRatesFor(next);
    if (!nextRates.includes(interestRate)) setInterestRate(nextRates[1] ?? 0);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  // Mirrors the backend rules in cdlLoans.dto.ts so the customer is told
  // immediately. The backend re-checks every one of these: this is for
  // feedback, never for security.

  const trimmedName = productName.trim();
  const maxEligible = Math.max(0, productValue - downPayment);

  const productNameError =
    trimmedName.length > 0 && trimmedName.length < 2
      ? 'Product name must be at least 2 characters'
      : '';

  const productValueError =
    productValueInput.length > 0 && productValue <= 0
      ? 'Product value must be greater than ₹0'
      : '';

  const downPaymentError =
    productValue > 0 && downPayment > productValue
      ? 'Down payment cannot exceed the product value'
      : '';

  const loanAmountError = (() => {
    if (loanAmountInput.length === 0) return '';
    if (loanAmount < CDL_MIN_LOAN_AMOUNT || loanAmount > CDL_MAX_LOAN_AMOUNT) {
      return `Loan amount must be between ${formatCurrency(CDL_MIN_LOAN_AMOUNT)} and ${formatCurrency(CDL_MAX_LOAN_AMOUNT)}`;
    }
    if (productValue > 0 && loanAmount > maxEligible) {
      return `Loan amount cannot exceed the product value after down payment (${formatCurrency(maxEligible)})`;
    }
    return '';
  })();

  const storeError =
    storeName.trim().length > 0 && storeName.trim().length < 2
      ? 'Enter the store name'
      : '';

  const isValid =
    trimmedName.length >= 2 &&
    productValue > 0 &&
    downPayment <= productValue &&
    loanAmount >= CDL_MIN_LOAN_AMOUNT &&
    loanAmount <= CDL_MAX_LOAN_AMOUNT &&
    loanAmount <= maxEligible &&
    storeName.trim().length >= 2 &&
    storeCity.trim().length >= 2;

  // ── Authoritative pricing ─────────────────────────────────────────────────
  // Debounced so typing an amount does not fire a request per keystroke. The
  // quote is cleared the moment inputs stop being priceable, so a stale EMI is
  // never left on screen next to numbers it was not calculated from.

  const priceable =
    productValue > 0 &&
    loanAmount >= CDL_MIN_LOAN_AMOUNT &&
    loanAmount <= CDL_MAX_LOAN_AMOUNT &&
    downPayment <= productValue &&
    loanAmount <= maxEligible;

  const requestSeq = useRef(0);

  const fetchQuote = useCallback(async () => {
    const seq = ++requestSeq.current;
    setQuoting(true);
    try {
      const result = await consumerDurableLoanService.getQuote({
        productValue,
        downPayment,
        loanAmount,
        tenureMonths,
        employmentType: toCdlEmploymentType(customerType),
        interestRate,
      });
      // Ignore a response that a newer request has already superseded.
      if (seq === requestSeq.current) setQuote(result);
    } catch {
      if (seq === requestSeq.current) setQuote(null);
    } finally {
      if (seq === requestSeq.current) setQuoting(false);
    }
  }, [
    consumerDurableLoanService,
    productValue,
    downPayment,
    loanAmount,
    tenureMonths,
    customerType,
    interestRate,
  ]);

  useEffect(() => {
    if (!priceable) {
      requestSeq.current++; // cancel any in-flight result
      setQuote(null);
      setQuoting(false);
      return;
    }
    const t = setTimeout(() => void fetchQuote(), 400);
    return () => clearTimeout(t);
  }, [priceable, fetchQuote]);

  const proceed = () => {
    if (!isValid) return;
    ensureConsent(() =>
      router.push({
        pathname: '/(main)/apply/kyc-form',
        // Canonical CDL field names. Every one of these is threaded through
        // kyc-form → address-employment → kyc-step-2 → cdl-kyc-verification
        // by `...params` spread, and submitted verbatim.
        params: {
          productName: trimmedName,
          productValue: String(productValue),
          downPayment: String(downPayment),
          loanAmount: String(loanAmount),
          tenure: String(tenureMonths),
          interestRate: String(quote?.interestRate ?? interestRate),
          // Display-only downstream — the backend recomputes both when it
          // books the loan and ignores whatever the client sends.
          emi: String(quote?.emi ?? 0),
          processingFee: String(quote?.processingFee ?? 0),
          employmentType: customerType,
          storeName: storeName.trim(),
          storeCity: storeCity.trim(),
        },
      }),
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Consumer Durable Loan" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.banner}>
            <Ionicons name="star" size={16} color={Colors.gold} />
            <Text style={styles.bannerText}>0% interest EMI available on select terms</Text>
          </View>

          {/* ── Product details ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Product Details</Text>

            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={[styles.input, !!productNameError && styles.inputError]}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Samsung 55 inch Smart TV"
              placeholderTextColor={Colors.textDisabled}
              maxLength={PRODUCT_NAME_MAX}
              accessibilityLabel="Product name"
              accessibilityHint="Enter the product exactly as printed on the invoice"
            />
            {!!productNameError && <Text style={styles.errorText}>{productNameError}</Text>}

            <Text style={styles.label}>Product Value</Text>
            <View style={[styles.amountRow, !!productValueError && styles.inputError]}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={productValueInput}
                onChangeText={(t) => setProductValueInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="65000"
                placeholderTextColor={Colors.textDisabled}
                maxLength={8}
                accessibilityLabel="Product value in rupees"
              />
            </View>
            {!!productValueError && <Text style={styles.errorText}>{productValueError}</Text>}
            <Text style={styles.hint}>Invoice value of the item</Text>

            <Text style={styles.label}>Down Payment</Text>
            <View style={[styles.amountRow, !!downPaymentError && styles.inputError]}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={downPaymentInput}
                onChangeText={(t) => setDownPaymentInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.textDisabled}
                maxLength={8}
                accessibilityLabel="Down payment in rupees"
              />
            </View>
            {!!downPaymentError && <Text style={styles.errorText}>{downPaymentError}</Text>}

            <Text style={styles.label}>Loan Amount</Text>
            <View style={[styles.amountRow, !!loanAmountError && styles.inputError]}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={loanAmountInput}
                onChangeText={(t) => setLoanAmountInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="55000"
                placeholderTextColor={Colors.textDisabled}
                maxLength={8}
                accessibilityLabel="Loan amount in rupees"
              />
            </View>
            {!!loanAmountError && <Text style={styles.errorText}>{loanAmountError}</Text>}
            {productValue > 0 && !downPaymentError && (
              <Text style={styles.hint}>
                {`Maximum eligible loan based on product value: ${formatCurrency(Math.min(maxEligible, CDL_MAX_LOAN_AMOUNT))}`}
              </Text>
            )}
          </View>

          {/* ── Where they're buying ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Store</Text>

            <Text style={styles.label}>Store Name</Text>
            <TextInput
              style={[styles.input, !!storeError && styles.inputError]}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Croma, Andheri West"
              placeholderTextColor={Colors.textDisabled}
              maxLength={100}
              accessibilityLabel="Store name"
            />
            {!!storeError && <Text style={styles.errorText}>{storeError}</Text>}

            <Text style={styles.label}>Store City</Text>
            <TextInput
              style={styles.input}
              value={storeCity}
              onChangeText={setStoreCity}
              placeholder="e.g. Mumbai"
              placeholderTextColor={Colors.textDisabled}
              maxLength={100}
              accessibilityLabel="Store city"
            />
          </View>

          {/* ── Loan details ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Loan Details</Text>

            <Text style={styles.label}>I am</Text>
            <View style={styles.chipRow}>
              {CUSTOMER_TYPES.map((t) => {
                const active = customerType === t.value;
                return (
                  <Pressable
                    key={t.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => handleCustomerType(t.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Tenure</Text>
            <View style={styles.chipRow}>
              {CDL_TENURE_OPTIONS.map((m) => {
                const active = tenureMonths === m;
                return (
                  <Pressable
                    key={m}
                    style={[styles.chipSm, active && styles.chipActive]}
                    onPress={() => setTenureMonths(m)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${m} months`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>Months</Text>

            <Text style={styles.label}>Interest Rate</Text>
            <View style={styles.chipRow}>
              {rates.map((r) => {
                const active = interestRate === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.chipSm, active && styles.chipActive]}
                    onPress={() => setInterestRate(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${r} percent`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}%</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {`Permitted for ${customerType === 'self_employed' ? 'self-employed' : 'salaried'}: ${rates.map((r) => `${r}%`).join(' · ')}`}
            </Text>
          </View>

          {/* ── Quote (backend-calculated) ── */}
          <View style={styles.quoteCard}>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Estimated EMI</Text>
              <Text style={styles.quoteValue}>
                {quote ? formatCurrency(quote.emi) : quoting ? '…' : '—'}
              </Text>
            </View>
            <View style={styles.quoteDivider} />
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Processing Fee</Text>
              <Text style={styles.quoteValueSm}>
                {quote ? formatCurrency(quote.processingFee) : quoting ? '…' : '—'}
              </Text>
            </View>
            {!quote && !quoting && (
              <Text style={styles.hint}>
                Enter the product value and loan amount to see your EMI
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button title="Continue" onPress={proceed} disabled={!isValid} />
      </View>
      {consentGate}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bannerText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.goldDark },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
  },
  rupee: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.error },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 4,
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipSm: {
    minWidth: 48,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.primary },
  quoteCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  quoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quoteLabel: { ...Typography.body, color: Colors.textSecondary },
  quoteValue: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary },
  quoteValueSm: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.textPrimary },
  quoteDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

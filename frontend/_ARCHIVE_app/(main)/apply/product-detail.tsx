import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';

import { calculateEMI } from '@/src/core/utils/formatters';
import { CDL_ANNUAL_INTEREST_RATE } from '@/src/entities/consumerDurableLoan';

const TENURES = [6, 12, 18, 24];
const ANNUAL_RATE = CDL_ANNUAL_INTEREST_RATE;

function calcEMI(principal: number, months: number): number {
  return calculateEMI(principal, ANNUAL_RATE, months);
}

function formatPrice(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export default function ProductDetailScreen() {
  const { productName, brand, mrp, loanAmount, iconBg, iconColor, icon } =
    useLocalSearchParams<{
      productId: string;
      productName: string;
      brand: string;
      mrp: string;
      loanAmount: string;
      iconBg: string;
      iconColor: string;
      icon: string;
    }>();

  const maxLoan = parseInt(loanAmount ?? '50000', 10);
  const mrpVal = parseInt(mrp ?? '0', 10);

  const [loanInput, setLoanInput] = useState(maxLoan.toString());
  const [selectedTenure, setSelectedTenure] = useState(12);

  const loanValue = useMemo(() => {
    const v = parseInt(loanInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(v) || v <= 0) return 0;
    return Math.min(v, maxLoan);
  }, [loanInput, maxLoan]);

  const emi = useMemo(
    () => (loanValue > 0 ? calcEMI(loanValue, selectedTenure) : 0),
    [loanValue, selectedTenure]
  );
  const totalPayable = emi * selectedTenure;
  const totalInterest = totalPayable - loanValue;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Product Details" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Product image area */}
        <View style={[styles.imageCard, { backgroundColor: iconBg ?? Colors.primaryLight }]}>
          <Ionicons
            name={(icon as any) ?? 'phone-portrait'}
            size={80}
            color={iconColor ?? Colors.primary}
          />
          <View style={styles.mrpBadge}>
            <Text style={styles.mrpBadgeText}>MRP {formatPrice(mrpVal)}</Text>
          </View>
        </View>

        {/* Product info */}
        <View style={styles.section}>
          <Text style={styles.productName}>{productName ?? 'Product'}</Text>
          <Text style={styles.brandText}>{brand ?? ''}</Text>

          <View style={styles.specRow}>
            {['Latest Model', '1 Year Warranty', 'EMI Available'].map((s) => (
              <View key={s} style={styles.specChip}>
                <Ionicons name="checkmark" size={11} color={Colors.success} />
                <Text style={styles.specText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Loan amount */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Loan Amount</Text>
          <View style={styles.loanInputRow}>
            <Text style={styles.rupeeSign}>₹</Text>
            <TextInput
              style={styles.loanInput}
              value={loanInput}
              onChangeText={(t) => setLoanInput(t.replace(/[^0-9]/g, ''))}
              keyboardType="decimal-pad"
              maxLength={7}
              accessibilityLabel="Loan amount in rupees"
              accessibilityHint="Enter the loan amount you want to borrow, up to the maximum eligible"
            />
          </View>
          <Text style={styles.hintText}>
            Max eligible: {formatPrice(maxLoan)}  ·  Min: ₹5,000
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((loanValue / maxLoan) * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* EMI Calculator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EMI Calculator</Text>

          <Text style={styles.tenureLabel}>Select Tenure</Text>
          <View style={styles.tenureRow}>
            {TENURES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tenureBtn, selectedTenure === t && styles.tenureBtnActive]}
                onPress={() => setSelectedTenure(t)}
              >
                <Text style={[styles.tenureBtnText, selectedTenure === t && styles.tenureBtnTextActive]}>
                  {t}M
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rateRow}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.rateText}>
              Interest rate: {ANNUAL_RATE}% p.a. (reducing balance)
            </Text>
          </View>

          {/* EMI result */}
          <View style={styles.emiCard}>
            <View style={styles.emiMain}>
              <Text style={styles.emiLabel}>Monthly EMI</Text>
              <Text style={styles.emiAmount}>
                {loanValue > 0 ? formatPrice(emi) : '—'}
              </Text>
              <Text style={styles.emiSub}>for {selectedTenure} months</Text>
            </View>
            <View style={styles.emiDivider} />
            <View style={styles.emiBreakdown}>
              {[
                { label: 'Principal', value: formatPrice(loanValue), color: Colors.textPrimary },
                { label: 'Total Interest', value: loanValue > 0 ? formatPrice(totalInterest) : '—', color: Colors.goldDark },
                { label: 'Total Payable', value: loanValue > 0 ? formatPrice(totalPayable) : '—', color: Colors.primary },
              ].map((row) => (
                <View key={row.label} style={styles.emiRow}>
                  <Text style={styles.emiRowLabel}>{row.label}</Text>
                  <Text style={[styles.emiRowValue, { color: row.color }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why Fuehrer?</Text>
          {[
            { icon: 'flash' as const, text: 'Instant approval in 2 minutes' },
            { icon: 'document-text' as const, text: 'Minimal documentation required' },
            { icon: 'shield-checkmark' as const, text: 'Secure & RBI compliant' },
            { icon: 'refresh-circle' as const, text: 'Flexible repayment options' },
          ].map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          title="Check Eligibility"
          onPress={() =>
            router.push({
              pathname: '/(main)/apply/kyc-form',
              params: {
                productName: productName ?? '',
                loanAmount: loanValue.toString(),
                tenure: selectedTenure.toString(),
                emi: emi.toString(),
              },
            })
          }
          disabled={loanValue <= 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { paddingBottom: Spacing.md },

  imageCard: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mrpBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  mrpBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },

  section: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    marginBottom: 4,
  },
  brandText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  specText: { ...Typography.caption, color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  loanInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 52,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rupeeSign: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  loanInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },
  hintText: { ...Typography.caption, color: Colors.textDisabled, marginBottom: Spacing.sm },
  progressTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  tenureLabel: { ...Typography.captionMedium, color: Colors.textSecondary, marginBottom: Spacing.sm },
  tenureRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tenureBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tenureBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tenureBtnText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textSecondary },
  tenureBtnTextActive: { color: Colors.textWhite },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.md,
  },
  rateText: { ...Typography.caption, color: Colors.textSecondary },

  emiCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  emiMain: { alignItems: 'center', paddingVertical: Spacing.lg },
  emiLabel: { ...Typography.captionMedium, color: Colors.textSecondary, marginBottom: 4 },
  emiAmount: { fontFamily: FontFamily.bold, fontSize: 30, color: Colors.primary, marginBottom: 4 },
  emiSub: { ...Typography.caption, color: Colors.textSecondary },
  emiDivider: { height: 1, backgroundColor: Colors.border },
  emiBreakdown: { padding: Spacing.md, gap: Spacing.sm },
  emiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emiRowLabel: { ...Typography.body, color: Colors.textSecondary },
  emiRowValue: { fontFamily: FontFamily.semiBold, fontSize: 13 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';

const ANNUAL_RATE = 10.56; // 0.88% per month
const MIN_LOAN = 10000;

type Tenure = 6;
type RepaymentType = 'emi' | 'interest_only' | 'bullet';

function formatPrice(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function calcEMI(principal: number, months: number): number {
  const r = ANNUAL_RATE / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

import { usePersistApplyStep } from '@/src/features/apply/useApplyDraft';

export default function GoldLoanAmountScreen() {
  usePersistApplyStep('gold');
  const { applicationId, maxLoan, goldValue, goldType, karat, weight } = useLocalSearchParams<{
    applicationId: string;
    maxLoan: string;
    goldValue: string;
    goldType: string;
    karat: string;
    weight: string;
  }>();

  const max = parseInt(maxLoan ?? '500000', 10);
  const [loanAmount, setLoanAmount] = useState(max);
  const [tenure, setTenure] = useState<Tenure>(6);
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('emi');

  const clampedLoan = Math.max(MIN_LOAN, Math.min(loanAmount, max));

  const monthly = useMemo(() => {
    if (repaymentType === 'emi') return calcEMI(clampedLoan, tenure);
    if (repaymentType === 'interest_only') return (clampedLoan * ANNUAL_RATE) / 12 / 100;
    return 0; // bullet
  }, [clampedLoan, tenure, repaymentType]);

  const totalInterest = useMemo(() => {
    if (repaymentType === 'emi') return monthly * tenure - clampedLoan;
    if (repaymentType === 'interest_only') return monthly * tenure;
    return (clampedLoan * ANNUAL_RATE * tenure) / 12 / 100;
  }, [monthly, tenure, clampedLoan, repaymentType]);

  const totalRepayment = clampedLoan + totalInterest;

  const sliderPercent = ((clampedLoan - MIN_LOAN) / (max - MIN_LOAN)) * 100;

  const TENURES: Tenure[] = [6];

  const REPAYMENT_OPTIONS: { key: RepaymentType; label: string; desc: string }[] = [
    { key: 'emi', label: 'Monthly EMI', desc: 'Principal + interest every month' },
    { key: 'interest_only', label: 'Interest Only', desc: 'Pay interest monthly, principal at end' },
    { key: 'bullet', label: 'Bullet Repayment', desc: 'Pay everything at end of tenure' },
  ];

  const handleProceed = () => {
    router.push({
      pathname: '/(main)/apply/gold-loan-kyc',
      params: {
        applicationId: applicationId ?? '',
        loanAmount: clampedLoan.toString(),
        tenure: tenure.toString(),
        repaymentType,
        goldType: goldType ?? '',
        karat: karat ?? '',
        weight: weight ?? '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Loan Amount & Tenure" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Loan amount slider */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>LOAN AMOUNT</Text>
          <Text style={styles.loanAmountText}>{formatPrice(clampedLoan)}</Text>

          {/* Simple tap-step slider */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${sliderPercent}%` }]} />
          </View>

          <View style={styles.sliderBtns}>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() => setLoanAmount((v) => Math.max(MIN_LOAN, v - 5000))}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={16} color={Colors.primary} />
              <Text style={styles.sliderBtnText}>₹5K</Text>
            </TouchableOpacity>
            <Text style={styles.sliderRange}>
              {formatPrice(MIN_LOAN)} — {formatPrice(max)}
            </Text>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() => setLoanAmount((v) => Math.min(max, v + 5000))}
              activeOpacity={0.7}
            >
              <Text style={styles.sliderBtnText}>₹5K</Text>
              <Ionicons name="add" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tenure */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TENURE</Text>
          <View style={styles.tenureRow}>
            {TENURES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tenureBtn, tenure === t && styles.tenureBtnActive]}
                onPress={() => setTenure(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tenureText, tenure === t && styles.tenureTextActive]}>
                  {t}M
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.rateText}>Gold Loan tenure is fixed at 6 months for this workflow.</Text>
        </View>

        {/* Repayment type */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>REPAYMENT TYPE</Text>
          {REPAYMENT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.repayRow}
              onPress={() => setRepaymentType(opt.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, repaymentType === opt.key && styles.radioActive]}>
                {repaymentType === opt.key && <View style={styles.radioInner} />}
              </View>
              <View style={styles.repayContent}>
                <Text style={styles.repayLabel}>{opt.label}</Text>
                <Text style={styles.repayDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        <View style={[styles.summaryCard, Shadow.medium]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="receipt" size={15} color={Colors.primary} />
            <Text style={styles.summaryHeaderText}>Repayment Summary</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {repaymentType === 'bullet' ? 'No monthly payment' : 'Monthly payment'}
            </Text>
            <Text style={styles.summaryValue}>
              {repaymentType === 'bullet' ? '—' : formatPrice(monthly)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total interest</Text>
            <Text style={[styles.summaryValue, { color: Colors.goldDark }]}>{formatPrice(totalInterest)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Total repayment</Text>
            <Text style={styles.summaryValueBold}>{formatPrice(totalRepayment)}</Text>
          </View>
          <View style={styles.rateRow}>
            <Ionicons name="information-circle-outline" size={13} color={Colors.textDisabled} />
            <Text style={styles.rateText}>Interest rate: {ANNUAL_RATE}% p.a. (reducing balance)</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Proceed to Apply" onPress={handleProceed} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg },

  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.small,
  },
  cardLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  loanAmountText: {
    fontFamily: FontFamily.bold,
    fontSize: 30,
    color: Colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  sliderBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sliderBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  sliderRange: {
    ...Typography.caption,
    color: Colors.textDisabled,
  },

  tenureRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tenureBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
  },
  tenureBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tenureText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tenureTextActive: {
    color: Colors.textWhite,
  },

  repayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  radioActive: { borderColor: Colors.primary },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  repayContent: { flex: 1 },
  repayLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  repayDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
  },
  summaryHeaderText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  summaryDivider: { height: 1, backgroundColor: Colors.border },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryLabel: { ...Typography.body, color: Colors.textSecondary },
  summaryValue: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary },
  summaryLabelBold: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary },
  summaryValueBold: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.primary },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  rateText: { ...Typography.caption, color: Colors.textDisabled },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

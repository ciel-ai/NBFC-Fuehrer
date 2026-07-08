import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { formatCurrency } from '@/src/core/utils/formatters';

type PropertyType = 'apartment' | 'independent' | 'plot_construction';

const TENURE_OPTIONS = [10, 15, 20, 25, 30] as const;
const RATE_PA = 0.084;
const AMOUNT_MIN = 500000;
const AMOUNT_MAX = 5000000;
const AMOUNT_STEP = 100000;

const PROPERTY_TYPES: { key: PropertyType; label: string; icon: string }[] = [
  { key: 'apartment',         label: 'Apartment / Flat',     icon: 'business-outline' },
  { key: 'independent',       label: 'Independent House',    icon: 'home-outline' },
  { key: 'plot_construction', label: 'Plot + Construction',  icon: 'construct-outline' },
];

function calculateEMI(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12;
  const n = months;
  if (r === 0) return Math.round(principal / n);
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

export default function HousingApplyScreen() {
  const [amount, setAmount] = useState<number>(3600000);
  const [tenure, setTenure] = useState<number>(20);
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [hasCoApplicant, setHasCoApplicant] = useState<boolean>(false);

  const emi = useMemo(
    () => calculateEMI(amount, RATE_PA, tenure * 12),
    [amount, tenure]
  );
  const totalPayable = emi * tenure * 12;
  const totalInterest = totalPayable - amount;

  const handleContinue = () => {
    router.push({
      pathname: '/(main)/apply/housing-property',
      params: {
        amount: String(amount),
        tenure: String(tenure),
        propertyType,
        hasCoApplicant: hasCoApplicant ? '1' : '0',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Housing Loan" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 1 OF 5 · LOAN DETAILS</Text>
          </View>

          {/* Amount slider area */}
          <View style={styles.card}>
            <Text style={styles.label}>LOAN AMOUNT</Text>
            <Text style={styles.bigAmount}>{formatCurrency(amount)}</Text>
            <View style={styles.amountRow}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setAmount((v) => Math.max(AMOUNT_MIN, v - AMOUNT_STEP))}
                accessibilityRole="button"
                accessibilityLabel="Decrease amount"
              >
                <Ionicons name="remove" size={18} color={Colors.primary} />
              </Pressable>
              <View style={styles.amountTrack}>
                <View
                  style={[
                    styles.amountFill,
                    { width: `${((amount - AMOUNT_MIN) / (AMOUNT_MAX - AMOUNT_MIN)) * 100}%` },
                  ]}
                />
              </View>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setAmount((v) => Math.min(AMOUNT_MAX, v + AMOUNT_STEP))}
                accessibilityRole="button"
                accessibilityLabel="Increase amount"
              >
                <Ionicons name="add" size={18} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.minMaxRow}>
              <Text style={styles.minMaxText}>{formatCurrency(AMOUNT_MIN, { compact: true })}</Text>
              <Text style={styles.minMaxText}>{formatCurrency(AMOUNT_MAX, { compact: true })}</Text>
            </View>
          </View>

          {/* Tenure */}
          <View style={styles.card}>
            <Text style={styles.label}>TENURE (YEARS)</Text>
            <View style={styles.tenureRow}>
              {TENURE_OPTIONS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.tenureChip, tenure === t && styles.tenureChipActive]}
                  onPress={() => setTenure(t)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${t} years`}
                  accessibilityState={{ selected: tenure === t }}
                >
                  <Text style={[styles.tenureText, tenure === t && styles.tenureTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* EMI preview */}
          <View style={styles.emiCard}>
            <View style={styles.emiTop}>
              <Text style={styles.emiTopLabel}>Estimated Monthly EMI</Text>
              <Text style={styles.emiTopValue}>{formatCurrency(emi)}</Text>
            </View>
            <View style={styles.emiMeta}>
              <View style={styles.emiMetaItem}>
                <Text style={styles.emiMetaKey}>Interest Rate</Text>
                <Text style={styles.emiMetaVal}>8.4% p.a.</Text>
              </View>
              <View style={styles.emiMetaDivider} />
              <View style={styles.emiMetaItem}>
                <Text style={styles.emiMetaKey}>Total Interest</Text>
                <Text style={styles.emiMetaVal}>{formatCurrency(totalInterest, { compact: true })}</Text>
              </View>
              <View style={styles.emiMetaDivider} />
              <View style={styles.emiMetaItem}>
                <Text style={styles.emiMetaKey}>Total Payable</Text>
                <Text style={styles.emiMetaVal}>{formatCurrency(totalPayable, { compact: true })}</Text>
              </View>
            </View>
          </View>

          {/* Property type */}
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.propertyList}>
            {PROPERTY_TYPES.map((p) => (
              <Pressable
                key={p.key}
                style={[styles.propertyRow, propertyType === p.key && styles.propertyRowActive]}
                onPress={() => setPropertyType(p.key)}
                accessibilityRole="radio"
                accessibilityLabel={p.label}
                accessibilityState={{ selected: propertyType === p.key }}
              >
                <View style={[styles.propertyIcon, propertyType === p.key && styles.propertyIconActive]}>
                  <Ionicons
                    name={p.icon as any}
                    size={20}
                    color={propertyType === p.key ? Colors.primary : Colors.textSecondary}
                  />
                </View>
                <Text style={[styles.propertyLabel, propertyType === p.key && { color: Colors.primary }]}>
                  {p.label}
                </Text>
                <View style={[styles.radioOuter, propertyType === p.key && styles.radioOuterActive]}>
                  {propertyType === p.key && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Co-applicant */}
          <Pressable
            style={styles.coAppRow}
            onPress={() => setHasCoApplicant((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityLabel="Add a co-applicant"
            accessibilityState={{ checked: hasCoApplicant }}
          >
            <View style={styles.coAppLeft}>
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
              <View style={styles.coAppText}>
                <Text style={styles.coAppTitle}>Add a Co-Applicant</Text>
                <Text style={styles.coAppSubtitle}>
                  Combined income improves eligibility — often required for higher amounts.
                </Text>
              </View>
            </View>
            <View style={[styles.toggle, hasCoApplicant && styles.toggleOn]}>
              <View style={[styles.toggleThumb, hasCoApplicant && styles.toggleThumbOn]} />
            </View>
          </Pressable>

          {/* PMAY hint */}
          <View style={styles.pmayHint}>
            <Ionicons name="ribbon-outline" size={16} color={Colors.primary} />
            <Text style={styles.pmayHintText}>
              You may qualify for{' '}
              <Text style={styles.pmayHintHighlight}>PMAY subsidy up to ₹2.67L</Text>
              {' '}— we'll verify in the next steps.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Continue" onPress={handleContinue} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  stepBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary,
    letterSpacing: 0.8,
  },

  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  bigAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.primary,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepperBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  amountFill: { height: '100%', backgroundColor: Colors.primary },
  minMaxRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  minMaxText: { ...Typography.tiny, color: Colors.textDisabled },

  tenureRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  tenureChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  tenureChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tenureText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  tenureTextActive: { color: Colors.primary },

  emiCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  emiTop: { marginBottom: Spacing.md },
  emiTopLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  emiTopValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.textWhite,
    marginTop: 4,
  },
  emiMeta: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  emiMetaItem: { flex: 1, alignItems: 'center' },
  emiMetaKey: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  emiMetaVal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.textWhite,
    marginTop: 2,
  },
  emiMetaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  propertyList: { gap: Spacing.sm },
  propertyRow: {
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
  propertyRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  propertyIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyIconActive: { backgroundColor: Colors.background },
  propertyLabel: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
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

  coAppRow: {
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
  coAppLeft: { flex: 1, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  coAppText: { flex: 1 },
  coAppTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  coAppSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  toggle: {
    width: scale(44),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: Colors.background,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  pmayHint: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  pmayHintText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  pmayHintHighlight: {
    fontFamily: FontFamily.semiBold,
  },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

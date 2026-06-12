import React, { useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { Button } from '@/src/shared/components/common/Button';

// ---------------------------------------------------------------------------
// Loan definitions — fixed interest rate, no rate slider
// ---------------------------------------------------------------------------

interface LoanType {
  id: 'home' | 'gold' | 'consumer';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  rate: number;
  minAmt: number;
  maxAmt: number;
  step: number;
  defaultAmt: number;
  tenures: number[];
  defaultTenure: number;
  applyRoute?: string;
}

const LOAN_TYPES: LoanType[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    rate: 9.25,
    minAmt: 5_00_000,
    maxAmt: 5_00_00_000,
    step: 50_000,
    defaultAmt: 35_00_000,
    tenures: [60, 120, 180, 240, 300, 360],
    defaultTenure: 240,
    applyRoute: '/(main)/apply/affordable-housing',
  },
  {
    id: 'gold',
    label: 'Gold',
    icon: 'diamond',
    rate: 11.0,
    minAmt: 10_000,
    maxAmt: 50_00_000,
    step: 5_000,
    defaultAmt: 1_50_000,
    tenures: [6, 12, 24, 36],
    defaultTenure: 12,
    applyRoute: '/(main)/apply/gold-loan',
  },
  {
    id: 'consumer',
    label: 'Consumer Durable',
    icon: 'phone-portrait',
    rate: 14.0,
    minAmt: 5_000,
    maxAmt: 5_00_000,
    step: 1_000,
    defaultAmt: 50_000,
    tenures: [6, 12, 18, 24, 36],
    defaultTenure: 12,
    applyRoute: '/(main)/apply/consumer-durable',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcEMI(P: number, annualRate: number, months: number): number {
  if (annualRate === 0) return P / months;
  const r = annualRate / 12 / 100;
  return (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function fmtINR(val: number): string {
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

function fmtShort(val: number): string {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)} Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(val % 1_00_000 === 0 ? 0 : 1)}L`;
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1)}K`;
  return `₹${val}`;
}

function fmtTenure(months: number): string {
  if (months >= 12 && months % 12 === 0) return `${months / 12}Y`;
  return `${months}M`;
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function AmountSlider({ value, min, max, step, onChange }: SliderProps) {
  const trackWidth = useRef(0);
  const dragStartX = useRef(0);
  const valueRef = useRef(value);
  const configRef = useRef({ min, max, step, onChange });

  valueRef.current = value;
  configRef.current = { min, max, step, onChange };

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderGrant: (e) => {
        dragStartX.current = e.nativeEvent.locationX;
        updateFromX(dragStartX.current);
      },
      onPanResponderMove: (_, gesture) => {
        updateFromX(dragStartX.current + gesture.dx);
      },
      onShouldBlockNativeResponder: () => true,
    }),
  ).current;

  function updateFromX(x: number) {
    if (trackWidth.current === 0) return;
    const { min, max, step, onChange } = configRef.current;
    const ratio = Math.min(1, Math.max(0, x / trackWidth.current));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    const next = Math.min(max, Math.max(min, stepped));

    if (next !== valueRef.current) {
      valueRef.current = next;
      onChange(next);
    }
  }

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  return (
    <View
      style={sliderStyles.hitArea}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <View style={sliderStyles.track}>
        <View style={[sliderStyles.fill, { width: `${pct * 100}%` as any }]} />
      </View>
      <View
        style={[
          sliderStyles.thumb,
          { left: `${pct * 100}%` as any, transform: [{ translateX: -scale(14) }] },
        ]}
      >
        <View style={sliderStyles.thumbInner} />
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  hitArea: {
    height: scale(46),
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: scale(8),
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  thumb: {
    position: 'absolute',
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: Colors.background,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    marginTop: -scale(14),
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  thumbInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: Colors.primary,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const [activeId, setActiveId] = useState<LoanType['id']>('home');
  const loan = LOAN_TYPES.find((l) => l.id === activeId)!;

  const [amount, setAmount] = useState<number>(loan.defaultAmt);
  const [tenure, setTenure] = useState<number>(loan.defaultTenure);

  const switchLoan = (id: LoanType['id']) => {
    const l = LOAN_TYPES.find((x) => x.id === id)!;
    setActiveId(id);
    setAmount(l.defaultAmt);
    setTenure(l.defaultTenure);
  };

  const emi = useMemo(() => calcEMI(amount, loan.rate, tenure), [amount, tenure, loan.rate]);
  const totalPay = emi * tenure;
  const totalInt = totalPay - amount;

  return (
    <View style={styles.container}>
      <AppHeader title="EMI Calculator" />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + scale(96) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Loan type pill tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {LOAN_TYPES.map((l) => {
              const active = activeId === l.id;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => switchLoan(l.id)}
                  style={[styles.pill, active && styles.pillActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={l.icon}
                    size={scale(15)}
                    color={active ? Colors.textWhite : Colors.primary}
                  />
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Loan amount */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Loan amount</Text>
              <Text style={styles.amountValue}>{fmtINR(amount)}</Text>
            </View>
            <AmountSlider
              value={amount}
              min={loan.minAmt}
              max={loan.maxAmt}
              step={loan.step}
              onChange={setAmount}
            />
            <View style={styles.rangeRow}>
              <Text style={styles.rangeText}>{fmtShort(loan.minAmt)}</Text>
              <Text style={styles.rangeText}>{fmtShort(loan.maxAmt)}</Text>
            </View>
          </View>

          {/* Tenure */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tenure</Text>
            <View style={styles.tenureRow}>
              {loan.tenures.map((t) => {
                const active = tenure === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTenure(t)}
                    style={[styles.tenureChip, active && styles.tenureChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.tenureText,
                        active && styles.tenureTextActive,
                      ]}
                    >
                      {fmtTenure(t)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Interest rate (fixed info row) */}
          <View style={styles.rateRow}>
            <View style={styles.rateLeft}>
              <Ionicons name="trending-up" size={scale(16)} color={Colors.textSecondary} />
              <Text style={styles.rateLabel}>Interest rate</Text>
            </View>
            <Text style={styles.rateValue}>{loan.rate}% p.a.</Text>
          </View>

          {/* EMI result card */}
          <View style={styles.emiCard}>
            <Text style={styles.emiLabel}>Your monthly EMI</Text>
            <Text style={styles.emiValue}>{fmtINR(emi)}</Text>
            <View style={styles.emiDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Principal</Text>
              <Text style={styles.breakdownValue}>{fmtINR(amount)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Interest</Text>
              <Text style={styles.breakdownValue}>{fmtINR(totalInt)}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
              <Text style={styles.breakdownLabelTotal}>Total payable</Text>
              <Text style={styles.breakdownValueTotal}>{fmtINR(totalPay)}</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            EMI is indicative. Actual rates depend on credit profile and RBI norms.
          </Text>
        </ScrollView>

        <View
          style={[
            styles.applyBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md },
          ]}
        >
          <Button
            title="Apply now"
            onPress={() => {
              if (loan.applyRoute) {
                router.push(loan.applyRoute as Parameters<typeof router.push>[0]);
              }
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Pills
  pillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    minHeight: scale(40),
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  pillTextActive: {
    color: Colors.textWhite,
  },

  // Section
  section: {
    marginTop: Spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.textPrimary,
    lineHeight: FontSize['3xl'] * 1.1,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rangeText: {
    ...Typography.tiny,
    color: Colors.textDisabled,
  },

  // Tenure chips
  tenureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tenureChip: {
    minWidth: scale(56),
    minHeight: scale(44),
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenureChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  tenureText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  tenureTextActive: {
    color: Colors.primary,
  },

  // Fixed rate info row
  rateRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  rateValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },

  // EMI result card
  emiCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  emiLabel: {
    ...Typography.caption,
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.semiBold,
  },
  emiValue: {
    fontFamily: FontFamily.bold,
    fontSize: scale(40),
    lineHeight: scale(48),
    color: Colors.primary,
    marginTop: 4,
  },
  emiDivider: {
    height: 1,
    backgroundColor: `${Colors.primary}20`,
    marginVertical: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  breakdownRowTotal: {
    borderTopWidth: 1,
    borderTopColor: `${Colors.primary}20`,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  breakdownLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  breakdownLabelTotal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  breakdownValueTotal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
  },

  disclaimer: {
    ...Typography.tiny,
    color: Colors.textDisabled,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },

  // Footer apply bar
  applyBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

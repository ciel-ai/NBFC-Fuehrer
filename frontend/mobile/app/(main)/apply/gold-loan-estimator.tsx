import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useLoanConsent } from '@/src/features/loans/components/LoanConsentGate';

const FALLBACK_GOLD_RATE_PER_GRAM = 6200;
const LTV_RATIO = 0.75;

type GoldType = 'Jewellery' | 'Coins' | 'Bars';
type Karat = '18K' | '20K' | '22K' | '24K';

const KARAT_PURITY: Record<Karat, number> = {
  '18K': 0.75,
  '20K': 0.833,
  '22K': 0.916,
  '24K': 1.0,
};

function formatPrice(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function GoldLoanEstimatorScreen() {
  const { goldLoanService } = useServices();
  const { ensureConsent, consentGate } = useLoanConsent();
  const [goldType, setGoldType] = useState<GoldType>('Jewellery');
  const [karat, setKarat] = useState<Karat>('22K');
  const [weight, setWeight] = useState('10');
  const [goldRate, setGoldRate] = useState(FALLBACK_GOLD_RATE_PER_GRAM);
  const [rateSource, setRateSource] = useState('Backend fallback');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadRate = async () => {
      try {
        const rate = await goldLoanService.getGoldRate();
        if (!mounted) return;
        setGoldRate(rate.ratePerGram);
        setRateSource(rate.source);
      } catch {
        if (!mounted) return;
        setGoldRate(FALLBACK_GOLD_RATE_PER_GRAM);
        setRateSource('Backend fallback');
      }
    };
    void loadRate();
    return () => {
      mounted = false;
    };
  }, [goldLoanService]);

  const weightNum = useMemo(() => {
    const v = parseFloat(weight);
    return isNaN(v) || v <= 0 ? 0 : v;
  }, [weight]);

  const purity = KARAT_PURITY[karat];
  const goldValue = useMemo(() => weightNum * purity * goldRate, [weightNum, purity, goldRate]);
  const maxLoan = useMemo(() => goldValue * LTV_RATIO, [goldValue]);

  const handleGetLoan = () => {
    if (maxLoan <= 0 || creating) return;
    // T&C / KYC / bureau consent is collected here — at application start,
    // not at login. Shows once per install, then goes straight through.
    ensureConsent(async () => {
      // Create the application up front so its id threads through the whole
      // journey (documents, compliance, appraisal, agreement). A failed create
      // must abort — never navigate into a flow with no application to attach to.
      setCreating(true);
      try {
        const app = await goldLoanService.createApplication({
          goldType,
          karat,
          weightGrams: weightNum,
          estimatedGoldValue: Math.round(goldValue),
          requestedAmount: Math.round(maxLoan),
        });
        router.push({
          pathname: '/(main)/apply/gold-loan-amount',
          params: {
            applicationId: app.applicationId,
            maxLoan: Math.round(maxLoan).toString(),
            goldValue: Math.round(goldValue).toString(),
            goldType,
            karat,
            weight,
          },
        });
      } catch {
        Alert.alert(
          'Could not start application',
          'We could not start your gold loan application. Please check your connection and try again.',
        );
      } finally {
        setCreating(false);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Gold Loan Estimator" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>Tell us about your gold</Text>
          <Text style={styles.pageSubtitle}>
            Get an instant estimate of how much loan you can get.
          </Text>

          {/* Gold Type */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>GOLD TYPE</Text>
            <View style={styles.segmentRow}>
              {(['Jewellery', 'Coins', 'Bars'] as GoldType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.segmentBtn, goldType === t && styles.segmentBtnActive]}
                  onPress={() => setGoldType(t)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: goldType === t }}
                  accessibilityLabel={`Gold type: ${t}`}
                >
                  <Text style={[styles.segmentText, goldType === t && styles.segmentTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Karat */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PURITY / KARAT</Text>
            <View style={styles.karatRow}>
              {(['18K', '20K', '22K', '24K'] as Karat[]).map((k) => (
                <Pressable
                  key={k}
                  style={[styles.karatChip, karat === k && styles.karatChipActive]}
                  onPress={() => setKarat(k)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: karat === k }}
                  accessibilityLabel={`Karat: ${k}`}
                >
                  <Text style={[styles.karatText, karat === k && styles.karatTextActive]}>{k}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.karatHint}>
              Purity: {(KARAT_PURITY[karat] * 100).toFixed(1)}% pure gold
            </Text>
          </View>

          {/* Weight */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>APPROXIMATE WEIGHT (GRAMS)</Text>
            <View style={styles.weightRow}>
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  const v = Math.max(1, parseFloat(weight || '0') - 1);
                  setWeight(v.toString());
                }}
                android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
                accessibilityRole="button"
                accessibilityLabel="Decrease weight"
              >
                <Ionicons name="remove" size={scale(20)} color={Colors.primary} />
              </Pressable>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                textAlign="center"
                accessibilityLabel="Gold weight in grams"
              />
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  const v = parseFloat(weight || '0') + 1;
                  setWeight(v.toString());
                }}
                android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
                accessibilityRole="button"
                accessibilityLabel="Increase weight"
              >
                <Ionicons name="add" size={scale(20)} color={Colors.primary} />
              </Pressable>
            </View>
            <Text style={styles.karatHint}>Enter the total weight of your gold items</Text>
          </View>

          {/* Live estimate card */}
          <View style={[styles.estimateCard, Shadow.medium]}>
            <View style={styles.estimateHeader}>
              <Ionicons name="stats-chart" size={scale(16)} color={Colors.primary} />
              <Text style={styles.estimateHeaderText}>Loan Estimate</Text>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Rate</Text>
            </View>

            <View style={styles.estimateDivider} />

            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Today's gold rate</Text>
              <Text style={styles.estimateValue}>{formatPrice(goldRate)}/gram</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Rate source</Text>
              <Text style={styles.estimateValue}>{rateSource}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Estimated gold value</Text>
              <Text style={styles.estimateValue}>{goldValue > 0 ? formatPrice(goldValue) : '—'}</Text>
            </View>
            <View style={styles.estimateDivider} />
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabelBold}>Maximum loan (75% LTV)</Text>
              <Text style={styles.estimateValueBold}>{maxLoan > 0 ? formatPrice(maxLoan) : '—'}</Text>
            </View>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerRow}>
            <Ionicons name="information-circle-outline" size={scale(14)} color={Colors.textDisabled} />
            <Text style={styles.disclaimerText}>
              Final value subject to physical assessment at branch.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Get This Loan"
            onPress={handleGetLoan}
            disabled={maxLoan <= 0 || creating}
            loading={creating}
          />
        </View>
      </KeyboardAvoidingView>
      {consentGate}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg },

  pageTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  pageSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

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
    marginBottom: 2,
  },

  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textWhite,
    fontFamily: FontFamily.semiBold,
  },

  karatRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  karatChip: {
    flex: 1,
    height: scale(40),
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
  },
  karatChipActive: {
    backgroundColor: Colors.goldLight,
    borderColor: Colors.gold,
  },
  karatText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  karatTextActive: {
    color: Colors.goldDark,
  },
  karatHint: {
    ...Typography.caption,
    color: Colors.textDisabled,
  },

  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  weightInput: {
    flex: 1,
    height: scale(52),
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },

  estimateCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
  },
  estimateHeaderText: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  liveText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.success,
  },
  estimateDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  estimateLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  estimateValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  estimateLabelBold: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  estimateValueBold: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
  },

  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  disclaimerText: {
    flex: 1,
    ...Typography.caption,
    color: Colors.textDisabled,
    lineHeight: 17,
  },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

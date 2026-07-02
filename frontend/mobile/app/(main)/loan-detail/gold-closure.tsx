import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { GoldLoanClosureQuote } from '@/src/entities/goldLoan';

export default function GoldClosureScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { goldLoanService } = useServices();
  const [quote, setQuote] = useState<GoldLoanClosureQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await goldLoanService.getClosureQuote(id ?? 'gold_loan_001');
        if (mounted) setQuote(result);
      } catch {
        if (mounted) Alert.alert('Closure quote unavailable', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [goldLoanService, id]);

  const closeLoan = () => {
    Alert.alert('Closure request submitted', 'NACH cancellation, gold release and NOC generation will be confirmed after repayment.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Gold Loan Closure" showBack />
      {loading || !quote ? (
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Total payable for closure</Text>
              <Text style={styles.amount}>{formatCurrency(quote.totalPayable)}</Text>
              <Text style={styles.amountSub}>Includes outstanding and accrued interest</Text>
            </View>

            <View style={styles.card}>
              {[
                ['Outstanding', formatCurrency(quote.outstandingAmount)],
                ['Accrued interest', formatCurrency(quote.interestAccrued)],
                ['Foreclosure charges', formatCurrency(quote.foreclosureCharges)],
                ['Gold release branch', quote.goldReleaseBranch],
                ['NOC reference', quote.nocRef],
              ].map(([label, value], index, arr) => (
                <View key={label}>
                  <View style={styles.row}>
                    <Text style={styles.key}>{label}</Text>
                    <Text style={styles.value}>{value}</Text>
                  </View>
                  {index < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <View style={styles.stepsCard}>
              {[
                'Collect repayment',
                'Cancel NACH mandate',
                'Release pledged gold at branch',
                'Generate NOC and store copy',
              ].map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.agreeRow}
              onPress={() => setAgreed((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={12} color={Colors.textWhite} />}
              </View>
              <Text style={styles.agreeText}>I understand gold release happens after payment confirmation.</Text>
            </Pressable>
          </ScrollView>
          <View style={styles.footer}>
            <Button title="Pay & Request Closure" disabled={!agreed} onPress={closeLoan} />
            <Pressable style={styles.nocLink} onPress={() => router.push({ pathname: '/(main)/loan-detail/noc', params: { id } })}>
              <Text style={styles.nocLinkText}>View NOC Preview</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  amountCard: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.xl },
  amountLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.78)' },
  amount: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], color: Colors.textWhite, marginVertical: 4 },
  amountSub: { ...Typography.caption, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  stepsCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: FontFamily.bold, color: Colors.primary, fontSize: FontSize.xs },
  stepText: { ...Typography.caption, color: Colors.textPrimary, flex: 1 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreeText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  nocLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  nocLinkText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary },
});

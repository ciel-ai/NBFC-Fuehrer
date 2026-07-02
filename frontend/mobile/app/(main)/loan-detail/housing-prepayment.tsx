import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { formatCurrency, formatTenure } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { HousingPrepaymentQuote, HousingPrepaymentResult } from '@/src/entities/housingLoan';

type Option = 'reduce_tenure' | 'reduce_emi';

export default function HousingPrepaymentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { housingLoanService } = useServices();
  const queryClient = useQueryClient();
  const loanId = id ?? 'L1';

  const [amountInput, setAmountInput] = useState('');
  const [quote, setQuote] = useState<HousingPrepaymentQuote | null>(null);
  const [option, setOption] = useState<Option>('reduce_tenure');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<HousingPrepaymentResult | null>(null);

  const prepayAmount = Number(amountInput) || 0;

  const getQuote = async () => {
    if (prepayAmount <= 0) return;
    setLoadingQuote(true);
    try {
      const q = await housingLoanService.getPrepaymentQuote(loanId, prepayAmount);
      setQuote(q);
    } catch {
      Alert.alert('Quote unavailable', 'Please try again.');
    } finally {
      setLoadingQuote(false);
    }
  };

  const confirm = async () => {
    setProcessing(true);
    try {
      const res = await housingLoanService.processPrepayment(loanId, { prepaymentAmount: prepayAmount, option });
      setResult(res);
      await queryClient.invalidateQueries({ queryKey: ['activeLoans'] });
    } catch {
      Alert.alert('Prepayment failed', 'Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (result) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Prepayment Done" showBack />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.successCircle}><Ionicons name="checkmark" size={44} color={Colors.textWhite} /></View>
            <Text style={styles.title}>Prepayment successful</Text>
            <Text style={styles.subtitle}>
              {result.option === 'reduce_tenure' ? 'Your tenure has been reduced.' : 'Your EMI has been reduced.'}
            </Text>
          </View>
          <View style={styles.card}>
            {[
              ['Payment ID', result.paymentId],
              ['New outstanding', formatCurrency(result.newOutstanding)],
              ['New tenure', formatTenure(result.newTenureMonths)],
              ['New EMI', formatCurrency(result.newEmi)],
            ].map(([k, v], i, arr) => (
              <View key={k}>
                <View style={styles.row}><Text style={styles.key}>{k}</Text><Text style={styles.value}>{v}</Text></View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
          <Button title="View Updated Schedule" onPress={() => router.replace({ pathname: '/(main)/loan-detail/emi-schedule', params: { id: loanId } })} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Partial Prepayment" showBack />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={styles.label}>PREPAYMENT AMOUNT (₹)</Text>
            <TextInput
              style={styles.input}
              value={amountInput}
              onChangeText={(t) => { setAmountInput(t.replace(/\D/g, '')); setQuote(null); }}
              keyboardType="number-pad"
              placeholder="e.g. 500000"
              placeholderTextColor={Colors.textDisabled}
            />
            <Text style={styles.hint}>Collected via Razorpay Payment API.</Text>
          </View>

          {!quote ? (
            <Button title={loadingQuote ? 'Calculating…' : 'Calculate Impact'} loading={loadingQuote} disabled={prepayAmount <= 0 || loadingQuote} onPress={getQuote} />
          ) : (
            <>
              <View style={styles.card}>
                {[
                  ['Outstanding principal', formatCurrency(quote.outstandingPrincipal)],
                  ['Prepayment', `– ${formatCurrency(quote.prepaymentAmount)}`],
                  ['New outstanding', formatCurrency(quote.newOutstanding)],
                ].map(([k, v], i, arr) => (
                  <View key={k}>
                    <View style={styles.row}><Text style={styles.key}>{k}</Text><Text style={styles.value}>{v}</Text></View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Choose how to apply it</Text>

              <Pressable style={[styles.optionCard, option === 'reduce_tenure' && styles.optionActive]} onPress={() => setOption('reduce_tenure')}>
                <View style={styles.optionHeader}>
                  <Ionicons name={option === 'reduce_tenure' ? 'radio-button-on' : 'radio-button-off'} size={20} color={Colors.primary} />
                  <Text style={styles.optionTitle}>Reduce tenure</Text>
                </View>
                <Text style={styles.optionDetail}>
                  Keep EMI at {formatCurrency(quote.reduceTenureOption.emi)} · tenure {formatTenure(quote.currentTenureMonths)} → {formatTenure(quote.reduceTenureOption.newTenureMonths)}
                </Text>
              </Pressable>

              <Pressable style={[styles.optionCard, option === 'reduce_emi' && styles.optionActive]} onPress={() => setOption('reduce_emi')}>
                <View style={styles.optionHeader}>
                  <Ionicons name={option === 'reduce_emi' ? 'radio-button-on' : 'radio-button-off'} size={20} color={Colors.primary} />
                  <Text style={styles.optionTitle}>Reduce EMI</Text>
                </View>
                <Text style={styles.optionDetail}>
                  Keep tenure {formatTenure(quote.reduceEmiOption.tenureMonths)} · EMI {formatCurrency(quote.currentEmi)} → {formatCurrency(quote.reduceEmiOption.newEmi)}
                </Text>
              </Pressable>

              <Button title={processing ? 'Processing…' : `Pay ${formatCurrency(prepayAmount)} & Apply`} loading={processing} disabled={processing} onPress={confirm} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { ...Typography.label, color: Colors.textSecondary },
  input: { minHeight: 50, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  hint: { ...Typography.tiny, color: Colors.textDisabled },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  optionCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, gap: Spacing.xs },
  optionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  optionTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary },
  optionDetail: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  heroCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  successCircle: { width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

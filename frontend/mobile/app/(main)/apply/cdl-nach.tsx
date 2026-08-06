import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useIdempotencyKey } from '@/src/core/api/idempotency';
import {
  cdlAutoDebitLabel,
  CDL_AUTO_DEBIT_DATES,
  CDL_DEFAULT_AUTO_DEBIT_DATE,
  type CdlNachResult,
} from '@/src/entities/consumerDurableLoan';

import { usePersistApplyStep } from '@/src/features/apply/useApplyDraft';

export default function CdlNachScreen() {
  usePersistApplyStep('cdl');
  const params = useLocalSearchParams<Record<string, string>>();
  const { consumerDurableLoanService } = useServices();
  const { getKey } = useIdempotencyKey();
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CdlNachResult | null>(null);
  const [debitDate, setDebitDate] = useState<number>(
    params.debitDate ? Number(params.debitDate) : CDL_DEFAULT_AUTO_DEBIT_DATE,
  );

  const emi = Number(params.emi ?? 0);
  const accountsMatch = accountNumber.length >= 9 && accountNumber === confirmAccount;
  const validIfsc = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  const canSubmit = accountsMatch && validIfsc && agreed;

  const setupNach = async () => {
    setLoading(true);
    try {
      const data = await consumerDurableLoanService.registerNachMandate(
        params.applicationId ?? 'cdl_mock_application',
        { emi, bankAccount: `****${accountNumber.slice(-4)}`, autoDebitDate: debitDate },
        getKey(),
      );
      setResult(data);
    } catch {
      Alert.alert('NACH setup failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="NACH Auto-Debit" showBack />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!result ? (
            <>
              <View style={styles.infoCard}>
                <Ionicons name="repeat-outline" size={24} color={Colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Auto-debit mandate</Text>
                  <Text style={styles.infoText}>
                    Razorpay registers the NACH e-mandate. We collect your consent and show the mandate status.
                  </Text>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>ACCOUNT NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={accountNumber}
                  onChangeText={(t) => setAccountNumber(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholder="Enter account number"
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>CONFIRM ACCOUNT NUMBER</Text>
                <TextInput
                  style={[styles.input, confirmAccount.length > 0 && !accountsMatch && styles.inputError]}
                  value={confirmAccount}
                  onChangeText={(t) => setConfirmAccount(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="Re-enter account number"
                  placeholderTextColor={Colors.textDisabled}
                />
                {confirmAccount.length > 0 && !accountsMatch && <Text style={styles.errorText}>Account numbers do not match</Text>}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>IFSC CODE</Text>
                <TextInput
                  style={[styles.input, ifsc.length === 11 && !validIfsc && styles.inputError]}
                  value={ifsc}
                  onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                  autoCapitalize="characters"
                  placeholder="e.g. HDFC0001234"
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>AUTO-DEBIT DATE</Text>
                <View style={styles.debitRow}>
                  {CDL_AUTO_DEBIT_DATES.map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.debitChip, debitDate === d && styles.debitChipActive]}
                      onPress={() => setDebitDate(d)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: debitDate === d }}
                      accessibilityLabel={cdlAutoDebitLabel(d)}
                    >
                      <Text style={[styles.debitChipText, debitDate === d && styles.debitChipTextActive]}>
                        {d}th
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.summaryCard}>
                {[
                  ['Mandate amount', formatCurrency(emi)],
                  ['Debit date', cdlAutoDebitLabel(debitDate)],
                  ['Mandate validity', 'Till loan closure'],
                  ['Provider', 'Razorpay NACH'],
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

              <Pressable style={styles.agreeRow} onPress={() => setAgreed((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Ionicons name="checkmark" size={12} color={Colors.textWhite} />}
                </View>
                <Text style={styles.agreeText}>I authorize monthly auto-debit of {formatCurrency(emi)} on the {cdlAutoDebitLabel(debitDate)}.</Text>
              </Pressable>

              <Button title="Register NACH Mandate" disabled={!canSubmit || loading} loading={loading} onPress={setupNach} />
            </>
          ) : (
            <View style={styles.successSection}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={48} color={Colors.textWhite} />
              </View>
              <Text style={styles.title}>Mandate registered</Text>
              <Text style={styles.subtitle}>Auto-debit is active. The loan can move to disbursal.</Text>
              <View style={styles.summaryCard}>
                {[
                  ['Mandate ID', result.mandateId],
                  ['Status', 'Active'],
                  ['Debit date', result.debitDate],
                  ['EMI amount', formatCurrency(result.emi)],
                  ['Bank account', result.bankAccount],
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
              <Button
                title="Continue to Disbursal"
                onPress={() => router.push({ pathname: '/(main)/apply/cdl-disbursal', params })}
              />
            </View>
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
  infoCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg, padding: Spacing.md },
  infoContent: { flex: 1 },
  infoTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary },
  infoText: { ...Typography.caption, color: Colors.primary, lineHeight: 18, marginTop: 2 },
  field: { gap: Spacing.xs },
  label: { ...Typography.label, color: Colors.textSecondary },
  input: { minHeight: 50, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontFamily: FontFamily.medium, fontSize: FontSize.base },
  inputError: { borderColor: Colors.error },
  errorText: { ...Typography.tiny, color: Colors.error },
  debitRow: { flexDirection: 'row', gap: Spacing.sm },
  debitChip: { flex: 1, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  debitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  debitChipText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary },
  debitChipTextActive: { color: Colors.textWhite },
  summaryCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreeText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  successSection: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  successCircle: { width: 92, height: 92, borderRadius: 46, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

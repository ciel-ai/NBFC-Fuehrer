import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

type AccountType = 'savings' | 'current';
type ENachStep = 'form' | 'confirming' | 'success';

const POPULAR_BANKS = [
  { id: 'sbi',  label: 'SBI',    color: '#003087' },
  { id: 'hdfc', label: 'HDFC',   color: '#CC0000' },
  { id: 'icici',label: 'ICICI',  color: '#F58220' },
  { id: 'axis', label: 'Axis',   color: '#97144D' },
  { id: 'kotak',label: 'Kotak',  color: '#EF3E23' },
  { id: 'other',label: 'Other',  color: Colors.textSecondary },
];

export default function ENachScreen() {
  const [step, setStep] = useState<ENachStep>('form');
  const [selectedBank, setSelectedBank] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('savings');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const accountsMatch = accountNumber.length > 0 && accountNumber === confirmAccount;
  const isValidIFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

  const canSubmit =
    (bankName.trim().length > 0 || selectedBank !== '') &&
    accountNumber.length >= 9 &&
    accountsMatch &&
    isValidIFSC &&
    agreed;

  const handleAuthorize = async () => {
    setLoading(true);
    setStep('confirming');
    await new Promise((r) => setTimeout(r, 2500));
    setLoading(false);
    setStep('success');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="eNACH Auto-Debit Setup" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'form' && (
            <>
              <View style={styles.mandateInfo}>
                <View style={styles.mandateInfoRow}>
                  <Ionicons name="repeat" size={scale(20)} color={Colors.primary} />
                  <Text style={styles.mandateInfoTitle}>How Auto-Debit Works</Text>
                </View>
                {[
                  'Your EMI of ₹9,800 is automatically debited on the 5th of each month.',
                  'No manual payments needed — your bank processes it automatically.',
                  'You can cancel the mandate anytime by contacting us.',
                ].map((txt, i) => (
                  <View key={i} style={styles.mandateBullet}>
                    <View style={styles.mandateDot} />
                    <Text style={styles.mandateBulletText}>{txt}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Select Your Bank</Text>
              <View style={styles.banksGrid}>
                {POPULAR_BANKS.map((bank) => (
                  <Pressable
                    key={bank.id}
                    style={[styles.bankCard, selectedBank === bank.id && styles.bankCardActive]}
                    onPress={() => {
                      setSelectedBank(bank.id);
                      if (bank.id !== 'other') setBankName(bank.label + ' Bank');
                      else setBankName('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={bank.label}
                  >
                    <View style={[styles.bankInitial, { backgroundColor: `${bank.color}20` }]}>
                      <Text style={[styles.bankInitialText, { color: bank.color }]}>
                        {bank.label[0]}
                      </Text>
                    </View>
                    <Text style={[styles.bankLabel, selectedBank === bank.id && { color: Colors.primary }]}>
                      {bank.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {selectedBank === 'other' && (
                <View style={styles.field}>
                  <Text style={styles.label}>BANK NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Punjab National Bank"
                    placeholderTextColor={Colors.textDisabled}
                    value={bankName}
                    onChangeText={setBankName}
                    accessibilityLabel="Bank name"
                  />
                </View>
              )}

              <Text style={styles.sectionTitle}>Account Details</Text>

              <View style={styles.field}>
                <Text style={styles.label}>ACCOUNT TYPE</Text>
                <View style={styles.chipRow}>
                  {(['savings', 'current'] as AccountType[]).map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.chip, accountType === t && styles.chipActive]}
                      onPress={() => setAccountType(t)}
                      accessibilityRole="radio"
                      accessibilityLabel={t === 'savings' ? 'Savings account' : 'Current account'}
                      accessibilityState={{ selected: accountType === t }}
                    >
                      <Text style={[styles.chipText, accountType === t && styles.chipTextActive]}>
                        {t === 'savings' ? 'Savings' : 'Current'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>ACCOUNT NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account number"
                  placeholderTextColor={Colors.textDisabled}
                  value={accountNumber}
                  onChangeText={(t) => setAccountNumber(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  secureTextEntry
                  accessibilityLabel="Account number"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CONFIRM ACCOUNT NUMBER</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Re-enter account number"
                    placeholderTextColor={Colors.textDisabled}
                    value={confirmAccount}
                    onChangeText={setConfirmAccount}
                    keyboardType="number-pad"
                    accessibilityLabel="Confirm account number"
                  />
                  {confirmAccount.length > 0 && (
                    <Ionicons
                      name={accountsMatch ? 'checkmark-circle' : 'close-circle'}
                      size={scale(20)}
                      color={accountsMatch ? Colors.success : Colors.error}
                    />
                  )}
                </View>
                {confirmAccount.length > 0 && !accountsMatch && (
                  <Text style={styles.errorText}>Account numbers do not match</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>IFSC CODE</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="e.g. SBIN0001234"
                    placeholderTextColor={Colors.textDisabled}
                    value={ifsc}
                    onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                    autoCapitalize="characters"
                    maxLength={11}
                    accessibilityLabel="IFSC code"
                  />
                  {ifsc.length === 11 && (
                    <Ionicons
                      name={isValidIFSC ? 'checkmark-circle' : 'close-circle'}
                      size={scale(20)}
                      color={isValidIFSC ? Colors.success : Colors.error}
                    />
                  )}
                </View>
                <Text style={styles.inputHint}>Find IFSC on your cheque book or bank passbook</Text>
              </View>

              <View style={styles.mandateSummary}>
                <Text style={styles.mandateSummaryTitle}>Mandate Summary</Text>
                {[
                  { label: 'Debit Amount',   value: '₹9,800 / month' },
                  { label: 'Debit Date',      value: '5th of every month' },
                  { label: 'Mandate Type',    value: 'NACH (National Auto. Clearing)' },
                  { label: 'Valid Until',     value: 'End of loan tenure' },
                ].map((item, i, arr) => (
                  <View key={item.label}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>{item.label}</Text>
                      <Text style={styles.summaryVal}>{item.value}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.summaryDivider} />}
                  </View>
                ))}
              </View>

              <Pressable
                style={styles.agreeRow}
                onPress={() => setAgreed((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityLabel="I authorize auto-debit"
                accessibilityState={{ checked: agreed }}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Ionicons name="checkmark" size={scale(12)} color={Colors.textWhite} />}
                </View>
                <Text style={styles.agreeText}>
                  I authorize Fuehrer NBFC to debit ₹9,800 monthly from my account until the loan is fully repaid.
                </Text>
              </Pressable>

              <Button
                title="Authorize Auto-Debit"
                onPress={handleAuthorize}
                disabled={!canSubmit}
              />
            </>
          )}

          {step === 'confirming' && (
            <View style={styles.confirmingSection}>
              <View style={styles.confirmingIcon}>
                <Ionicons name="sync" size={scale(40)} color={Colors.primary} />
              </View>
              <Text style={styles.confirmingTitle}>Setting Up Mandate…</Text>
              <Text style={styles.confirmingSubtitle}>
                Registering your eNACH mandate with the NPCI. This may take a few seconds.
              </Text>
              {['Validating account details', 'Registering with NPCI', 'Activating mandate'].map((s, i) => (
                <View key={s} style={styles.confirmingStep}>
                  <Ionicons
                    name={i < 2 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={scale(18)}
                    color={i < 2 ? Colors.success : Colors.textDisabled}
                  />
                  <Text style={[styles.confirmingStepText, i < 2 && { color: Colors.success }]}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {step === 'success' && (
            <View style={styles.successSection}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={scale(52)} color={Colors.textWhite} />
              </View>
              <Text style={styles.successTitle}>Auto-Debit Activated!</Text>
              <Text style={styles.successSubtitle}>
                Your eNACH mandate is successfully registered. EMIs will be auto-debited on the 5th of each month.
              </Text>

              <View style={styles.mandateSummary}>
                {[
                  { label: 'Bank',         value: bankName || 'SBI Bank' },
                  { label: 'Account',      value: `XXXX XXXX ${accountNumber.slice(-4)}` },
                  { label: 'Debit Date',   value: '5th of every month' },
                  { label: 'Mandate Ref',  value: `NACH${Date.now().toString().slice(-8)}` },
                  { label: 'Status',       value: 'Active' },
                ].map((item, i, arr) => (
                  <View key={item.label}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>{item.label}</Text>
                      <Text style={[styles.summaryVal, item.label === 'Status' && { color: Colors.success }]}>
                        {item.value}
                      </Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.summaryDivider} />}
                  </View>
                ))}
              </View>

              <Button
                title="Go to My Loans"
                onPress={() => router.replace('/(main)/(tabs)/home')}
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

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  mandateInfo: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  mandateInfoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mandateInfoTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  mandateBullet: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  mandateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  mandateBulletText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bankCard: {
    width: '30%',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  bankCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  bankInitial: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankInitialText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
  },
  bankLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  field: { gap: Spacing.xs },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: scale(48),
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputFlex: { flex: 1 },
  inputRow: {
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
  inputHint: {
    ...Typography.tiny,
    color: Colors.textDisabled,
  },
  errorText: {
    ...Typography.tiny,
    color: Colors.error,
  },

  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.primary },

  mandateSummary: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  mandateSummaryTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryKey: { ...Typography.body, color: Colors.textSecondary },
  summaryVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  summaryDivider: { height: 1, backgroundColor: Colors.border },

  agreeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  confirmingSection: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xl,
  },
  confirmingIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  confirmingSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    paddingLeft: Spacing.xl,
  },
  confirmingStepText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textDisabled,
  },

  successSection: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  successCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    textAlign: 'center',
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

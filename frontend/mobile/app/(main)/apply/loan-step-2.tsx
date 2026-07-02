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
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';

type EmploymentType = 'salaried' | 'self_employed' | 'business';

const EMPLOYMENT_OPTIONS: { key: EmploymentType; label: string }[] = [
  { key: 'salaried', label: 'Salaried' },
  { key: 'self_employed', label: 'Self-Employed' },
  { key: 'business', label: 'Business Owner' },
];

const STATES = [
  'Andhra Pradesh', 'Karnataka', 'Kerala', 'Maharashtra',
  'Tamil Nadu', 'Telangana', 'Gujarat', 'Rajasthan',
  'Uttar Pradesh', 'West Bengal', 'Delhi', 'Other',
];

export default function LoanStep2Screen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [flatNo, setFlatNo] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [employment, setEmployment] = useState<EmploymentType>('salaried');
  const [company, setCompany] = useState('');
  const [income, setIncome] = useState('');

  const canContinue =
    flatNo.trim().length > 0 &&
    street.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    pincode.length === 6 &&
    company.trim().length > 0 &&
    income.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Loan Application" showBack />

      <View style={styles.stepBar}>
        <View style={[styles.stepDot, styles.stepDone]} />
        <View style={[styles.stepLine, styles.stepLineDone]} />
        <View style={[styles.stepDot, styles.stepActive]} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
      </View>
      <Text style={styles.stepLabel}>Step 2 of 3 — Address &amp; Employment</Text>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Residential Address</Text>

          <View style={styles.field}>
            <Text style={styles.label}>FLAT / HOUSE NO.</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 4B, Tower 2"
              placeholderTextColor={Colors.textDisabled}
              value={flatNo}
              onChangeText={setFlatNo}
              accessibilityLabel="Flat or house number"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>STREET / AREA / LANDMARK</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. MG Road, near Metro Station"
              placeholderTextColor={Colors.textDisabled}
              value={street}
              onChangeText={setStreet}
              accessibilityLabel="Street or area"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>CITY</Text>
              <TextInput
                style={styles.input}
                placeholder="Bangalore"
                placeholderTextColor={Colors.textDisabled}
                value={city}
                onChangeText={setCity}
                accessibilityLabel="City"
              />
            </View>
            <View style={styles.rowGap} />
            <View style={[styles.field, { width: scale(110) }]}>
              <Text style={styles.label}>PINCODE</Text>
              <TextInput
                style={styles.input}
                placeholder="560001"
                placeholderTextColor={Colors.textDisabled}
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="Pincode"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>STATE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Karnataka"
              placeholderTextColor={Colors.textDisabled}
              value={state}
              onChangeText={setState}
              accessibilityLabel="State"
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Employment Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMPLOYMENT TYPE</Text>
            <View style={styles.chipRow}>
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.chip, employment === opt.key && styles.chipActive]}
                  onPress={() => setEmployment(opt.key)}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: employment === opt.key }}
                >
                  <Text style={[styles.chipText, employment === opt.key && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {employment === 'salaried' ? 'EMPLOYER NAME' : 'BUSINESS / FIRM NAME'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={employment === 'salaried' ? 'e.g. Infosys Ltd.' : 'e.g. Mehta Traders'}
              placeholderTextColor={Colors.textDisabled}
              value={company}
              onChangeText={setCompany}
              accessibilityLabel="Company or business name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MONTHLY INCOME (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 75000"
              placeholderTextColor={Colors.textDisabled}
              value={income}
              onChangeText={(t) => setIncome(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              accessibilityLabel="Monthly income in rupees"
            />
            {income.length > 0 && (
              <Text style={styles.inputHint}>
                ₹{Number(income).toLocaleString('en-IN')} per month
              </Text>
            )}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your address and income details help us determine the right loan product and amount for you.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Submit Application"
            onPress={() => router.replace({
              pathname: '/(main)/apply/cdl-kyc-verification',
              params: { ...params, monthlyIncome: income, employmentType: employment },
            })}
            disabled={!canContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },

  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  stepDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: Colors.border,
  },
  stepDone: { backgroundColor: Colors.success },
  stepActive: { backgroundColor: Colors.primary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  stepLineDone: { backgroundColor: Colors.success },
  stepLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  field: { marginBottom: Spacing.sm },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
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
  inputHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  row: { flexDirection: 'row' },
  rowGap: { width: Spacing.sm },

  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: Spacing.md,
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

  infoBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.primary,
    lineHeight: 18,
  },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';

type Relationship = 'spouse' | 'parent' | 'sibling' | 'child';
type Occupation = 'salaried' | 'self_employed' | 'business';

const RELATIONSHIPS: { key: Relationship; label: string }[] = [
  { key: 'spouse',  label: 'Spouse' },
  { key: 'parent',  label: 'Parent' },
  { key: 'sibling', label: 'Sibling' },
  { key: 'child',   label: 'Adult Child' },
];

const OCCUPATIONS: { key: Occupation; label: string; icon: string }[] = [
  { key: 'salaried',      label: 'Salaried',      icon: 'briefcase-outline' },
  { key: 'self_employed', label: 'Self-Employed', icon: 'person-outline' },
  { key: 'business',      label: 'Business',      icon: 'storefront-outline' },
];

export default function HousingCoApplicantScreen() {
  const params = useLocalSearchParams();

  const [relationship, setRelationship] = useState<Relationship>('spouse');
  const [fullName, setFullName] = useState('');
  const [pan, setPan] = useState('');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [occupation, setOccupation] = useState<Occupation>('salaried');
  const [monthlyIncome, setMonthlyIncome] = useState('');

  const isValidPAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  const isValidMobile = /^[6-9]\d{9}$/.test(mobile);
  const isValidDOB = /^\d{2}\/\d{2}\/\d{4}$/.test(dob);

  const canContinue =
    fullName.trim().length >= 3 &&
    isValidPAN &&
    isValidMobile &&
    isValidDOB &&
    Number(monthlyIncome) > 0;

  const handleContinue = () => {
    router.push({
      pathname: '/(main)/apply/housing-income',
      params: {
        ...params,
        coAppName: fullName,
        coAppPan: pan,
        coAppDob: dob,
        coAppMobile: mobile,
        coAppRelation: relationship,
        coAppOccupation: occupation,
        coAppIncome: monthlyIncome,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Co-Applicant Details" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 3 OF 5 · CO-APPLICANT</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="people" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Adding a co-applicant combines incomes for higher eligibility. Both applicants will need to
              complete KYC and eSign the agreement.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>RELATIONSHIP TO YOU</Text>
            <View style={styles.chipRow}>
              {RELATIONSHIPS.map((r) => (
                <Pressable
                  key={r.key}
                  style={[styles.chip, relationship === r.key && styles.chipActive]}
                  onPress={() => setRelationship(r.key)}
                  accessibilityRole="radio"
                  accessibilityLabel={r.label}
                  accessibilityState={{ selected: relationship === r.key }}
                >
                  <Text style={[styles.chipText, relationship === r.key && styles.chipTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>FULL NAME (AS ON PAN)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Priya Sharma"
              placeholderTextColor={Colors.textDisabled}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              accessibilityLabel="Co-applicant full name"
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>PAN</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="ABCDE1234F"
                  placeholderTextColor={Colors.textDisabled}
                  value={pan}
                  onChangeText={(t) => setPan(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  autoCapitalize="characters"
                  maxLength={10}
                  accessibilityLabel="Co-applicant PAN"
                />
                {pan.length === 10 && (
                  <Ionicons
                    name={isValidPAN ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={isValidPAN ? Colors.success : Colors.error}
                  />
                )}
              </View>
            </View>

            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>DATE OF BIRTH</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={Colors.textDisabled}
                value={dob}
                onChangeText={(t) => {
                  const clean = t.replace(/\D/g, '').slice(0, 8);
                  let formatted = clean;
                  if (clean.length > 4) formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
                  else if (clean.length > 2) formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
                  setDob(formatted);
                }}
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel="Co-applicant date of birth"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={[styles.input, styles.inputFlex, styles.inputBorderless]}
                placeholder="10-digit mobile"
                placeholderTextColor={Colors.textDisabled}
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                accessibilityLabel="Co-applicant mobile"
              />
              {mobile.length === 10 && (
                <Ionicons
                  name={isValidMobile ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={isValidMobile ? Colors.success : Colors.error}
                />
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>OCCUPATION</Text>
            <View style={styles.occupationRow}>
              {OCCUPATIONS.map((o) => (
                <Pressable
                  key={o.key}
                  style={[styles.occupationCard, occupation === o.key && styles.occupationCardActive]}
                  onPress={() => setOccupation(o.key)}
                  accessibilityRole="radio"
                  accessibilityLabel={o.label}
                  accessibilityState={{ selected: occupation === o.key }}
                >
                  <Ionicons
                    name={o.icon as any}
                    size={20}
                    color={occupation === o.key ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.occupationText, occupation === o.key && styles.occupationTextActive]}>
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MONTHLY INCOME (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 60000"
              placeholderTextColor={Colors.textDisabled}
              value={monthlyIncome}
              onChangeText={(t) => setMonthlyIncome(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              accessibilityLabel="Co-applicant monthly income"
            />
            <Text style={styles.hint}>This will be combined with your income for the FOIR calculation.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Continue" onPress={handleContinue} disabled={!canContinue} />
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

  infoCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },

  field: { gap: Spacing.xs },
  fieldRow: { flexDirection: 'row', gap: Spacing.sm },
  fieldHalf: { flex: 1 },
  label: { ...Typography.label, color: Colors.textSecondary },
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
  inputBorderless: { borderWidth: 0, paddingHorizontal: 0 },
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
  prefix: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  hint: { ...Typography.tiny, color: Colors.textDisabled },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
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
  chipTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold },

  occupationRow: { flexDirection: 'row', gap: Spacing.sm },
  occupationCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  occupationCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  occupationText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  occupationTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

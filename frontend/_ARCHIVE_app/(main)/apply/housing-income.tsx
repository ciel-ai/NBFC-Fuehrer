import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
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
import { formatCurrency } from '@/src/core/utils/formatters';

type EmploymentType = 'salaried' | 'self_employed' | 'business';

interface DocSlot {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  required: boolean;
}

const SALARIED_DOCS: DocSlot[] = [
  { key: 'salary_slips',     label: 'Last 3 Salary Slips',  subtitle: 'PDF or image · max 5 MB',     icon: 'receipt-outline',     required: true },
  { key: 'form16',           label: 'Form 16',              subtitle: 'Last FY',                       icon: 'document-text-outline', required: true },
  { key: 'bank_statements',  label: 'Bank Statements',      subtitle: '6 months · salary account',     icon: 'document-outline',    required: true },
];

const SELF_EMP_DOCS: DocSlot[] = [
  { key: 'itr',              label: 'ITR (2 Years)',        subtitle: 'Income Tax Returns · PDF',      icon: 'document-text-outline', required: true },
  { key: 'gstin',             label: 'GSTIN Certificate',    subtitle: 'If applicable',                 icon: 'business-outline',    required: false },
  { key: 'bank_statements',  label: 'Bank Statements',      subtitle: '12 months · primary account',   icon: 'document-outline',    required: true },
];

// ─── UploadField — CDL-style, identical to gold-loan-kyc.tsx ─────────────────

function UploadField({
  label,
  subtitle,
  required,
  uploaded,
  onPress,
}: {
  label: string;
  subtitle?: string;
  required?: boolean;
  uploaded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[uf.card, uploaded && uf.cardUploaded]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${label}${required ? ', required' : ''}. ${uploaded ? 'Uploaded' : 'Tap to upload or capture'}`}
    >
      <View style={[uf.iconBox, uploaded && uf.iconBoxUploaded]}>
        <Ionicons
          name={uploaded ? 'checkmark-circle' : 'cloud-upload'}
          size={22}
          color={uploaded ? Colors.success : Colors.primary}
        />
      </View>
      <View style={uf.info}>
        <Text style={uf.label}>
          {label}
          {required && <Text style={uf.star}> *</Text>}
        </Text>
        {subtitle ? <Text style={uf.subtitle}>{subtitle}</Text> : null}
        <Text style={[uf.status, uploaded && uf.statusDone]}>
          {uploaded ? 'Uploaded ✓' : 'Tap to upload or capture'}
        </Text>
      </View>
      <View style={uf.actions}>
        <Pressable
          style={uf.actionBtn}
          onPress={onPress}
          android_ripple={{ color: `${Colors.primary}20`, borderless: true }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Open camera"
        >
          <Ionicons name="camera" size={16} color={Colors.primary} />
        </Pressable>
        <Pressable
          style={uf.actionBtn}
          onPress={onPress}
          android_ripple={{ color: `${Colors.primary}20`, borderless: true }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Attach file"
        >
          <Ionicons name="attach" size={16} color={Colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const uf = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background,
    gap: Spacing.md,
    ...Shadow.small,
  },
  cardUploaded: { borderColor: Colors.success, backgroundColor: Colors.successLight },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUploaded: { backgroundColor: Colors.successLight },
  info: { flex: 1 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  star: { color: Colors.error },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled, marginBottom: 2 },
  status: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled },
  statusDone: { color: Colors.success },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function HousingIncomeScreen() {
  const params = useLocalSearchParams<{
    coAppName?: string;
    coAppIncome?: string;
    hasCoApplicant?: string;
  }>();

  const [employmentType, setEmploymentType] = useState<EmploymentType>('salaried');
  const [monthlyIncome, setMonthlyIncome] = useState('80000');
  const [employerName, setEmployerName] = useState('');
  const [yearsAtJob, setYearsAtJob] = useState('');
  const [gstin, setGstin] = useState('');
  const [docs, setDocs] = useState<Record<string, boolean>>({});

  const docSlots = employmentType === 'salaried' ? SALARIED_DOCS : SELF_EMP_DOCS;
  const requiredKeys = docSlots.filter((d) => d.required).map((d) => d.key);
  const allRequiredUploaded = requiredKeys.every((k) => !!docs[k]);

  const incomeNum = Number(monthlyIncome) || 0;
  const coAppIncomeNum = Number(params.coAppIncome) || 0;
  const combinedIncome = incomeNum + coAppIncomeNum;

  const canContinue =
    incomeNum > 0 &&
    employerName.trim().length > 1 &&
    Number(yearsAtJob) > 0 &&
    allRequiredUploaded;

  const pickDoc = (key: string) => {
    Alert.alert('Upload Document', 'Choose method', [
      { text: 'Camera',  onPress: () => setDocs((p) => ({ ...p, [key]: true })) },
      { text: 'Gallery', onPress: () => setDocs((p) => ({ ...p, [key]: true })) },
      { text: 'Cancel',  style: 'cancel' },
    ]);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(main)/apply/housing-kyc',
      params: {
        ...params,
        employmentType,
        monthlyIncome,
        employerName,
        yearsAtJob,
        gstin,
        combinedIncome: String(combinedIncome),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Income Verification" showBack />

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
            <Text style={styles.stepBadgeText}>STEP 4 OF 5 · INCOME</Text>
          </View>

          <Text style={styles.sectionTitle}>Employment Type</Text>
          <View style={styles.empRow}>
            {(['salaried', 'self_employed', 'business'] as EmploymentType[]).map((e) => (
              <Pressable
                key={e}
                style={[styles.empChip, employmentType === e && styles.empChipActive]}
                onPress={() => {
                  setEmploymentType(e);
                  setDocs({});
                }}
                accessibilityRole="radio"
                accessibilityLabel={e}
                accessibilityState={{ selected: employmentType === e }}
              >
                <Text style={[styles.empText, employmentType === e && styles.empTextActive]}>
                  {e === 'salaried' ? 'Salaried' : e === 'self_employed' ? 'Self-Employed' : 'Business'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>MONTHLY INCOME (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 80000"
              placeholderTextColor={Colors.textDisabled}
              value={monthlyIncome}
              onChangeText={(t) => setMonthlyIncome(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              accessibilityLabel="Your monthly income"
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>
                {employmentType === 'salaried' ? 'EMPLOYER NAME' : 'BUSINESS NAME'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={employmentType === 'salaried' ? 'e.g. TCS' : 'e.g. Sharma Traders'}
                placeholderTextColor={Colors.textDisabled}
                value={employerName}
                onChangeText={setEmployerName}
                accessibilityLabel="Employer or business name"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>
                {employmentType === 'salaried' ? 'YEARS AT JOB' : 'BUSINESS VINTAGE (YRS)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3"
                placeholderTextColor={Colors.textDisabled}
                value={yearsAtJob}
                onChangeText={(t) => setYearsAtJob(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Years at job"
              />
            </View>
          </View>

          {employmentType !== 'salaried' && (
            <View style={styles.field}>
              <Text style={styles.label}>GSTIN (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 29ABCDE1234F1Z5"
                placeholderTextColor={Colors.textDisabled}
                value={gstin}
                onChangeText={(t) => setGstin(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
                autoCapitalize="characters"
                maxLength={15}
                accessibilityLabel="GSTIN"
              />
              <Text style={styles.hint}>GSTIN verification via Perfios will strengthen your application.</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Income Documents</Text>
          <Text style={styles.sectionSubtitle}>
            Bank statements will be analysed via Perfios. Salary / ITR docs are reviewed by our team.
          </Text>

          {docSlots.map((doc) => (
            <UploadField
              key={doc.key}
              label={doc.label}
              subtitle={doc.subtitle}
              required={doc.required}
              uploaded={!!docs[doc.key]}
              onPress={() => pickDoc(doc.key)}
            />
          ))}

          {params.hasCoApplicant === '1' && coAppIncomeNum > 0 && (
            <View style={styles.combinedCard}>
              <Text style={styles.combinedTitle}>Combined Income for FOIR</Text>
              <View style={styles.combinedRow}>
                <Text style={styles.combinedKey}>Your income</Text>
                <Text style={styles.combinedVal}>{formatCurrency(incomeNum)}</Text>
              </View>
              <View style={styles.combinedRow}>
                <Text style={styles.combinedKey}>{params.coAppName ?? 'Co-applicant'} income</Text>
                <Text style={styles.combinedVal}>{formatCurrency(coAppIncomeNum)}</Text>
              </View>
              <View style={styles.combinedDivider} />
              <View style={styles.combinedRow}>
                <Text style={styles.combinedKeyBold}>Combined monthly</Text>
                <Text style={styles.combinedValBold}>{formatCurrency(combinedIncome)}</Text>
              </View>
            </View>
          )}
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

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
    lineHeight: 18,
  },

  empRow: { flexDirection: 'row', gap: Spacing.xs },
  empChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  empChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  empText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  empTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold },

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
  hint: { ...Typography.tiny, color: Colors.textDisabled },

  combinedCard: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  combinedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  combinedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  combinedKey: { ...Typography.caption, color: Colors.textSecondary },
  combinedVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  combinedKeyBold: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  combinedValBold: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.success,
  },
  combinedDivider: { height: 1, backgroundColor: Colors.success, opacity: 0.3, marginVertical: Spacing.xs },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { usePersistApplyStepFromParams } from '@/src/features/apply/useApplyDraft';

// ---------------------------------------------------------------------------
// Shared CAM capture step — the customer-facing Credit Approval Memo fields:
// Customer Information (extras), Address, Employment, Co-Applicant, Nominee.
// Sits between the personal-details KYC screen and PAN verification in BOTH
// the customer gold and CDL journeys; forwards everything via params, then
// on to `nextPath` (defaults to pan-verify).
// ---------------------------------------------------------------------------

const MARITAL_STATUS = ['Single', 'Married', 'Widowed', 'Divorced'] as const;
const CUSTOMER_TYPES = ['Salaried', 'Self-Employed', 'Business Owner', 'Professional', 'Agriculturist'] as const;
const RESIDENCE_TYPES = ['Owned', 'Rented', 'Family Owned', 'Company Provided'] as const;
const COMPANY_TYPES = ['Private Ltd', 'Government', 'PSU', 'Proprietorship', 'Partnership', 'Other'] as const;
const RELATIONSHIPS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'] as const;

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
  maxLength,
  half,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  error?: string;
  maxLength?: number;
  half?: boolean;
}) {
  return (
    <View style={[fi.wrapper, half && fi.half]}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={[fi.input, !!error && fi.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        accessibilityLabel={label.replace(/\s*\*\s*$/, '')}
      />
      {!!error && <Text style={fi.error}>{error}</Text>}
    </View>
  );
}

function ChipSelect<T extends string>({
  label,
  options,
  value,
  onSelect,
  error,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onSelect: (v: T) => void;
  error?: string;
}) {
  return (
    <View style={fi.wrapper}>
      <Text style={fi.label}>{label}</Text>
      <View style={cs.row}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              style={[cs.chip, active && cs.chipActive]}
              onPress={() => onSelect(opt)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt}
            >
              <Text style={[cs.chipText, active && cs.chipTextActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!error && <Text style={fi.error}>{error}</Text>}
    </View>
  );
}

export default function AddressEmploymentScreen() {
  // Saves a resumable draft for whichever flow threaded `applyFlow`.
  // No-ops for flows that do not set it, so the gold path is unchanged.
  usePersistApplyStepFromParams();
  const params = useLocalSearchParams<Record<string, string>>();
  const nextPath = typeof params.camNextPath === 'string' && params.camNextPath ? params.camNextPath : 'pan-verify';

  // Customer Information (CAM extras)
  const [fatherName, setFatherName] = useState('');
  const [motherMaidenName, setMotherMaidenName] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<(typeof MARITAL_STATUS)[number] | null>(null);
  const [customerType, setCustomerType] = useState<(typeof CUSTOMER_TYPES)[number] | null>(null);
  const [hasExistingLoan, setHasExistingLoan] = useState(false);
  const [existingLender, setExistingLender] = useState('');
  const [existingOutstanding, setExistingOutstanding] = useState('');

  // Present address
  const [line1, setLine1] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pin, setPin] = useState('');
  const [yearsAtAddress, setYearsAtAddress] = useState('');
  const [residenceType, setResidenceType] = useState<(typeof RESIDENCE_TYPES)[number] | null>(null);

  // Permanent address
  const [permSame, setPermSame] = useState(true);
  const [permLine1, setPermLine1] = useState('');
  const [permCity, setPermCity] = useState('');
  const [permState, setPermState] = useState('');
  const [permPin, setPermPin] = useState('');

  // Employment
  const [companyType, setCompanyType] = useState<(typeof COMPANY_TYPES)[number] | null>(null);
  const [industry, setIndustry] = useState('');
  const [employer, setEmployer] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [yearsInJob, setYearsInJob] = useState('');

  // Co-applicant (optional)
  const [hasCoApplicant, setHasCoApplicant] = useState(false);
  const [coName, setCoName] = useState('');
  const [coRelation, setCoRelation] = useState<(typeof RELATIONSHIPS)[number] | null>(null);
  const [coMobile, setCoMobile] = useState('');
  const [coPan, setCoPan] = useState('');

  // Nominee
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState<(typeof RELATIONSHIPS)[number] | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const clear = (key: string) => {
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    // Customer info
    if (fatherName.trim().length < 2) e.fatherName = "Father's name is required";
    if (motherMaidenName.trim().length < 2) e.motherMaidenName = "Mother's maiden name is required";
    if (!maritalStatus) e.maritalStatus = 'Select marital status';
    if (!customerType) e.customerType = 'Select customer type';
    if (hasExistingLoan && existingLender.trim().length < 2) e.existingLender = 'Lender name required';
    // Address
    if (line1.trim().length < 5) e.line1 = 'Enter your full address';
    if (city.trim().length < 2) e.city = 'City is required';
    if (stateName.trim().length < 2) e.state = 'State is required';
    if (!/^\d{6}$/.test(pin)) e.pin = 'PIN code must be 6 digits';
    if (!yearsAtAddress) e.yearsAtAddress = 'Required';
    if (!residenceType) e.residenceType = 'Select residential status';
    if (!permSame) {
      if (permLine1.trim().length < 5) e.permLine1 = 'Enter the permanent address';
      if (permCity.trim().length < 2) e.permCity = 'City is required';
      if (permState.trim().length < 2) e.permState = 'State is required';
      if (!/^\d{6}$/.test(permPin)) e.permPin = 'PIN code must be 6 digits';
    }
    // Employment
    if (!companyType) e.companyType = 'Select company type';
    if (industry.trim().length < 2) e.industry = 'Industry is required';
    if (employer.trim().length < 2) e.employer = 'Required';
    if (!monthlyIncome || Number(monthlyIncome) <= 0) e.monthlyIncome = 'Enter your monthly income';
    if (yearsInJob === '') e.yearsInJob = 'Required';
    // Co-applicant (only if present)
    if (hasCoApplicant) {
      if (coName.trim().length < 2) e.coName = 'Co-applicant name required';
      if (!coRelation) e.coRelation = 'Select relationship';
      if (!/^[6-9]\d{9}$/.test(coMobile)) e.coMobile = 'Enter a valid 10-digit mobile';
      if (coPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(coPan)) e.coPan = 'Invalid PAN';
    }
    // Nominee
    if (nomineeName.trim().length < 2) e.nomineeName = 'Nominee name is required';
    if (!nomineeRelation) e.nomineeRelation = 'Select nominee relationship';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    router.push({
      pathname: `/(main)/apply/${nextPath}` as never,
      params: {
        ...params,
        // Customer Information
        fatherName: fatherName.trim(),
        motherMaidenName: motherMaidenName.trim(),
        maritalStatus: maritalStatus ?? '',
        customerType: customerType ?? '',
        hasExistingLoan: hasExistingLoan ? 'yes' : 'no',
        existingLender: hasExistingLoan ? existingLender.trim() : '',
        existingOutstanding: hasExistingLoan ? existingOutstanding : '',
        // Address
        addrLine1: line1.trim(),
        addrLandmark: landmark.trim(),
        addrCity: city.trim(),
        addrState: stateName.trim(),
        addrPin: pin,
        addrYears: yearsAtAddress,
        residenceType: residenceType ?? '',
        permSame: permSame ? 'yes' : 'no',
        permLine1: permSame ? line1.trim() : permLine1.trim(),
        permCity: permSame ? city.trim() : permCity.trim(),
        permState: permSame ? stateName.trim() : permState.trim(),
        permPin: permSame ? pin : permPin,
        // Employment
        customerCategory: customerType ?? '',
        companyType: companyType ?? '',
        industry: industry.trim(),
        employer: employer.trim(),
        monthlyIncome,
        yearsInJob,
        // Co-applicant
        hasCoApplicant: hasCoApplicant ? 'yes' : 'no',
        coName: hasCoApplicant ? coName.trim() : '',
        coRelation: hasCoApplicant ? coRelation ?? '' : '',
        coMobile: hasCoApplicant ? coMobile : '',
        coPan: hasCoApplicant ? coPan.trim() : '',
        // Nominee
        nomineeName: nomineeName.trim(),
        nomineeRelation: nomineeRelation ?? '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Applicant Details" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* ── Customer Information ── */}
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <InputField
            label="Father's Name *"
            value={fatherName}
            onChangeText={(t) => { setFatherName(t); clear('fatherName'); }}
            placeholder="As per records"
            error={errors.fatherName}
          />
          <InputField
            label="Mother's Maiden Name *"
            value={motherMaidenName}
            onChangeText={(t) => { setMotherMaidenName(t); clear('motherMaidenName'); }}
            placeholder="Mother's name before marriage"
            error={errors.motherMaidenName}
          />
          <ChipSelect
            label="Marital Status *"
            options={MARITAL_STATUS}
            value={maritalStatus}
            onSelect={(v) => { setMaritalStatus(v); clear('maritalStatus'); }}
            error={errors.maritalStatus}
          />
          <ChipSelect
            label="Customer Type *"
            options={CUSTOMER_TYPES}
            value={customerType}
            onSelect={(v) => { setCustomerType(v); clear('customerType'); }}
            error={errors.customerType}
          />
          <View style={styles.toggleCard}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>I have an existing loan</Text>
              <Text style={styles.toggleDesc}>Any active loan with another lender</Text>
            </View>
            <Switch
              value={hasExistingLoan}
              onValueChange={setHasExistingLoan}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.textWhite}
            />
          </View>
          {hasExistingLoan && (
            <View style={styles.row2}>
              <InputField
                label="Lender *"
                value={existingLender}
                onChangeText={(t) => { setExistingLender(t); clear('existingLender'); }}
                placeholder="Bank / NBFC"
                error={errors.existingLender}
                half
              />
              <InputField
                label="Outstanding (₹)"
                value={existingOutstanding}
                onChangeText={(t) => setExistingOutstanding(t.replace(/\D/g, ''))}
                placeholder="Approx"
                keyboardType="number-pad"
                half
              />
            </View>
          )}

          {/* ── Present Address ── */}
          <Text style={styles.sectionTitle}>Present Address</Text>
          <InputField
            label="Address (house / street / area) *"
            value={line1}
            onChangeText={(t) => { setLine1(t); clear('line1'); }}
            placeholder="Flat 4B, MG Road"
            error={errors.line1}
          />
          <InputField
            label="Landmark"
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Near City Mall (optional)"
          />
          <View style={styles.row2}>
            <InputField label="City *" value={city} onChangeText={(t) => { setCity(t); clear('city'); }} placeholder="Bengaluru" error={errors.city} half />
            <InputField label="State *" value={stateName} onChangeText={(t) => { setStateName(t); clear('state'); }} placeholder="Karnataka" error={errors.state} half />
          </View>
          <View style={styles.row2}>
            <InputField label="PIN Code *" value={pin} onChangeText={(t) => { setPin(t.replace(/\D/g, '').slice(0, 6)); clear('pin'); }} placeholder="560001" keyboardType="number-pad" maxLength={6} error={errors.pin} half />
            <InputField label="Years at address *" value={yearsAtAddress} onChangeText={(t) => { setYearsAtAddress(t.replace(/\D/g, '').slice(0, 2)); clear('yearsAtAddress'); }} placeholder="4" keyboardType="number-pad" error={errors.yearsAtAddress} half />
          </View>
          <ChipSelect
            label="Residential Status *"
            options={RESIDENCE_TYPES}
            value={residenceType}
            onSelect={(v) => { setResidenceType(v); clear('residenceType'); }}
            error={errors.residenceType}
          />

          <View style={styles.toggleCard}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Permanent address is the same</Text>
              <Text style={styles.toggleDesc}>Turn off to enter a different permanent address</Text>
            </View>
            <Switch value={permSame} onValueChange={setPermSame} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.textWhite} />
          </View>
          {!permSame && (
            <>
              <Text style={styles.sectionTitle}>Permanent Address</Text>
              <InputField label="Address *" value={permLine1} onChangeText={(t) => { setPermLine1(t); clear('permLine1'); }} placeholder="Village / house / street" error={errors.permLine1} />
              <View style={styles.row2}>
                <InputField label="City *" value={permCity} onChangeText={(t) => { setPermCity(t); clear('permCity'); }} placeholder="City" error={errors.permCity} half />
                <InputField label="State *" value={permState} onChangeText={(t) => { setPermState(t); clear('permState'); }} placeholder="State" error={errors.permState} half />
              </View>
              <InputField label="PIN Code *" value={permPin} onChangeText={(t) => { setPermPin(t.replace(/\D/g, '').slice(0, 6)); clear('permPin'); }} placeholder="6-digit PIN" keyboardType="number-pad" maxLength={6} error={errors.permPin} />
            </>
          )}

          {/* ── Employment & Income ── */}
          <Text style={styles.sectionTitle}>Employment & Income</Text>
          <ChipSelect
            label="Company Type *"
            options={COMPANY_TYPES}
            value={companyType}
            onSelect={(v) => { setCompanyType(v); clear('companyType'); }}
            error={errors.companyType}
          />
          <InputField label="Industry *" value={industry} onChangeText={(t) => { setIndustry(t); clear('industry'); }} placeholder="e.g. Retail, IT, Manufacturing" error={errors.industry} />
          <InputField label="Employer / business name *" value={employer} onChangeText={(t) => { setEmployer(t); clear('employer'); }} placeholder="Company or business name" error={errors.employer} />
          <View style={styles.row2}>
            <InputField label="Monthly income (₹) *" value={monthlyIncome} onChangeText={(t) => { setMonthlyIncome(t.replace(/\D/g, '')); clear('monthlyIncome'); }} placeholder="45000" keyboardType="number-pad" error={errors.monthlyIncome} half />
            <InputField label="Years in job / business *" value={yearsInJob} onChangeText={(t) => { setYearsInJob(t.replace(/\D/g, '').slice(0, 2)); clear('yearsInJob'); }} placeholder="3" keyboardType="number-pad" error={errors.yearsInJob} half />
          </View>

          {/* ── Co-Applicant (optional) ── */}
          <Text style={styles.sectionTitle}>Co-Applicant</Text>
          <View style={styles.toggleCard}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Add a co-applicant</Text>
              <Text style={styles.toggleDesc}>Optional — a co-borrower on this loan</Text>
            </View>
            <Switch value={hasCoApplicant} onValueChange={setHasCoApplicant} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.textWhite} />
          </View>
          {hasCoApplicant && (
            <>
              <InputField label="Co-Applicant Name *" value={coName} onChangeText={(t) => { setCoName(t); clear('coName'); }} placeholder="Full name" error={errors.coName} />
              <ChipSelect label="Relationship *" options={RELATIONSHIPS} value={coRelation} onSelect={(v) => { setCoRelation(v); clear('coRelation'); }} error={errors.coRelation} />
              <View style={styles.row2}>
                <InputField label="Mobile *" value={coMobile} onChangeText={(t) => { setCoMobile(t.replace(/\D/g, '').slice(0, 10)); clear('coMobile'); }} placeholder="10-digit" keyboardType="number-pad" maxLength={10} error={errors.coMobile} half />
                <InputField label="PAN" value={coPan} onChangeText={(t) => { setCoPan(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)); clear('coPan'); }} placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} error={errors.coPan} half />
              </View>
            </>
          )}

          {/* ── Nominee ── */}
          <Text style={styles.sectionTitle}>Nominee</Text>
          <InputField label="Nominee Name *" value={nomineeName} onChangeText={(t) => { setNomineeName(t); clear('nomineeName'); }} placeholder="Full name" error={errors.nomineeName} />
          <ChipSelect label="Nominee Relationship *" options={RELATIONSHIPS} value={nomineeRelation} onSelect={(v) => { setNomineeRelation(v); clear('nomineeRelation'); }} error={errors.nomineeRelation} />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>
              These details form your Credit Approval Memo (CAM) and are included in your application summary.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button title="Continue to PAN Verification" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.xl, paddingBottom: Spacing.lg },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  row2: { flexDirection: 'row', gap: Spacing.md },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary },
  toggleDesc: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, flex: 1, color: Colors.primary, lineHeight: 18 },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

const fi = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  half: { flex: 1 },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: 52,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputError: { borderColor: Colors.error },
  error: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.error, marginTop: 4 },
});

const cs = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
});

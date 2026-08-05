import React, { useState } from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { NAME_REGEX } from '@/src/core/utils/validators';

type Gender = 'male' | 'female' | 'other';

function formatDOBInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function validateDOB(dob: string): string | null {
  if (!dob) return 'Date of birth is required';
  const match = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return 'Enter date in DD/MM/YYYY format';
  const [, dd, mm, yyyy] = match;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (month < 1 || month > 12) return 'Invalid month — must be 01–12';
  if (day < 1 || day > 31) return 'Invalid day — must be 01–31';
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return 'Invalid date (e.g. Feb 30 does not exist)';
  if (year < 1900) return 'Year seems too old — please check';
  const today = new Date();
  const age =
    today.getFullYear() -
    year -
    (today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day)
      ? 1
      : 0);
  if (age < 18) return 'You must be at least 18 years old';
  if (age > 100) return 'Date of birth seems incorrect';
  return null;
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Full name is required';
  if (trimmed.length < 3) return 'Name must be at least 3 characters';
  if (!NAME_REGEX.test(trimmed)) return 'Name should only contain letters';
  return null;
}

function validatePhone(phone: string): string | null {
  if (!phone) return 'Mobile number is required';
  if (phone.length !== 10) return 'Enter a valid 10-digit mobile number';
  if (!/^[6-9]/.test(phone)) return 'Number must start with 6, 7, 8, or 9';
  return null;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return 'Enter a valid email address';
  return null;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  maxLength,
  accessibilityHint,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  error?: string;
  maxLength?: number;
  accessibilityHint?: string;
}) {
  const cleanLabel = label.replace(/\s*\*\s*$/, '').trim();
  return (
    <View style={fi.wrapper}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={[fi.input, !!error && fi.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        keyboardType={keyboardType}
        autoCorrect={false}
        maxLength={maxLength}
        accessibilityLabel={cleanLabel}
        accessibilityHint={accessibilityHint}
      />
      {!!error && <Text style={fi.error}>{error}</Text>}
    </View>
  );
}
const fi = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
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
  error: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.error,
    marginTop: 4,
  },
});

export default function KYCFormScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { productName, loanAmount, tenure, emi } = params;

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);

  const [nameError, setNameError] = useState('');
  const [dobError, setDobError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [genderError, setGenderError] = useState('');

  const handleDobChange = (text: string) => {
    setDob(formatDOBInput(text));
    if (dobError) setDobError('');
  };

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (phoneError) setPhoneError('');
  };

  const handleContinue = () => {
    const nameErr = validateName(fullName);
    const dobErr = validateDOB(dob);
    const phoneErr = validatePhone(phone);
    const emailErr = validateEmail(email);
    const genderErr = gender === null ? 'Please select your gender' : '';
    setNameError(nameErr ?? '');
    setDobError(dobErr ?? '');
    setPhoneError(phoneErr ?? '');
    setEmailError(emailErr ?? '');
    setGenderError(genderErr);
    if (nameErr || dobErr || phoneErr || emailErr || genderErr) return;

    router.push({
      pathname: '/(main)/apply/pan-verify',
      // Preserve everything carried in (interestRate, processingFee,
      // productValue, employmentType, …) and add the personal details.
      params: {
        ...params,
        fullName: fullName.trim(),
        dob,
        phone,
        email: email.trim(),
        gender: gender ?? '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Loan Application" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.summaryRow}>
            <Ionicons name="receipt" size={14} color={Colors.primary} />
            <Text style={styles.summaryText}>
              {productName} · ₹{parseInt(loanAmount ?? '0').toLocaleString('en-IN')} · {tenure}M · EMI ₹{parseInt(emi ?? '0').toLocaleString('en-IN')}/mo
            </Text>
          </View>

          <Text style={styles.stepTitle}>Personal Details</Text>
          <Text style={styles.stepSub}>
            Enter your information as per official documents. We&apos;ll verify your PAN and Aadhaar digitally in the next steps.
          </Text>

          <InputField
            label="Full Name *"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              if (nameError) setNameError('');
            }}
            placeholder="e.g. Rahul Sharma"
            error={nameError}
            accessibilityHint="Letters and spaces only, minimum 3 characters"
          />
          <InputField
            label="Date of Birth *"
            value={dob}
            onChangeText={handleDobChange}
            placeholder="DD/MM/YYYY"
            keyboardType="number-pad"
            maxLength={10}
            error={dobError}
            accessibilityHint="Enter date in DD slash MM slash YYYY format, digits only"
          />
          <InputField
            label="Mobile Number *"
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="10-digit number"
            keyboardType="phone-pad"
            maxLength={10}
            error={phoneError}
            accessibilityHint="Enter 10-digit Indian mobile number starting with 6, 7, 8, or 9"
          />
          <InputField
            label="Email Address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError('');
            }}
            placeholder="yourname@email.com"
            keyboardType="email-address"
            error={emailError}
            accessibilityHint="Enter a valid email address, optional field"
          />

          <Text style={genderS.label}>GENDER *</Text>
          <View style={genderS.row}>
            {(['male', 'female', 'other'] as Gender[]).map((g) => (
              <Pressable
                key={g}
                style={[genderS.option, gender === g && genderS.optionActive]}
                onPress={() => {
                  setGender(g);
                  setGenderError('');
                }}
                android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
                accessibilityRole="radio"
                accessibilityState={{ checked: gender === g }}
                accessibilityLabel={g.charAt(0).toUpperCase() + g.slice(1)}
              >
                <Ionicons
                  name={g === 'male' ? 'male' : g === 'female' ? 'female' : 'transgender'}
                  size={16}
                  color={gender === g ? Colors.textWhite : Colors.textSecondary}
                />
                <Text style={[genderS.optionText, gender === g && genderS.optionTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          {!!genderError && <Text style={fi.error}>{genderError}</Text>}

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.noteText}>
              Next: we&apos;ll verify your PAN, Aadhaar (via OTP), capture a selfie, then collect address &amp; employment.
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

const genderS = StyleSheet.create({
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  optionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.textSecondary },
  optionTextActive: { color: Colors.textWhite },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },

  content: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  summaryText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary,
    flex: 1,
  },

  stepTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    marginBottom: 4,
  },
  stepSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  noteText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 17,
  },

  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

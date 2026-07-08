import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { NAME_REGEX } from '@/src/core/utils/validators';

// ─── Types ───────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female' | 'other';

// ─── Validators — identical to CDL kyc-form.tsx ──────────────────────────────

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

// ─── InputField — identical to CDL kyc-form.tsx ──────────────────────────────

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

// ─── UploadField — same CDL-style component ───────────────────────────────────

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
        {subtitle ? (
          <Text style={uf.subtitle}>{subtitle}</Text>
        ) : null}
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
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textDisabled,
    marginBottom: 2,
  },
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GoldLoanKYCScreen() {
  const params = useLocalSearchParams<{
    loanAmount: string;
    tenure: string;
    repaymentType: string;
    goldType: string;
    karat: string;
    weight: string;
  }>();

  // ── Personal details state (same fields as CDL kyc-form.tsx) ──
  const [fullName, setFullName]   = useState('');
  const [dob, setDob]             = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [gender, setGender]       = useState<Gender | null>(null);

  // ── Error states ──
  const [nameError, setNameError]     = useState('');
  const [dobError, setDobError]       = useState('');
  const [phoneError, setPhoneError]   = useState('');
  const [emailError, setEmailError]   = useState('');
  const [genderError, setGenderError] = useState('');

  // ── Upload state — gold-specific docs only ──
  // Aadhaar and PAN are handled by the shared pan-verify / aadhaar-otp screens.
  // Selfie is captured in kyc-step-2.
  const [docs, setDocs] = useState({
    gold_photo_front:  false,   // required — clear front view of gold item(s)
    gold_photo_detail: false,   // required — hallmark / weight tag close-up
    bank_proof:        false,   // required — passbook first page or 3-month statement
    address_proof:     false,   // optional — only if address differs from Aadhaar
  });

  const pickDoc = (key: keyof typeof docs) => {
    Alert.alert('Upload Document', 'Choose method', [
      { text: 'Camera', onPress: () => setDocs((p) => ({ ...p, [key]: true })) },
      { text: 'Gallery', onPress: () => setDocs((p) => ({ ...p, [key]: true })) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Input handlers ──
  const handleDobChange = (text: string) => {
    setDob(formatDOBInput(text));
    if (dobError) setDobError('');
  };

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (phoneError) setPhoneError('');
  };

  // ── Validation ──
  const requiredDocsUploaded = docs.gold_photo_front && docs.gold_photo_detail && docs.bank_proof;

  const handleContinue = () => {
    const nameErr  = validateName(fullName);
    const dobErr   = validateDOB(dob);
    const phoneErr = validatePhone(phone);
    const emailErr = validateEmail(email);
    const genderErr = gender === null ? 'Please select your gender' : '';

    setNameError(nameErr ?? '');
    setDobError(dobErr ?? '');
    setPhoneError(phoneErr ?? '');
    setEmailError(emailErr ?? '');
    setGenderError(genderErr);

    if (nameErr || dobErr || phoneErr || emailErr || genderErr) return;

    if (!requiredDocsUploaded) {
      Alert.alert(
        'Required Documents Missing',
        'Please upload both gold item photos and a bank proof document before continuing.',
      );
      return;
    }

    // Route into the shared CDL KYC flow (PAN → Aadhaar OTP → Selfie).
    // nextPath tells kyc-step-2 to route to gold-loan-ownership instead of loan-step-2.
    router.push({
      pathname: '/(main)/apply/pan-verify',
      params: {
        ...params,
        fullName: fullName.trim(),
        dob,
        phone,
        email: email.trim(),
        gender: gender ?? '',
        nextPath: 'gold-loan-compliance',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="KYC — Personal Details" showBack />

      {/* Step indicator — gold-loan progress bar */}
      <View style={pb.container}>
        <View style={pb.track}>
          <View style={pb.fill} />
        </View>
        <Text style={pb.label}>Step 1 of 2 · KYC &amp; Documents</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Loan summary banner — same as CDL kyc-form.tsx */}
          <View style={styles.summaryRow}>
            <Ionicons name="receipt" size={14} color={Colors.primary} />
            <Text style={styles.summaryText}>
              Gold Loan · ₹{parseInt(params.loanAmount ?? '0').toLocaleString('en-IN')} · {params.tenure}M · {
                params.repaymentType === 'emi' ? 'Monthly EMI'
                  : params.repaymentType === 'interest_only' ? 'Interest Only'
                  : 'Bullet Repayment'
              }
            </Text>
          </View>

          {/* Gold-loan specific banner */}
          <View style={styles.noteBanner}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.noteBannerText}>
              No income proof or salary slip required for gold loans. We just need your KYC documents and photos of your gold.
            </Text>
          </View>

          {/* ── Personal Details — identical to CDL kyc-form.tsx ── */}
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <Text style={styles.sectionSub}>
            Enter your information as per official documents. We'll verify your PAN and Aadhaar digitally in the next steps.
          </Text>

          <InputField
            label="Full Name *"
            value={fullName}
            onChangeText={(t) => { setFullName(t); if (nameError) setNameError(''); }}
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
            onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
            placeholder="yourname@email.com"
            keyboardType="email-address"
            error={emailError}
            accessibilityHint="Enter a valid email address, optional field"
          />

          {/* Gender */}
          <Text style={gs.label}>GENDER *</Text>
          <View style={gs.row}>
            {(['male', 'female', 'other'] as Gender[]).map((g) => (
              <Pressable
                key={g}
                style={[gs.option, gender === g && gs.optionActive]}
                onPress={() => { setGender(g); setGenderError(''); }}
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
                <Text style={[gs.optionText, gender === g && gs.optionTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          {!!genderError && <Text style={fi.error}>{genderError}</Text>}

          {/* ── Collateral Documents — gold-loan specific ── */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>
            Gold &amp; Bank Documents
          </Text>
          <Text style={styles.sectionSub}>
            Upload clear photos of your gold items and a bank proof. All four corners must be visible in document photos.
          </Text>

          <UploadField
            label="Gold Item — Front View"
            subtitle="Clear photo of all gold pieces · JPG or PNG"
            required
            uploaded={docs.gold_photo_front}
            onPress={() => pickDoc('gold_photo_front')}
          />
          <UploadField
            label="Gold Item — Hallmark / Weight Tag"
            subtitle="Close-up of hallmark stamp or weight tag"
            required
            uploaded={docs.gold_photo_detail}
            onPress={() => pickDoc('gold_photo_detail')}
          />
          <UploadField
            label="Bank Proof"
            subtitle="Passbook first page or last 3-month statement · PDF or image"
            required
            uploaded={docs.bank_proof}
            onPress={() => pickDoc('bank_proof')}
          />
          <UploadField
            label="Address Proof"
            subtitle="Only if address differs from Aadhaar — utility bill, rent agreement, etc."
            uploaded={docs.address_proof}
            onPress={() => pickDoc('address_proof')}
          />

          <View style={styles.secureNote}>
            <Ionicons name="lock-closed" size={13} color={Colors.success} />
            <Text style={styles.secureText}>
              Your documents are encrypted and stored securely as per RBI data privacy guidelines.
            </Text>
          </View>

          <View style={styles.nextStepsNote}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.nextStepsText}>
              Next: PAN verification → Aadhaar OTP → Selfie. No income documents needed.
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

// ─── Progress bar styles ──────────────────────────────────────────────────────

const pb = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  track: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', width: '50%', backgroundColor: Colors.gold, borderRadius: 3 },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});

// ─── Gender selector styles ───────────────────────────────────────────────────

const gs = StyleSheet.create({
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

// ─── Screen-level styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.xs },

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

  noteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success,
    marginBottom: Spacing.sm,
  },
  noteBannerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.success,
    lineHeight: 18,
  },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  sectionSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  secureText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 17,
  },

  nextStepsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  nextStepsText: {
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

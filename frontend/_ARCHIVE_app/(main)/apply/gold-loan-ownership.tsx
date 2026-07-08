import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { useScreenGuard } from '@/src/shared/hooks/useScreenGuard';

function ProgressBar() {
  return (
    <View style={pb.container}>
      <View style={pb.track}>
        <View style={pb.fill} />
      </View>
      <Text style={pb.label}>Step 2 of 2</Text>
    </View>
  );
}

const pb = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  track: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  label: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'right' },
});

function InputField({ label, value, onChangeText, placeholder, keyboardType = 'default', hint, accessibilityHint }: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  hint?: string;
  accessibilityHint?: string;
}) {
  const cleanLabel = label.replace(/\s*\*\s*$/, '').trim();
  return (
    <View style={fi.wrapper}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={fi.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        keyboardType={keyboardType}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={cleanLabel}
        accessibilityHint={accessibilityHint ?? hint}
      />
      {hint ? <Text style={fi.hint}>{hint}</Text> : null}
    </View>
  );
}

const fi = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 52, paddingHorizontal: Spacing.md, fontFamily: FontFamily.medium, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.background },
  hint: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled, marginTop: 4 },
});

function UploadField({ label, uploaded, onPress, optional }: {
  label: string;
  uploaded: boolean;
  onPress: () => void;
  optional?: boolean;
}) {
  return (
    <Pressable
      style={[uf.card, uploaded && uf.cardUploaded]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${label}${optional ? ', optional' : ''}. ${uploaded ? 'Uploaded' : 'Tap to upload or capture'}`}
    >
      <View style={[uf.iconBox, uploaded && uf.iconBoxUploaded]}>
        <Ionicons name={uploaded ? 'checkmark-circle' : 'cloud-upload'} size={22} color={uploaded ? Colors.success : Colors.primary} />
      </View>
      <View style={uf.info}>
        <Text style={uf.label}>
          {label}
          {optional && <Text style={uf.optional}> (optional)</Text>}
        </Text>
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
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.background, gap: Spacing.md },
  cardUploaded: { borderColor: Colors.success, backgroundColor: Colors.successEmphasis },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconBoxUploaded: { backgroundColor: Colors.successLight },
  info: { flex: 1 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  optional: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled },
  status: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled },
  statusDone: { color: Colors.success },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});

export default function GoldLoanOwnershipScreen() {
  useScreenGuard();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Record<string, string>>();

  const [selfOwned, setSelfOwned] = useState(false);
  const [goldPhotos, setGoldPhotos] = useState({ angle1: false, angle2: false });
  const [invoice, setInvoice] = useState(false);

  const [accountName, setAccountName] = useState(params.fullName ?? '');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankProof, setBankProof] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const simulateUpload = (cb: () => void) => {
    Alert.alert('Upload', 'Choose method', [
      { text: 'Camera', onPress: cb },
      { text: 'Gallery', onPress: cb },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const canSubmit = selfOwned && goldPhotos.angle1 && goldPhotos.angle2
    && accountName.trim().length > 1 && bankName.trim().length > 1
    && accountNumber.trim().length >= 9 && ifsc.trim().length === 11;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all required fields.');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    router.push({
      pathname: '/(main)/apply/gold-loan-branch',
      params,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Gold Ownership & Bank Details" showBack />
      <ProgressBar />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Gold ownership */}
        <Text style={styles.sectionTitle}>Gold Ownership</Text>
        <Text style={styles.sectionSub}>Declare ownership and upload photos of your gold</Text>

        {/* Self-owned declaration */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleContent}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>This gold is self-owned *</Text>
              <Text style={styles.toggleDesc}>Required declaration for loan eligibility</Text>
            </View>
          </View>
          <Switch
            value={selfOwned}
            onValueChange={setSelfOwned}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textWhite}
          />
        </View>

        {/* Gold photos */}
        <Text style={styles.subLabel}>UPLOAD PHOTOS OF GOLD ITEMS</Text>
        <Text style={styles.subHint}>Minimum 2 angles required — camera preferred</Text>

        <UploadField
          label="Gold Photo — Angle 1"
          uploaded={goldPhotos.angle1}
          onPress={() => simulateUpload(() => setGoldPhotos((p) => ({ ...p, angle1: true })))}
        />
        <UploadField
          label="Gold Photo — Angle 2"
          uploaded={goldPhotos.angle2}
          onPress={() => simulateUpload(() => setGoldPhotos((p) => ({ ...p, angle2: true })))}
        />
        <UploadField
          label="Purchase Invoice / Receipt"
          uploaded={invoice}
          onPress={() => simulateUpload(() => setInvoice(true))}
          optional
        />

        {/* Bank details */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Bank Account for Disbursal</Text>
        <Text style={styles.sectionSub}>Loan amount will be credited to this account</Text>

        <InputField
          label="Account Holder Name *"
          value={accountName}
          onChangeText={setAccountName}
          placeholder="As per bank records"
          accessibilityHint="Enter the account holder name exactly as per bank records"
        />
        <InputField
          label="Bank Name *"
          value={bankName}
          onChangeText={setBankName}
          placeholder="e.g. HDFC Bank"
          accessibilityHint="Enter your bank's name"
        />
        <InputField
          label="Account Number *"
          value={accountNumber}
          onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))}
          placeholder="Enter account number"
          keyboardType="number-pad"
          accessibilityHint="Enter your bank account number, digits only"
        />
        <InputField
          label="IFSC Code *"
          value={ifsc}
          onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
          placeholder="e.g. HDFC0001234"
          hint={ifsc.length === 11 ? 'Branch details will be verified automatically' : ''}
          accessibilityHint="Enter 11-character IFSC code in capital letters"
        />

        <Text style={styles.subLabel}>BANK PROOF *</Text>
        <Text style={styles.subHint}>Cancelled cheque or passbook front page</Text>
        <UploadField
          label="Cancelled Cheque / Passbook"
          uploaded={bankProof}
          onPress={() => simulateUpload(() => setBankProof(true))}
        />

        <View style={styles.secureNote}>
          <Ionicons name="lock-closed" size={13} color={Colors.success} />
          <Text style={styles.secureText}>
            Your bank details are encrypted using 256-bit SSL and never shared with third parties.
          </Text>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Button
          title="Submit & Book Branch Visit"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !canSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  scroll: { padding: Spacing.xl },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary,
    marginBottom: 4,
  },
  sectionSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  toggleText: { flex: 1 },
  toggleLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  toggleDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  subLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subHint: {
    ...Typography.caption,
    color: Colors.textDisabled,
    marginBottom: Spacing.sm,
  },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  secureText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 17,
  },

  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

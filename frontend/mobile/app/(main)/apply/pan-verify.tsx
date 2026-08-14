import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
import { isValidPAN } from '@/src/core/utils/validators';
import { maskPAN, sanitizeInput } from '@/src/core/utils/formatters';
import { usePersistApplyStepFromParams } from '@/src/features/apply/useApplyDraft';

type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

const MOCK_PAN_RESULT = {
  name: 'ARUN KUMAR MEHTA',
  dob: '12/08/1990',
  type: 'Individual',
};

export default function PANVerifyScreen() {
  // Saves a resumable draft for whichever flow threaded `applyFlow`.
  // No-ops for flows that do not set it, so the gold path is unchanged.
  usePersistApplyStepFromParams();
  const params = useLocalSearchParams<{ productName?: string; loanAmount?: string }>();
  const [pan, setPan] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePANChange = (text: string) => {
    const cleaned = sanitizeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 10);
    setPan(cleaned);
    if (verifyState === 'error') {
      setVerifyState('idle');
      setErrorMsg('');
    }
  };

  const handleVerify = async () => {
    if (!isValidPAN(pan)) {
      setErrorMsg('Enter a valid PAN (e.g. ABCDE1234F)');
      setVerifyState('error');
      return;
    }
    setVerifyState('verifying');
    await new Promise((r) => setTimeout(r, 1800));
    setVerifyState('success');
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(main)/apply/aadhaar-otp',
      params: { ...params, pan },
    });
  };

  const isSuccess = verifyState === 'success';
  const isVerifying = verifyState === 'verifying';
  const isError = verifyState === 'error';

  return (
    <SafeAreaView style={styles.container}>
      <Header title="PAN Verification" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="card-outline" size={scale(32)} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Verify your PAN</Text>
          <Text style={styles.subtitle}>
            Your PAN is used to fetch your credit bureau report and verify your identity.
          </Text>

          {!isSuccess ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>PAN NUMBER</Text>
                <View style={[styles.inputRow, isError && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="ABCDE1234F"
                    placeholderTextColor={Colors.textDisabled}
                    value={pan}
                    onChangeText={handlePANChange}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    editable={!isVerifying}
                    accessibilityLabel="PAN number"
                  />
                  {pan.length === 10 && !isError && (
                    <Ionicons name="checkmark-circle" size={scale(20)} color={Colors.success} />
                  )}
                </View>
                {isError && (
                  <Text style={styles.errorText} accessibilityLiveRegion="polite">
                    {errorMsg}
                  </Text>
                )}
                <Text style={styles.hint}>Format: 5 letters · 4 digits · 1 letter</Text>
              </View>

              <View style={styles.consentBox}>
                <Ionicons name="shield-checkmark-outline" size={scale(16)} color={Colors.primary} />
                <Text style={styles.consentText}>
                  By verifying PAN, you consent to a bureau enquiry via TransUnion CIBIL. This may
                  affect your credit score minimally.
                </Text>
              </View>

              <Button
                title={isVerifying ? 'Verifying…' : 'Verify PAN'}
                onPress={handleVerify}
                disabled={pan.length !== 10 || isVerifying}
                loading={isVerifying}
              />
            </>
          ) : (
            <>
              <View style={styles.successCard}>
                <View style={styles.successIconRow}>
                  <View style={styles.successIconBg}>
                    <Ionicons name="checkmark-circle" size={scale(36)} color={Colors.success} />
                  </View>
                  <View style={styles.successTextCol}>
                    <Text style={styles.successLabel}>PAN Verified</Text>
                    <Text style={styles.successPan}>{maskPAN(pan)}</Text>
                  </View>
                </View>

                <View style={styles.successDivider} />

                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Name on PAN</Text>
                  <Text style={styles.resultVal}>{MOCK_PAN_RESULT.name}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Date of Birth</Text>
                  <Text style={styles.resultVal}>{MOCK_PAN_RESULT.dob}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>PAN Type</Text>
                  <Text style={styles.resultVal}>{MOCK_PAN_RESULT.type}</Text>
                </View>
              </View>

              <View style={styles.consentBox}>
                <Ionicons name="information-circle-outline" size={scale(16)} color={Colors.primary} />
                <Text style={styles.consentText}>
                  Next: We will verify your Aadhaar via OTP to complete KYC.
                </Text>
              </View>

              <Button title="Continue to Aadhaar OTP" onPress={handleContinue} />
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

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  field: { marginBottom: Spacing.md },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: scale(52),
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  inputError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  input: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    letterSpacing: 2,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 4,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textDisabled,
    marginTop: 4,
  },

  consentBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  consentText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },

  successCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  successIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  successIconBg: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTextCol: { flex: 1 },
  successLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.success,
  },
  successPan: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginTop: 2,
  },
  successDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  resultKey: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  resultVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

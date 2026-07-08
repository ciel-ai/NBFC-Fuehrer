import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { isValidPAN } from '@/src/core/utils/validators';
import { sanitizeInput, maskPAN } from '@/src/core/utils/formatters';

export default function EligibilityPANScreen() {
  const { appliance } = useLocalSearchParams<{ appliance: string }>();
  const [pan, setPan] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePANChange = (text: string) => {
    const cleaned = sanitizeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    const limited = cleaned.slice(0, 10);
    setPan(limited);
    if (error) setError(null);
  };

  const handleCheckEligibility = () => {
    const trimmed = pan.trim();
    if (!isValidPAN(trimmed)) {
      setError('Enter a valid PAN number (e.g. ABCDE1234F)');
      return;
    }
    router.push({
      pathname: '/(main)/apply/eligibility-pan-verifying',
      params: { pan: trimmed, appliance: appliance ?? '' },
    });
  };

  const isValid = isValidPAN(pan);
  const displayValue = !isFocused && pan.length === 10 ? maskPAN(pan) : pan;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="PAN Verification" showBack />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Enter your PAN details</Text>
          <Text style={styles.subtitle}>
            PAN is required to check your loan eligibility for the selected appliance.
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>PAN NUMBER</Text>
            <TextInput
              style={[
                styles.input,
                isFocused && styles.inputFocused,
                error && styles.inputError,
                !isFocused && pan.length === 10 && styles.inputMasked,
              ]}
              placeholder="ABCDE1234F"
              placeholderTextColor={Colors.textDisabled}
              value={displayValue}
              onChangeText={handlePANChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.noteRow}>
            <View style={styles.blueDot} />
            <Text style={styles.noteText}>
              PAN is required as per RBI regulatory guidelines
            </Text>
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Why do we need your PAN?</Text>
            <Text style={styles.infoText}>
              PAN verification is mandatory for all loan applications as per Reserve Bank
              of India guidelines. It helps us verify your identity and check your
              credit eligibility securely.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Check Eligibility"
            onPress={handleCheckEligibility}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  inputSection: { marginBottom: Spacing.md },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: 52,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    letterSpacing: 2,
    backgroundColor: Colors.background,
  },
  inputFocused: { borderColor: Colors.primary },
  inputError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  inputMasked: { color: Colors.textSecondary, letterSpacing: 3 },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  noteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  infoTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

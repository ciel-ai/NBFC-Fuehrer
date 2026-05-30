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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { useUserStore } from '@/src/store/userStore';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';

export default function CompleteProfileScreen() {
  const updateUser = useUserStore((s) => s.updateUser);
  const setOnboardingDone = useUserStore((s) => s.setOnboardingDone);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    let valid = true;

    if (name.trim().length < 2) {
      setNameError('Please enter your full name');
      valid = false;
    } else {
      setNameError('');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim().length > 0 && !emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    return valid;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setIsLoading(true);
    await updateUser({ name: name.trim(), email: email.trim() || undefined });
    await setOnboardingDone();
    setIsLoading(false);
    router.replace('/(main)/(tabs)/home');
  };

  const isValid = name.trim().length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={32} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>
            Tell us a little about yourself to get started.
          </Text>

          {/* Full Name */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>FULL NAME *</Text>
            <View style={[styles.inputRow, nameError ? styles.inputRowError : null]}>
              <Ionicons name="person-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={Colors.textDisabled}
                value={name}
                onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
                accessibilityLabel="Full name"
                accessibilityHint="Enter your full name as per your official ID, letters only"
              />
            </View>
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : (
              <Text style={styles.hintText}>As per your official ID</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>EMAIL ADDRESS (OPTIONAL)</Text>
            <View style={[styles.inputRow, emailError ? styles.inputRowError : null]}>
              <Ionicons name="mail-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="yourname@email.com"
                placeholderTextColor={Colors.textDisabled}
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                accessibilityLabel="Email address, optional"
                accessibilityHint="Enter your email address in standard format"
              />
            </View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : (
              <Text style={styles.hintText}>For loan updates and statements</Text>
            )}
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed" size={14} color={Colors.success} />
            <Text style={styles.infoText}>
              Your information is encrypted and protected as per RBI data privacy guidelines.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            disabled={!isValid || isLoading}
            loading={isLoading}
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

  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
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

  inputSection: { marginBottom: Spacing.lg },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: 52,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inputRowError: { borderColor: Colors.error },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  hintText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
});

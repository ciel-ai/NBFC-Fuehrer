import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { phoneSchema, PhoneFormData } from '@/src/core/utils/validators';
import { sanitizeInput } from '@/src/core/utils/formatters';
import { useUserStore } from '@/src/store/userStore';
import { useServices } from '@/src/core/services/ServiceProvider';
import { scale } from '@/src/core/utils/responsive';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);
  const role = useUserStore((s) => s.role) ?? 'customer';
  const { authService } = useServices();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    mode: 'onChange',
    defaultValues: { phone: '' },
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    try {
      await authService.sendOTP({ phone: sanitizeInput(data.phone), role });
      if (!isMountedRef.current) return;
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: data.phone },
      });
    } catch {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

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
          <Text style={styles.title}>Login to your account</Text>
          <Text style={styles.subtitle}>
            Enter your registered mobile number to continue
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputRow, errors.phone && styles.inputRowError]}>
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={Colors.textDisabled}
                    value={value}
                    onChangeText={(text) => onChange(sanitizeInput(text.replace(/\D/g, '')))}
                    onBlur={onBlur}
                    keyboardType="phone-pad"
                    maxLength={10}
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    accessibilityLabel="Phone number input"
                  />
                </View>
              )}
            />
            {errors.phone ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">{errors.phone.message}</Text>
            ) : (
              <Text style={styles.hintText}>We will send an OTP to this number</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Send OTP"
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid}
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
  inputSection: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: scale(52),
    overflow: 'hidden',
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  prefix: {
    paddingHorizontal: Spacing.md,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  prefixText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
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
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
});

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

type City = 'Bengaluru' | 'Mumbai' | 'Hyderabad' | 'Pune' | 'Chennai' | 'Other';

const CITY_OPTIONS: City[] = ['Bengaluru', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Other'];

export default function HousingPropertyScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    tenure?: string;
    propertyType?: string;
    hasCoApplicant?: string;
  }>();

  const [builderName, setBuilderName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState<City>('Bengaluru');
  const [pincode, setPincode] = useState('');
  const [agreementValue, setAgreementValue] = useState('');
  const [carpetArea, setCarpetArea] = useState('');
  const [reraId, setReraId] = useState('');

  const isValidPincode = /^\d{6}$/.test(pincode);
  const canContinue =
    builderName.trim().length > 1 &&
    projectName.trim().length > 1 &&
    addressLine.trim().length > 5 &&
    isValidPincode &&
    Number(agreementValue) > 0 &&
    Number(carpetArea) > 0;

  const handleContinue = () => {
    const next =
      params.hasCoApplicant === '1' ? '/(main)/apply/housing-coapplicant' : '/(main)/apply/housing-income';
    router.push({
      pathname: next,
      params: {
        ...params,
        builderName,
        projectName,
        addressLine,
        city,
        pincode,
        agreementValue,
        carpetArea,
        reraId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Property Details" showBack />

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
            <Text style={styles.stepBadgeText}>STEP 2 OF 5 · PROPERTY</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>BUILDER / DEVELOPER NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Prestige Group"
              placeholderTextColor={Colors.textDisabled}
              value={builderName}
              onChangeText={setBuilderName}
              accessibilityLabel="Builder name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PROJECT / SOCIETY NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Prestige Lakeside Habitat"
              placeholderTextColor={Colors.textDisabled}
              value={projectName}
              onChangeText={setProjectName}
              accessibilityLabel="Project name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ADDRESS LINE</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Flat / unit no, building, street"
              placeholderTextColor={Colors.textDisabled}
              value={addressLine}
              onChangeText={setAddressLine}
              multiline
              numberOfLines={2}
              accessibilityLabel="Address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CITY</Text>
            <View style={styles.cityRow}>
              {CITY_OPTIONS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.cityChip, city === c && styles.cityChipActive]}
                  onPress={() => setCity(c)}
                  accessibilityRole="radio"
                  accessibilityLabel={c}
                  accessibilityState={{ selected: city === c }}
                >
                  <Text style={[styles.cityText, city === c && styles.cityTextActive]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PINCODE</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="6-digit PIN"
                placeholderTextColor={Colors.textDisabled}
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="Pincode"
              />
              {pincode.length === 6 && (
                <Ionicons
                  name={isValidPincode ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={isValidPincode ? Colors.success : Colors.error}
                />
              )}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>AGREEMENT VALUE (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="45,00,000"
                placeholderTextColor={Colors.textDisabled}
                value={agreementValue}
                onChangeText={(t) => setAgreementValue(t.replace(/\D/g, ''))}
                keyboardType="number-pad"
                accessibilityLabel="Agreement value"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>CARPET AREA (SQ FT)</Text>
              <TextInput
                style={styles.input}
                placeholder="950"
                placeholderTextColor={Colors.textDisabled}
                value={carpetArea}
                onChangeText={(t) => setCarpetArea(t.replace(/\D/g, ''))}
                keyboardType="number-pad"
                accessibilityLabel="Carpet area"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>RERA ID (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. PRM/KA/RERA/1251/446/PR/171015/000345"
              placeholderTextColor={Colors.textDisabled}
              value={reraId}
              onChangeText={setReraId}
              autoCapitalize="characters"
              accessibilityLabel="RERA ID"
            />
            <Text style={styles.hint}>RERA registration confirms the project is regulator-approved.</Text>
          </View>

          <View style={styles.cersaiBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
            <Text style={styles.cersaiText}>
              We'll run a <Text style={styles.cersaiBold}>CERSAI encumbrance check</Text> on this property in the next step.
              Legal and technical valuation will follow.
            </Text>
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
  inputMultiline: { minHeight: scale(72), textAlignVertical: 'top', paddingTop: Spacing.sm },
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
  hint: { ...Typography.tiny, color: Colors.textDisabled },

  cityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  cityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cityChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cityText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  cityTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold },

  cersaiBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  cersaiText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  cersaiBold: { fontFamily: FontFamily.semiBold },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

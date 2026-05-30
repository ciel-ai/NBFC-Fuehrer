import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { StepItem } from '@/src/shared/components/common/StepItem';
import { FeatureRow } from '@/src/shared/components/common/FeatureRow';
import { scale } from '@/src/core/utils/responsive';

interface Appliance {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

const APPLIANCES: Appliance[] = [
  {
    id: 'mobile',
    title: 'Mobile Phone',
    subtitle: 'Smartphones & accessories',
    icon: 'phone-portrait',
    iconColor: Colors.primary,
    iconBg: Colors.primaryLight,
  },
  {
    id: 'home_appliance',
    title: 'Home Appliance',
    subtitle: 'AC, fridge, washing machine & more',
    icon: 'home',
    iconColor: '#0D9488',
    iconBg: '#CCFBF1',
  },
  {
    id: 'laptop',
    title: 'Laptop / Computer',
    subtitle: 'Laptops, desktops & tablets',
    icon: 'laptop',
    iconColor: '#7C3AED',
    iconBg: '#EDE9FE',
  },
];

const FEATURES = [
  { icon: 'flash' as const, label: 'Instant\nApproval' },
  { icon: 'pricetag' as const, label: 'No-Cost\nEMI' },
  { icon: 'document-text' as const, label: 'Minimal\nDocs' },
];

export default function ConsumerDurableLoanScreen() {
  const [selectedAppliance, setSelectedAppliance] = useState<string | null>(null);

  const handleCheckEligibility = () => {
    if (!selectedAppliance) return;
    const applianceObj = APPLIANCES.find((a) => a.id === selectedAppliance);
    router.push({
      pathname: '/(main)/apply/product-listing',
      params: {
        categoryId: selectedAppliance,
        categoryName: applianceObj?.title ?? 'Products',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Consumer Durable Loan" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="star" size={scale(16)} color={Colors.gold} />
          <Text style={styles.bannerText}>
            0% Interest EMI on select products
          </Text>
        </View>

        <Text style={styles.title}>Check your eligibility</Text>
        <Text style={styles.subtitle}>
          Select the type of appliance you want to purchase on EMI.
        </Text>

        {/* Appliance cards */}
        <View style={styles.cards}>
          {APPLIANCES.map((appliance) => {
            const isSelected = selectedAppliance === appliance.id;
            return (
              <Pressable
                key={appliance.id}
                style={({ pressed }) => [
                  styles.card,
                  isSelected && styles.cardSelected,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setSelectedAppliance(appliance.id)}
                android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${appliance.title}, ${appliance.subtitle}`}
              >
                <View style={[styles.cardIcon, { backgroundColor: appliance.iconBg }]}>
                  <Ionicons name={appliance.icon} size={scale(24)} color={appliance.iconColor} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{appliance.title}</Text>
                  <Text style={styles.cardSubtitle}>{appliance.subtitle}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <StepItem step={1} title="Select your appliance category" />
          <StepItem step={2} title="Verify your PAN for eligibility check" />
          <StepItem step={3} title="Get instant approval and shop on EMI" />
        </View>

        {/* Features */}
        <FeatureRow features={FEATURES} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Check Eligibility"
          onPress={handleCheckEligibility}
          disabled={!selectedAppliance}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bannerText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.goldDark,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    paddingHorizontal: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xs,
  },
  cards: { gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.medium,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  cardIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  radio: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: Colors.primary,
  },
  infoCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.small,
  },
  infoTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

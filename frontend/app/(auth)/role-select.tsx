import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { useUserStore } from '@/src/store/userStore';
import { RoleCard } from '@/src/features/auth/components/RoleCard';
import type { UserRole } from '@/src/entities/auth';

interface RoleOption {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: 'person' | 'briefcase';
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'customer',
    title: 'Customer',
    subtitle: 'Apply for loans and manage repayments',
    icon: 'person',
  },
  {
    role: 'agent',
    title: 'Agent / Dealer',
    subtitle: 'Create and manage loan applications for customers',
    icon: 'briefcase',
  },
];

export default function OnboardingRoleSelectScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const setRole = useUserStore((s) => s.setRole);

  const handleContinue = () => {
    setRole(selectedRole);
    router.push(selectedRole === 'agent' ? '/(auth)/agent-login' : '/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How will you use the app?</Text>
        <Text style={styles.subtitle}>You can change this later in your profile settings.</Text>

        <View style={styles.cards}>
          {ROLE_OPTIONS.map((option) => (
            <RoleCard
              key={option.role}
              role={option.role}
              title={option.title}
              subtitle={option.subtitle}
              icon={option.icon}
              selected={selectedRole === option.role}
              onSelect={() => setSelectedRole(option.role)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  cards: { gap: Spacing.sm },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

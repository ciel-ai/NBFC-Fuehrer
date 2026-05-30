import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import type { AuthUser } from '@/src/entities/auth';

const MOCK_AGENT: Pick<AuthUser, 'name' | 'phone' | 'role'> = {
  name: 'Rajesh Kumar',
  phone: '+91-AGENT',
  role: 'agent',
};

export default function AgentLoginScreen() {
  const [agentId, setAgentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const setUser = useUserStore((s) => s.setUser);
  const setOnboardingDone = useUserStore((s) => s.setOnboardingDone);

  const canSubmit = agentId.trim().length >= 3 && password.length >= 4;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await login(`mock-agent-access-${Date.now()}`, `mock-agent-refresh-${Date.now()}`);
      await setUser({
        id: agentId.trim(),
        ...MOCK_AGENT,
      });
      await setOnboardingDone();
      router.replace('/(main)/agent/dashboard');
    } catch {
      Alert.alert('Sign-in failed', 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Agent Sign-in" showBack onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="briefcase" size={scale(28)} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Sign in as agent</Text>
          <Text style={styles.subtitle}>
            Use your assigned Agent ID and password to access KYC, credit and recovery dashboards.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>AGENT ID</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={scale(18)} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="AGT-XXXXXX"
                placeholderTextColor={Colors.textDisabled}
                value={agentId}
                onChangeText={(t) => setAgentId(t.replace(/\s/g, ''))}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Agent ID"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={scale(18)} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={Colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Password"
              />
              <Pressable
                onPress={() => setShowPwd((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={scale(18)}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
            onPress={() =>
              Alert.alert(
                'Forgot password',
                'Contact ops@fuehrer.in to reset your agent password.'
              )
            }
          >
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Sign in as agent"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
          />
          <Text style={styles.footerHint}>
            Agents are pre-onboarded. Contact ops@fuehrer.in for access.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  heroIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.md,
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
    paddingHorizontal: Spacing.md,
    minHeight: verticalScale(52),
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  forgot: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  footerHint: {
    ...Typography.tiny,
    color: Colors.textDisabled,
    textAlign: 'center',
  },
});

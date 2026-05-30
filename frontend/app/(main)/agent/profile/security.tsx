import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { scale } from '@/src/core/utils/responsive';

function Toggle({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable
      style={[styles.toggle, value && styles.toggleOn]}
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </Pressable>
  );
}

export default function AgentSecurityScreen() {
  const insets = useSafeAreaInsets();
  const [biometric, setBiometric] = useState(true);
  const [hideAmounts, setHideAmounts] = useState(false);

  return (
    <View style={styles.container}>
      <AppHeader title="Security & Privacy" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Biometric app lock</Text>
              <Text style={styles.rowSub}>Require fingerprint / Face ID to open the agent app.</Text>
            </View>
            <Toggle value={biometric} onToggle={() => setBiometric((v) => !v)} label="Biometric app lock" />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Hide customer amounts</Text>
              <Text style={styles.rowSub}>Mask outstanding values on shared screens.</Text>
            </View>
            <Toggle value={hideAmounts} onToggle={() => setHideAmounts((v) => !v)} label="Hide customer amounts" />
          </View>
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: Colors.backgroundLight }]}
            onPress={() => Alert.alert('Change password', 'A password reset link will be sent to your registered email.')}
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            <View style={styles.actionIcon}><Ionicons name="key-outline" size={scale(18)} color={Colors.textSecondary} /></View>
            <Text style={styles.actionTitle}>Change password</Text>
            <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textDisabled} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: Colors.backgroundLight }]}
            onPress={() => Alert.alert('Sign out everywhere', 'This will end all active agent sessions on other devices.')}
            accessibilityRole="button"
            accessibilityLabel="Sign out of all devices"
          >
            <View style={styles.actionIcon}><Ionicons name="log-out-outline" size={scale(18)} color={Colors.textSecondary} /></View>
            <Text style={styles.actionTitle}>Sign out of all devices</Text>
            <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textDisabled} />
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>Customer data viewed in the agent app is access-logged for compliance. Do not share screenshots.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary },
  rowSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  divider: { height: 1, backgroundColor: Colors.border },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  actionIcon: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: Colors.backgroundLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  actionTitle: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary },
  toggle: { width: scale(44), height: scale(26), borderRadius: scale(13), backgroundColor: Colors.border, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: scale(22), height: scale(22), borderRadius: scale(11), backgroundColor: Colors.background, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  infoText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
});

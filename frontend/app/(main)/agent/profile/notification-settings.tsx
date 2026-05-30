import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { scale } from '@/src/core/utils/responsive';

interface Pref {
  key: string;
  title: string;
  sub: string;
}

const PREFS: Pref[] = [
  { key: 'case', title: 'New case assigned', sub: 'KYC / compliance / credit cases routed to you.' },
  { key: 'gold', title: 'Gold appraisal requests', sub: 'New branch appraisal appointments.' },
  { key: 'overdue', title: 'Overdue follow-ups', sub: 'Accounts due for a collection call.' },
  { key: 'gold_alert', title: 'Gold price / LTV alerts', sub: 'LTV breaches needing customer contact.' },
  { key: 'escalation', title: 'Escalation updates', sub: 'NPA and legal-notice status changes.' },
];

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

export default function AgentNotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    case: true, gold: true, overdue: true, gold_alert: true, escalation: false,
  });

  return (
    <View style={styles.container}>
      <AppHeader title="Notification Settings" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {PREFS.map((p, i) => (
            <View key={p.key}>
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{p.title}</Text>
                  <Text style={styles.rowSub}>{p.sub}</Text>
                </View>
                <Toggle value={!!prefs[p.key]} onToggle={() => setPrefs((s) => ({ ...s, [p.key]: !s[p.key] }))} label={p.title} />
              </View>
              {i < PREFS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
        <Text style={styles.note}>Reminders are delivered via push and SMS (AWS SNS). Critical escalations are always sent regardless of these settings.</Text>
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
  note: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  toggle: { width: scale(44), height: scale(26), borderRadius: scale(13), backgroundColor: Colors.border, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: scale(22), height: scale(22), borderRadius: scale(11), backgroundColor: Colors.background, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
});

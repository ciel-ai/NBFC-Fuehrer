import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { scale } from '@/src/core/utils/responsive';
import { dialPhone } from '@/src/core/utils/linking';

interface Row {
  id: string;
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

const FAQS = [
  'When does a case get routed to me vs auto-decided?',
  'How do I record a promise-to-pay during a follow-up call?',
  'What happens after I confirm a gold appraisal?',
  'How is an account escalated to the legal team?',
];

export default function AgentHelpSupportScreen() {
  const insets = useSafeAreaInsets();

  const rows: Row[] = [
    { id: 'call', title: 'Call ops desk', sub: '1800-FUEHRER · Mon–Sat, 9am–7pm', icon: 'call-outline', onPress: () => void dialPhone('1800383437') },
    { id: 'email', title: 'Email support', sub: 'ops@fuehrer.in', icon: 'mail-outline', onPress: () => void dialPhone('1800383437') },
    { id: 'guide', title: 'Agent field guide', sub: 'SOPs for KYC, appraisal, and recovery', icon: 'book-outline', onPress: () => {} },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Help & Support" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {rows.map((r, i) => (
            <View key={r.id}>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.backgroundLight }]}
                onPress={r.onPress}
                accessibilityRole="button"
                accessibilityLabel={r.title}
              >
                <View style={styles.rowIcon}><Ionicons name={r.icon} size={scale(18)} color={Colors.primary} /></View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{r.title}</Text>
                  <Text style={styles.rowSub}>{r.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textDisabled} />
              </Pressable>
              {i < rows.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Frequently asked</Text>
        <View style={styles.card}>
          {FAQS.map((q, i) => (
            <View key={q}>
              <View style={styles.faqRow}>
                <Ionicons name="help-circle-outline" size={scale(18)} color={Colors.textSecondary} />
                <Text style={styles.faqText}>{q}</Text>
              </View>
              {i < FAQS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  rowIcon: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary },
  rowSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.md },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginTop: Spacing.xs },
  faqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md },
  faqText: { ...Typography.body, color: Colors.textPrimary, flex: 1, lineHeight: 20 },
});

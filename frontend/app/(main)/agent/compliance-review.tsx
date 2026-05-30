import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { verticalScale } from '@/src/core/utils/responsive';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { StatusBadge } from '@/src/features/agent/components/StatusBadge';
import { InfoBanner } from '@/src/features/agent/components/InfoBanner';
import { ActionButtonRow, ActionItem } from '@/src/features/agent/components/ActionButtonRow';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { AgentReviewOutcome } from '@/src/entities/agent';

const MOCK = {
  name: 'Imran Q.',
  appId: 'LOS-CMP-20640',
  loanType: 'Consumer Durable · ₹1,20,000',
} as const;

const FLAGS: { label: string; detail: string; tone: Parameters<typeof StatusBadge>[0]['tone']; status: string }[] = [
  { label: 'PEP screening', detail: 'Possible politically-exposed person match', tone: 'review', status: 'Flagged' },
  { label: 'Watchlist / alerts', detail: 'Name appears on internal alert list', tone: 'review', status: 'Flagged' },
];

export default function ComplianceReviewScreen() {
  const insets = useSafeAreaInsets();
  const { agentService } = useServices();
  const [notes, setNotes] = useState('');

  const decide = async (outcome: AgentReviewOutcome) => {
    try {
      const res = await agentService.submitReviewDecision({
        queue: 'compliance',
        applicationId: MOCK.appId,
        outcome,
        remarks: notes.trim() || undefined,
      });
      Alert.alert('Compliance review', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Action failed', 'Could not record the decision. Please try again.');
    }
  };

  // AML / defaulter matches are auto-rejected upstream — only PEP/alerts reach the agent.
  const actions: ActionItem[] = [
    { label: 'Reject', tone: 'reject', icon: 'close', onPress: () => decide('reject') },
    { label: 'Approve', tone: 'approve', icon: 'checkmark', onPress: () => decide('approve') },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Compliance Review" subtitle={MOCK.appId} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <InfoBanner
              tone="warning"
              title="PEP / alert review only"
              message="AML sanction and bank-defaulter matches are auto-rejected by the system and never reach an agent. Only PEP and alert flags need human judgment."
            />
            <View style={{ height: Spacing.md }} />

            <AgentSection title="Applicant">
              <ReviewDetailRow label="Name" value={MOCK.name} />
              <ReviewDetailRow label="Application ID" value={MOCK.appId} />
              <ReviewDetailRow label="Loan" value={MOCK.loanType} divider={false} />
            </AgentSection>

            <AgentSection title="Compliance flags">
              {FLAGS.map((f, i) => (
                <View key={f.label} style={[styles.flagRow, i < FLAGS.length - 1 && styles.flagDivider]}>
                  <View style={styles.flagInfo}>
                    <Text style={styles.flagLabel}>{f.label}</Text>
                    <Text style={styles.flagDetail}>{f.detail}</Text>
                  </View>
                  <StatusBadge tone={f.tone} label={f.status} />
                </View>
              ))}
            </AgentSection>

            <AgentSection title="Agent notes">
              <TextInput
                style={styles.textArea}
                placeholder="Record your judgment on the PEP / alert flags and any supporting documents reviewed…"
                placeholderTextColor={Colors.textDisabled}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Agent notes"
              />
            </AgentSection>

            <ActionButtonRow actions={actions} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  flagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingVertical: Spacing.sm + 2 },
  flagDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  flagInfo: { flex: 1 },
  flagLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary },
  flagDetail: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  textArea: {
    minHeight: verticalScale(96),
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
});

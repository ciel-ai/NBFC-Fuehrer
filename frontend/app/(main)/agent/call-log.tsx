import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { Button } from '@/src/shared/components/common/Button';
import { dialPhone } from '@/src/core/utils/linking';
import { useServices } from '@/src/core/services/ServiceProvider';

type Outcome = 'promise' | 'no_answer' | 'disputed' | 'escalate';

interface OutcomeOption {
  id: Outcome;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  fg: string;
  bg: string;
}

const OUTCOMES: OutcomeOption[] = [
  { id: 'promise', label: 'Promise to pay', icon: 'checkmark-circle', fg: Colors.success, bg: Colors.successLight },
  { id: 'no_answer', label: 'No answer', icon: 'call-outline', fg: Colors.textSecondary, bg: Colors.backgroundLight },
  { id: 'disputed', label: 'Disputed', icon: 'help-circle', fg: Colors.goldDark, bg: Colors.goldLight },
  { id: 'escalate', label: 'Escalate', icon: 'arrow-up-circle', fg: Colors.error, bg: Colors.errorLight },
];

const MOCK_CUSTOMER = {
  name: 'Ramesh Babu',
  loanId: 'LOS-GL-19211',
  emiAmount: '₹4,250',
  dueDate: '08 May 2026',
  daysOverdue: 12,
  retryAttempts: 4,
  lastContact: '20 May 2026 · 11:45 AM',
  lastNote: 'Customer said salary delay — will pay by 28th.',
  phone: '+91 98XX XXX 781',
} as const;

export default function CallLogScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState('');

  const customer = {
    ...MOCK_CUSTOMER,
    name: params.name ?? MOCK_CUSTOMER.name,
  };

  const onCallNow = () => {
    void dialPhone(customer.phone);
  };

  const { agentService } = useServices();

  const onSave = async () => {
    if (!outcome) {
      Alert.alert('Select an outcome', 'Please choose a call outcome before saving.');
      return;
    }
    try {
      const res = await agentService.logCallOutcome(customer.loanId, outcome, notes.trim() || undefined);
      Alert.alert('Call log saved', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Save failed', 'Could not save the call log. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Call Log" subtitle={customer.loanId} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.xxl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Customer + EMI */}
            <View style={styles.headerCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{customer.name.charAt(0)}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{customer.name}</Text>
                <Text style={styles.phone}>{customer.phone}</Text>
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={onCallNow}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                accessibilityRole="button"
                accessibilityLabel={`Call ${customer.name} at ${customer.phone}`}
              >
                <Ionicons name="call" size={scale(18)} color={Colors.textWhite} />
                <Text style={styles.callBtnText}>Call now</Text>
              </Pressable>
            </View>

            {/* EMI details */}
            <AgentSection title="EMI details">
              <ReviewDetailRow label="EMI amount" value={customer.emiAmount} />
              <ReviewDetailRow label="Due date" value={customer.dueDate} />
              <ReviewDetailRow
                label="Days overdue"
                value={`${customer.daysOverdue} days`}
                valueColor={Colors.error}
              />
              <ReviewDetailRow
                label="Retry attempts"
                value={`${customer.retryAttempts} this cycle`}
                divider={false}
              />
            </AgentSection>

            {/* Last contact */}
            <AgentSection title="Last contact">
              <View style={styles.lastContact}>
                <Ionicons name="time-outline" size={scale(16)} color={Colors.textSecondary} />
                <Text style={styles.lastContactTime}>{customer.lastContact}</Text>
              </View>
              <Text style={styles.lastContactNote}>{customer.lastNote}</Text>
            </AgentSection>

            {/* Outcome grid */}
            <AgentSection title="Log call outcome">
              <View style={styles.outcomeGrid}>
                {OUTCOMES.map((o) => {
                  const active = outcome === o.id;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setOutcome(o.id)}
                      style={[
                        styles.outcomeCell,
                        {
                          backgroundColor: active ? o.bg : Colors.background,
                          borderColor: active ? o.fg : Colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={o.label}
                      accessibilityState={{ selected: active }}
                    >
                      <View style={[styles.outcomeIcon, { backgroundColor: o.bg }]}>
                        <Ionicons name={o.icon} size={scale(18)} color={o.fg} />
                      </View>
                      <Text style={[styles.outcomeText, { color: active ? o.fg : Colors.textPrimary }]} numberOfLines={2}>
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </AgentSection>

            {/* Notes */}
            <AgentSection title="Notes">
              <TextInput
                style={styles.textArea}
                placeholder="Write what was discussed and any promised dates…"
                placeholderTextColor={Colors.textDisabled}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Call notes"
              />
            </AgentSection>

            <Button title="Save call log" onPress={onSave} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
  },
  headerInfo: { flex: 1 },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  phone: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minHeight: verticalScale(40),
  },
  callBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textWhite,
  },
  lastContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastContactTime: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  lastContactNote: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: FontSize.base * 1.5,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  outcomeCell: {
    width: '47.5%',
    minHeight: verticalScale(80),
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  outcomeIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
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

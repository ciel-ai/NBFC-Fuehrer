import React, { useEffect, useState } from 'react';
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
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { InfoBanner } from '@/src/features/agent/components/InfoBanner';
import { Button } from '@/src/shared/components/common/Button';
import { useServices } from '@/src/core/services/ServiceProvider';

type Recipient = 'senior' | 'legal';

interface RecipientOption {
  id: Recipient;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const RECIPIENTS: RecipientOption[] = [
  {
    id: 'senior',
    title: 'Senior recovery officer',
    subtitle: 'Field escalation · in-person follow-up',
    icon: 'person',
  },
  {
    id: 'legal',
    title: 'Legal team',
    subtitle: 'Demand notice · sec. 138 / 13(2) SARFAESI',
    icon: 'document-text',
  },
];

const MOCK_ACCOUNT = {
  name: 'Lakshmi V.',
  loanId: 'LOS-CD-19847',
  outstanding: '₹74,500',
  daysOverdue: 38,
  lastEmi: '08 April 2026',
  contactAttempts: 6,
} as const;

export default function EscalationScreen() {
  const insets = useSafeAreaInsets();
  const [recipient, setRecipient] = useState<Recipient>('senior');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Android hardware back should close the confirm modal, not the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showConfirm) {
        setShowConfirm(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [showConfirm]);

  const onSubmit = () => {
    if (notes.trim().length < 10) {
      Alert.alert(
        'Add escalation notes',
        'Please add at least a short note (10+ characters) describing why this is being escalated.',
      );
      return;
    }
    setShowConfirm(true);
  };

  const { agentService } = useServices();

  const handleConfirm = async () => {
    setShowConfirm(false);
    try {
      const res = await agentService.escalateCase(MOCK_ACCOUNT.loanId, recipient, notes.trim());
      Alert.alert('Escalation submitted', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Escalation failed', 'Could not submit the escalation. Please try again.');
    }
  };

  const recipientTitle = RECIPIENTS.find((r) => r.id === recipient)?.title ?? '';

  return (
    <View style={styles.container}>
      <AppHeader title="Escalate account" subtitle={MOCK_ACCOUNT.loanId} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Alert */}
            <InfoBanner
              tone="error"
              title="NPA risk"
              message="This account is 30+ days overdue and is at risk of being classified as NPA. Escalating will trigger formal recovery action."
            />

            {/* Customer */}
            <View style={{ height: Spacing.md }} />
            <AgentSection title="Account">
              <ReviewDetailRow label="Customer" value={MOCK_ACCOUNT.name} />
              <ReviewDetailRow label="Loan ID" value={MOCK_ACCOUNT.loanId} />
              <ReviewDetailRow
                label="Outstanding"
                value={MOCK_ACCOUNT.outstanding}
                valueColor={Colors.error}
              />
              <ReviewDetailRow
                label="Days overdue"
                value={`${MOCK_ACCOUNT.daysOverdue} days`}
                valueColor={Colors.error}
              />
              <ReviewDetailRow label="Last paid EMI" value={MOCK_ACCOUNT.lastEmi} />
              <ReviewDetailRow
                label="Contact attempts"
                value={`${MOCK_ACCOUNT.contactAttempts}`}
                divider={false}
              />
            </AgentSection>

            {/* Recipient */}
            <AgentSection title="Escalate to">
              <View style={styles.recList}>
                {RECIPIENTS.map((r) => {
                  const active = recipient === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setRecipient(r.id)}
                      style={[
                        styles.recCell,
                        active && styles.recCellActive,
                      ]}
                      accessibilityRole="radio"
                      accessibilityLabel={`${r.title}. ${r.subtitle}`}
                      accessibilityState={{ selected: active }}
                    >
                      <View
                        style={[
                          styles.recIcon,
                          { backgroundColor: active ? Colors.primary : Colors.primaryLight },
                        ]}
                      >
                        <Ionicons
                          name={r.icon}
                          size={scale(18)}
                          color={active ? Colors.textWhite : Colors.primary}
                        />
                      </View>
                      <View style={styles.recInfo}>
                        <Text style={styles.recTitle}>{r.title}</Text>
                        <Text style={styles.recSub}>{r.subtitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          active && styles.radioOuterActive,
                        ]}
                      >
                        {active && <View style={styles.radioInner} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </AgentSection>

            {/* Notes */}
            <AgentSection title="Escalation notes">
              <TextInput
                style={styles.textArea}
                placeholder="Explain why this needs escalation (attempts made, customer response, etc.)"
                placeholderTextColor={Colors.textDisabled}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                accessibilityLabel="Escalation notes"
              />
              <Text style={styles.textAreaHint}>{notes.length} / 600 characters</Text>
            </AgentSection>

            <Button title="Submit escalation" onPress={onSubmit} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Confirm escalation modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowConfirm(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowConfirm(false)}
          accessibilityLabel="Dismiss confirmation"
        />
        <View style={styles.modalSheet} accessibilityRole="alert">
          <View style={styles.modalIconWrap}>
            <Ionicons name="warning" size={scale(28)} color={Colors.error} />
          </View>
          <Text style={styles.modalTitle}>Confirm escalation</Text>
          <Text style={styles.modalBody}>
            <Text style={styles.modalBold}>{MOCK_ACCOUNT.name}</Text> will be forwarded to{' '}
            <Text style={styles.modalBold}>{recipientTitle}</Text>. This triggers formal recovery
            action and cannot be reversed from this screen.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              onPress={() => setShowConfirm(false)}
              style={[styles.modalBtn, styles.modalBtnCancel]}
              accessibilityRole="button"
              accessibilityLabel="Cancel escalation"
            >
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[styles.modalBtn, styles.modalBtnConfirm]}
              accessibilityRole="button"
              accessibilityLabel="Confirm and submit escalation"
            >
              <Text style={styles.modalBtnConfirmText}>Confirm escalation</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  recList: {
    gap: Spacing.sm,
  },
  recCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minHeight: verticalScale(64),
  },
  recCellActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  recIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  recInfo: { flex: 1 },
  recTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  recSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: Colors.primary,
  },
  textArea: {
    minHeight: verticalScale(120),
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  textAreaHint: {
    ...Typography.tiny,
    color: Colors.textDisabled,
    marginTop: 4,
    textAlign: 'right',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    top: '25%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalIconWrap: {
    alignSelf: 'center',
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.base * 1.5,
  },
  modalBold: {
    fontFamily: FontFamily.semiBold,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    minHeight: verticalScale(44),
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  modalBtnCancel: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.error,
  },
  modalBtnCancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  modalBtnConfirmText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textWhite,
  },
});

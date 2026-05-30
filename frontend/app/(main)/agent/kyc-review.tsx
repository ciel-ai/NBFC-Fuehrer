import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { ScoreBar } from '@/src/features/agent/components/ScoreBar';
import { StatusBadge } from '@/src/features/agent/components/StatusBadge';
import {
  ActionButtonRow,
  ActionItem,
} from '@/src/features/agent/components/ActionButtonRow';
import { ImageViewerModal } from '@/src/features/agent/components/ImageViewerModal';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { AgentReviewOutcome } from '@/src/entities/agent';

interface DocRow {
  id: string;
  label: string;
  detail: string;
  tone: Parameters<typeof StatusBadge>[0]['tone'];
  status: string;
  imageUri?: string;
}

const MOCK_KYC_IMAGES = {
  aadhaar: 'https://placehold.co/600x400/EBF2FF/1A56DB/png?text=Aadhaar+Card',
  pan: 'https://placehold.co/600x400/FEF3C7/D97706/png?text=PAN+Card',
  bank: 'https://placehold.co/600x400/D1FAE5/10B981/png?text=Bank+Statement',
  selfie: 'https://placehold.co/400x600/EDE9FE/7C3AED/png?text=Live+Selfie',
} as const;

const MOCK_APPLICANT = {
  name: 'Priya S. Iyer',
  appId: 'LOS-AP-20583',
  loanType: 'Consumer Durable · ₹85,000',
  submittedOn: '20 May 2026',
  phone: '+91 98XX XXX 412',
} as const;

const DOC_ROWS: DocRow[] = [
  { id: 'aadhaar', label: 'Aadhaar Card', detail: 'XXXX-XXXX-4521', tone: 'approved', status: 'Verified', imageUri: MOCK_KYC_IMAGES.aadhaar },
  { id: 'pan', label: 'PAN Card', detail: 'AXXPP1234L', tone: 'approved', status: 'Verified', imageUri: MOCK_KYC_IMAGES.pan },
  { id: 'bank', label: 'Bank statement', detail: '6 months · HDFC', tone: 'review', status: 'In review', imageUri: MOCK_KYC_IMAGES.bank },
  { id: 'name', label: 'Name similarity', detail: 'Aadhaar vs PAN', tone: 'pending', status: '94% match' },
];

export default function KycReviewScreen() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [capturedSelfieUri, setCapturedSelfieUri] = useState<string | null>(null);

  const { agentService } = useServices();

  const decide = async (outcome: AgentReviewOutcome) => {
    try {
      const res = await agentService.submitReviewDecision({
        queue: 'kyc',
        applicationId: MOCK_APPLICANT.appId,
        outcome,
        remarks: notes.trim() || undefined,
      });
      Alert.alert('KYC review', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Action failed', 'Could not record the decision. Please try again.');
    }
  };

  const handleRecaptureSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access to re-capture the applicant selfie.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setCapturedSelfieUri(result.assets[0].uri);
    }
  };

  // design.md canonical 3-up order: Request Docs | Reject | Approve
  const actions: ActionItem[] = [
    { label: 'Request docs', tone: 'neutral', icon: 'document-attach', onPress: () => decide('request_docs') },
    { label: 'Reject', tone: 'reject', icon: 'close', onPress: () => decide('reject') },
    { label: 'Approve', tone: 'approve', icon: 'checkmark', onPress: () => decide('approve') },
  ];

  const selfieUri = capturedSelfieUri ?? MOCK_KYC_IMAGES.selfie;

  return (
    <View style={styles.container}>
      <AppHeader title="KYC Review" subtitle={MOCK_APPLICANT.appId} />
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
            {/* Applicant */}
            <AgentSection title="Applicant">
              <ReviewDetailRow label="Name" value={MOCK_APPLICANT.name} />
              <ReviewDetailRow label="Application ID" value={MOCK_APPLICANT.appId} />
              <ReviewDetailRow label="Loan" value={MOCK_APPLICANT.loanType} />
              <ReviewDetailRow label="Phone" value={MOCK_APPLICANT.phone} />
              <ReviewDetailRow label="Submitted" value={MOCK_APPLICANT.submittedOn} divider={false} />
            </AgentSection>

            {/* Face match */}
            <AgentSection title="Face match score">
              <Text style={styles.faceCaption}>Aadhaar photo vs live selfie</Text>
              <ScoreBar
                label="Match confidence"
                value={92}
                goodThreshold={85}
                warnThreshold={70}
              />
              <View style={styles.facePairs}>
                <Pressable
                  style={styles.facePlaceholder}
                  onPress={() => setViewerUri(MOCK_KYC_IMAGES.aadhaar)}
                  accessibilityRole="button"
                  accessibilityLabel="View Aadhaar photo"
                >
                  <Ionicons name="image-outline" size={scale(28)} color={Colors.textSecondary} />
                  <Text style={styles.faceLabel}>Aadhaar</Text>
                </Pressable>
                <Pressable
                  style={styles.facePlaceholder}
                  onPress={() => setViewerUri(selfieUri)}
                  accessibilityRole="button"
                  accessibilityLabel="View applicant selfie"
                >
                  <Ionicons name="image-outline" size={scale(28)} color={Colors.textSecondary} />
                  <Text style={styles.faceLabel}>
                    {capturedSelfieUri ? 'Selfie · Re-captured' : 'Selfie'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.recaptureBtn}
                onPress={handleRecaptureSelfie}
                accessibilityRole="button"
                accessibilityLabel="Re-capture applicant selfie with camera"
              >
                <Ionicons name="camera-outline" size={scale(18)} color={Colors.primary} />
                <Text style={styles.recaptureLabel}>Re-capture selfie</Text>
              </Pressable>
            </AgentSection>

            {/* Document checks */}
            <AgentSection title="Document checks">
              {DOC_ROWS.map((d, idx) => (
                <View
                  key={d.id}
                  style={[styles.docRow, idx < DOC_ROWS.length - 1 && styles.docDivider]}
                >
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel}>{d.label}</Text>
                    <Text style={styles.docDetail}>{d.detail}</Text>
                  </View>
                  {d.imageUri ? (
                    <Pressable
                      onPress={() => setViewerUri(d.imageUri!)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${d.label}`}
                      style={styles.viewIconBtn}
                    >
                      <Ionicons name="eye-outline" size={scale(20)} color={Colors.primary} />
                    </Pressable>
                  ) : null}
                  <StatusBadge tone={d.tone} label={d.status} />
                </View>
              ))}
            </AgentSection>

            {/* Notes */}
            <AgentSection title="Agent notes">
              <TextInput
                style={styles.textArea}
                placeholder="Add any observations about identity, mismatches, or document quality…"
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

      <ImageViewerModal
        visible={viewerUri !== null}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
      />
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
  faceCaption: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  facePairs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  facePlaceholder: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  faceLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  recaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  recaptureLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  docDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  docInfo: { flex: 1 },
  docLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  docDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewIconBtn: {
    padding: Spacing.xs,
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

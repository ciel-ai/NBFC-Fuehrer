import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
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
import { ProgressChips } from '@/src/features/agent/components/ProgressChips';
import { DatePickerField } from '@/src/features/agent/components/DatePickerField';
import { ImageViewerModal } from '@/src/features/agent/components/ImageViewerModal';
import { Button } from '@/src/shared/components/common/Button';
import { useServices } from '@/src/core/services/ServiceProvider';

const STEPS = [
  { label: 'Identity' },
  { label: 'Gold check' },
  { label: 'Photos' },
  { label: 'Confirm' },
];

const MOCK_GOLD = {
  applicant: {
    name: 'Sundaram K.',
    appId: 'LOS-GL-20724',
    branch: 'Bengaluru · Indiranagar',
  },
  details: {
    items: '3 chains, 2 bangles',
    weightGross: '38.5 g',
    weightNet: '34.2 g',
    purity: '22 K (91.6%)',
    marketRate: '₹6,180 / g (today)',
    estimatedValue: '₹2,11,476',
    ltv: '75%',
    eligibleLoan: '₹1,58,607',
  },
} as const;

const PHOTO_SLOTS = ['Front', 'Back', 'Weight scale'] as const;

export default function GoldAppraisalScreen() {
  const insets = useSafeAreaInsets();
  const [stepIdx, setStepIdx] = useState(1);
  const [photoUris, setPhotoUris] = useState<(string | null)[]>([null, null, null]);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [valuationDate, setValuationDate] = useState<Date | null>(new Date());

  const { agentService } = useServices();

  const onConfirm = async () => {
    try {
      const res = await agentService.confirmGoldAppraisal(MOCK_GOLD.applicant.appId);
      Alert.alert('Appraisal confirmed', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Action failed', 'Could not confirm the appraisal. Please try again.');
    }
  };

  const handleCapturePhoto = async (slotIdx: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access to capture gold photos.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUris((prev) => {
        const next = [...prev];
        next[slotIdx] = result.assets[0].uri;
        return next;
      });
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Gold Appraisal" subtitle={MOCK_GOLD.applicant.appId} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {/* Progress chips fixed below header */}
        <View style={styles.progressBar}>
          <ProgressChips steps={STEPS} activeIndex={stepIdx} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Applicant */}
          <AgentSection title="Applicant">
            <ReviewDetailRow label="Name" value={MOCK_GOLD.applicant.name} />
            <ReviewDetailRow label="Branch" value={MOCK_GOLD.applicant.branch} divider={false} />
          </AgentSection>

          {/* Gold details */}
          <AgentSection title="Gold details">
            <View style={styles.dateField}>
              <DatePickerField
                label="VALUATION DATE"
                value={valuationDate}
                onChange={setValuationDate}
                maximumDate={new Date()}
              />
            </View>
            <ReviewDetailRow label="Items" value={MOCK_GOLD.details.items} />
            <ReviewDetailRow label="Gross weight" value={MOCK_GOLD.details.weightGross} />
            <ReviewDetailRow label="Net weight" value={MOCK_GOLD.details.weightNet} />
            <ReviewDetailRow label="Purity" value={MOCK_GOLD.details.purity} />
            <ReviewDetailRow label="Market rate" value={MOCK_GOLD.details.marketRate} />
            <ReviewDetailRow
              label="Estimated value"
              value={MOCK_GOLD.details.estimatedValue}
              valueColor={Colors.goldDark}
            />
            <ReviewDetailRow label="LTV" value={MOCK_GOLD.details.ltv} />
            <ReviewDetailRow
              label="Eligible loan"
              value={MOCK_GOLD.details.eligibleLoan}
              valueColor={Colors.success}
              divider={false}
            />
          </AgentSection>

          {/* Photos */}
          <AgentSection title="Photo evidence (3 required)">
            <View style={styles.photoGrid}>
              {PHOTO_SLOTS.map((slotLabel, i) => {
                const uri = photoUris[i];
                return (
                  <Pressable
                    key={slotLabel}
                    style={styles.photoCell}
                    onPress={() => handleCapturePhoto(i)}
                    android_ripple={{ color: `${Colors.primary}15` }}
                    accessibilityRole="button"
                    accessibilityLabel={uri ? `Retake ${slotLabel} photo` : `Capture ${slotLabel} photo`}
                  >
                    {uri ? (
                      <>
                        <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                        <Pressable
                          style={styles.photoViewBtn}
                          onPress={() => setViewerUri(uri)}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={`View ${slotLabel} photo`}
                        >
                          <Ionicons name="eye-outline" size={scale(16)} color={Colors.textWhite} />
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={scale(24)} color={Colors.primary} />
                        <Text style={styles.photoLabel}>{slotLabel}</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.photoHint}>
              Capture front, back, and weight scale reading. Tap a captured photo to retake.
            </Text>
          </AgentSection>

          {/* Step controls */}
          <View style={styles.stepRow}>
            <Pressable
              style={[styles.stepBtn, stepIdx === 0 && styles.stepBtnDisabled]}
              disabled={stepIdx === 0}
              onPress={() => setStepIdx((i) => Math.max(0, i - 1))}
              accessibilityRole="button"
              accessibilityLabel="Go to previous step"
            >
              <Ionicons
                name="chevron-back"
                size={scale(16)}
                color={stepIdx === 0 ? Colors.textDisabled : Colors.primary}
              />
              <Text
                style={[
                  styles.stepBtnText,
                  stepIdx === 0 && styles.stepBtnTextDisabled,
                ]}
              >
                Previous
              </Text>
            </Pressable>
            {stepIdx < STEPS.length - 1 ? (
              <Pressable
                style={[styles.stepBtn, styles.stepBtnPrimary]}
                onPress={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                accessibilityRole="button"
                accessibilityLabel="Go to next step"
              >
                <Text style={[styles.stepBtnText, styles.stepBtnTextPrimary]}>Next step</Text>
                <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textWhite} />
              </Pressable>
            ) : null}
          </View>

          {stepIdx === STEPS.length - 1 ? (
            <View style={styles.confirmWrap}>
              <Button title="Confirm appraisal" onPress={onConfirm} />
            </View>
          ) : null}
        </ScrollView>
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
  progressBar: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  dateField: {
    marginBottom: Spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  photoCell: {
    flex: 1,
    minWidth: scale(80),
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  photoViewBtn: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: {
    ...Typography.caption,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },
  photoHint: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepBtn: {
    flex: 1,
    minHeight: verticalScale(44),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 4,
  },
  stepBtnDisabled: {
    borderColor: Colors.border,
    opacity: 0.6,
  },
  stepBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  stepBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  stepBtnTextPrimary: {
    color: Colors.textWhite,
  },
  stepBtnTextDisabled: {
    color: Colors.textDisabled,
  },
  confirmWrap: {
    marginTop: Spacing.md,
  },
});

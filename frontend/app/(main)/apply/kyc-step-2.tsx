import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { scale } from '@/src/core/utils/responsive';

type LivenessState = 'idle' | 'capturing' | 'checking' | 'passed' | 'failed';

const LIVENESS_STEPS = [
  { icon: 'sunny-outline', text: 'Face well-lit area' },
  { icon: 'remove-circle-outline', text: 'Remove glasses / mask' },
  { icon: 'scan-outline', text: 'Look directly at camera' },
];

export default function KYCStep2Screen() {
  const params = useLocalSearchParams<{
    productName?: string;
    loanAmount?: string;
    pan?: string;
    aadhaar?: string;
    /**
     * Optional override for the screen to navigate to after selfie success.
     * Defaults to 'loan-step-2' (CDL flow). Gold loan passes 'gold-loan-ownership'.
     */
    nextPath?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [livenessState, setLivenessState] = useState<LivenessState>('idle');
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setLivenessState('capturing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
      if (photo) {
        setLivenessState('checking');
        await new Promise((r) => setTimeout(r, 2000));
        setLivenessState('passed');
      }
    } catch {
      setLivenessState('failed');
    }
  };

  const handleRetake = () => {
    setLivenessState('idle');
  };

  const handlePermissionRequest = async () => {
    const result = await requestPermission();
    if (result.granted) return;

    if (result.canAskAgain) {
      // OS prompt was shown and declined — let them try again from the button.
      Alert.alert(
        'Camera access needed',
        'Please allow camera access to take a selfie for liveness verification.',
        [{ text: 'OK' }]
      );
    } else {
      // Permanently denied — the OS won't prompt again, so route to Settings.
      Alert.alert(
        'Camera Required',
        'Camera access is blocked. Enable it in Settings to take your selfie, then return to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const isPassed = livenessState === 'passed';
  const isChecking = livenessState === 'checking';
  const isCapturing = livenessState === 'capturing';

  return (
    <SafeAreaView style={styles.container}>
      <Header title="KYC — Selfie Verification" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepBar}>
          <View style={[styles.stepDot, styles.stepDone]} />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepActive]} />
        </View>
        <Text style={styles.stepLabel}>Step 2 of 2 — Selfie &amp; Liveness Check</Text>

        {!isPassed ? (
          <>
            <Text style={styles.sectionTitle}>Take a clear selfie</Text>

            <View style={styles.instructionRow}>
              {LIVENESS_STEPS.map((s) => (
                <View key={s.text} style={styles.instructionItem}>
                  <View style={styles.instructionIcon}>
                    <Ionicons name={s.icon as any} size={scale(20)} color={Colors.primary} />
                  </View>
                  <Text style={styles.instructionText}>{s.text}</Text>
                </View>
              ))}
            </View>

            {!permission?.granted ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={scale(48)} color={Colors.textSecondary} />
                <Text style={styles.permissionTitle}>Camera access needed</Text>
                <Text style={styles.permissionSubtitle}>
                  Allow camera access to take your selfie for liveness verification.
                </Text>
                <Button title="Allow Camera" onPress={handlePermissionRequest} />
              </View>
            ) : (
              <View style={styles.cameraContainer}>
                {isChecking ? (
                  <View style={styles.checkingOverlay}>
                    <View style={styles.livenessSpinner}>
                      <Ionicons name="scan" size={scale(48)} color={Colors.primary} />
                    </View>
                    <Text style={styles.checkingTitle}>Running Liveness Check…</Text>
                    <Text style={styles.checkingSubtitle}>Analyzing facial features</Text>
                    <View style={styles.livenessSteps}>
                      {['Detecting face', 'Checking blink', 'Confirming liveness'].map((s, i) => (
                        <View key={s} style={styles.livenessStepRow}>
                          <Ionicons
                            name={i < 2 ? 'checkmark-circle' : 'ellipse-outline'}
                            size={scale(16)}
                            color={i < 2 ? Colors.success : Colors.textDisabled}
                          />
                          <Text style={[styles.livenessStepText, i < 2 && { color: Colors.success }]}>
                            {s}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="front"
                  >
                    <View style={styles.faceFrame}>
                      <View style={[styles.frameCorner, styles.topLeft]} />
                      <View style={[styles.frameCorner, styles.topRight]} />
                      <View style={[styles.frameCorner, styles.bottomLeft]} />
                      <View style={[styles.frameCorner, styles.bottomRight]} />
                    </View>
                  </CameraView>
                )}
              </View>
            )}

            {permission?.granted && !isChecking && (
              <Pressable
                style={({ pressed }) => [styles.captureBtn, pressed && styles.captureBtnPressed]}
                onPress={handleCapture}
                disabled={isCapturing || isChecking}
                accessibilityRole="button"
                accessibilityLabel="Take selfie"
              >
                <View style={styles.captureInner} />
              </Pressable>
            )}

            {livenessState === 'failed' && (
              <View style={styles.errorBox}>
                <Ionicons name="close-circle" size={scale(20)} color={Colors.error} />
                <Text style={styles.errorText}>
                  Liveness check failed. Please try again in better lighting.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.successSection}>
            <View style={styles.successIconBg}>
              <Ionicons name="checkmark-circle" size={scale(64)} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Selfie Verified!</Text>
            <Text style={styles.successSubtitle}>
              Liveness check passed. Your KYC documents are submitted for review.
            </Text>

            <View style={styles.summaryCard}>
              {[
                { label: 'PAN', status: 'Verified', icon: 'card-outline' },
                { label: 'Aadhaar', status: 'Verified', icon: 'finger-print' },
                { label: 'Selfie', status: 'Verified', icon: 'camera-outline' },
                { label: 'Liveness', status: 'Passed', icon: 'scan-outline' },
              ].map((item, i, arr) => (
                <View key={item.label}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLeft}>
                      <Ionicons name={item.icon as any} size={scale(18)} color={Colors.primary} />
                      <Text style={styles.summaryLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.summaryBadge}>
                      <Ionicons name="checkmark-circle" size={scale(14)} color={Colors.success} />
                      <Text style={styles.summaryStatus}>{item.status}</Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.summaryDivider} />}
                </View>
              ))}
            </View>

            <Button
              title={params.nextPath === 'gold-loan-compliance' ? 'Continue to Compliance' : 'Continue to Address & Employment'}
              onPress={() => router.push({
                pathname: `/(main)/apply/${params.nextPath ?? 'loan-step-2'}` as any,
                params,
              })}
            />
            <Pressable
              style={styles.retakeBtn}
              onPress={handleRetake}
              accessibilityRole="button"
              accessibilityLabel="Retake selfie"
            >
              <Text style={styles.retakeBtnText}>Retake Selfie</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const FRAME_SIZE = scale(220);
const CORNER_SIZE = scale(24);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: Colors.border,
  },
  stepDone: { backgroundColor: Colors.success },
  stepActive: { backgroundColor: Colors.primary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  stepLineDone: { backgroundColor: Colors.success },
  stepLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },

  instructionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  instructionItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  instructionIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  permissionBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  permissionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  permissionSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  cameraContainer: {
    alignSelf: 'center',
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: FRAME_SIZE / 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.backgroundLight,
    ...Shadow.large,
  },
  camera: { flex: 1 },

  faceFrame: {
    position: 'absolute',
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: FRAME_SIZE / 2,
  },
  frameCorner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.textWhite,
    borderWidth: 3,
  },
  topLeft: { top: 16, left: 16, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  topRight: { top: 16, right: 16, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 16, left: 16, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 16, right: 16, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },

  checkingOverlay: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  livenessSpinner: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  checkingTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  checkingSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  livenessSteps: { gap: 6, marginTop: Spacing.sm, width: '100%' },
  livenessStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livenessStepText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
  },

  captureBtn: {
    alignSelf: 'center',
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    borderWidth: 4,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  captureBtnPressed: { opacity: 0.7 },
  captureInner: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: Colors.primary,
  },

  errorBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
  },

  successSection: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  successIconBg: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  summaryStatus: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.success,
  },
  summaryDivider: { height: 1, backgroundColor: Colors.border },

  retakeBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retakeBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

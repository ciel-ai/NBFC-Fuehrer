import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';

const APP_NAME = 'Fuehrer';

interface PermissionItem {
  key: 'camera' | 'photos';
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Plain-language reason shown in the branded priming card. */
  rationale: string;
}

// One branded priming card per permission. IMPORTANT: every permission here is
// OPTIONAL — the user can tap "Not now" and still reach the rest of the app. The
// real OS prompt is fired from "Continue", and each permission is also
// re-requested in-context the first time the related feature is used (KYC capture,
// document upload), where an "Open Settings" fallback is offered if it was denied.
// Nothing here blocks onboarding, per Apple Guideline 5.1.1.
const PERMISSIONS: PermissionItem[] = [
  {
    key: 'camera',
    name: 'Camera',
    icon: 'camera-outline',
    rationale:
      `${APP_NAME} uses your camera to capture identity documents and your ` +
      `selfie during KYC verification.`,
  },
  {
    key: 'photos',
    name: 'Photos',
    icon: 'images-outline',
    rationale:
      `${APP_NAME} needs access to your photos so you can upload income proof ` +
      `and identity documents.`,
  },
];

export default function AppPermissionsScreen() {
  // Index of the priming card currently shown.
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const item = index < PERMISSIONS.length ? PERMISSIONS[index] : null;

  // Once every permission has been offered, continue to login. There is no
  // client-side role choice — the role is resolved from the number at OTP time.
  useEffect(() => {
    if (index >= PERMISSIONS.length) {
      router.replace('/(auth)/login');
    }
  }, [index]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  /**
   * Fire the real OS permission request for one key. We intentionally ignore the
   * result: whether granted or denied, the user always proceeds. The feature
   * screens handle the denied case gracefully when they actually need access.
   */
  const requestFromOS = useCallback(async (key: PermissionItem['key']): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      if (key === 'camera') {
        const CameraModule = await import('expo-camera');
        await CameraModule.Camera.requestCameraPermissionsAsync();
      } else if (key === 'photos') {
        const ImagePicker = await import('expo-image-picker');
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
    } catch {
      // Never block onboarding on a permission error.
    }
  }, []);

  /** "Continue" → fire the real OS request, then advance regardless of outcome. */
  const handleContinue = useCallback(async () => {
    if (!item || busy) return;
    setBusy(true);
    await requestFromOS(item.key);
    setBusy(false);
    advance();
  }, [item, busy, requestFromOS, advance]);

  /** "Not now" → skip this permission; it can be enabled later in-context. */
  const handleSkip = useCallback(() => {
    if (busy) return;
    advance();
  }, [busy, advance]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Branded backdrop behind the priming card. */}
      <View style={styles.brandBg}>
        <View style={styles.brandLogoCircle}>
          <Ionicons name="shield-checkmark" size={42} color={Colors.primary} />
        </View>
        <Text style={styles.brandName}>{APP_NAME}</Text>
        <Text style={styles.brandTagline}>NBFC</Text>
        <Text style={styles.brandHint}>Setting up a few permissions…</Text>
      </View>

      {/* Priming card rendered in-tree (not a native Modal) so the
          router.replace to /login fires cleanly without racing a Modal
          dismiss transition. */}
      {item !== null && (
        <View style={[StyleSheet.absoluteFill, styles.cardOverlay]}>
          <View style={styles.card}>
            {/* Step indicator */}
            <Text style={styles.stepText}>
              {Math.min(index + 1, PERMISSIONS.length)} of {PERMISSIONS.length}
            </Text>

            <View style={styles.cardIconWrap}>
              <Ionicons
                name={item?.icon ?? 'shield-checkmark-outline'}
                size={30}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.cardTitle}>{item?.name} access</Text>
            <Text style={styles.cardBody}>{item?.rationale}</Text>
            <Text style={styles.cardNote}>
              Optional — you can enable this anytime in Settings.
            </Text>

            {/* Primary: branded, NOT the system "Allow" button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinue}
              disabled={busy}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Continue and allow ${item?.name} access`}
            >
              {busy ? (
                <ActivityIndicator color={Colors.textWhite} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Secondary: skip without requesting */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={busy}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={`Skip ${item?.name} for now`}
            >
              <Text style={styles.secondaryButtonText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ---- Branded backdrop ----
  brandBg: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: Colors.primary,
    letterSpacing: 1,
  },
  brandTagline: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 4,
    marginTop: 2,
  },
  brandHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },

  // ---- Branded priming card (deliberately app-styled, not an OS dialog) ----
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadow.large,
  },
  stepText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    letterSpacing: 1,
    alignSelf: 'flex-end',
  },
  cardIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  cardBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.base * 1.45,
    marginBottom: Spacing.sm,
  },
  cardNote: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textWhite,
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  secondaryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
});

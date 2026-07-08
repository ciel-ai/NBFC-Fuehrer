import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { Header } from '@/src/shared/components/common/Header';

const SECURITY_SCORE = 75;

/**
 * Circular progress ring approximation without react-native-svg.
 * Per design.md rule 2 — uses 4-quadrant border colouring; each quadrant
 * represents 25%. Exact for multiples of 25; visually acceptable otherwise.
 */
function SecurityScoreRing({ value, max = 100 }: { value: number; max?: number }) {
  const size = scale(140);
  const strokeWidth = scale(10);
  const filledQuadrants = Math.round((value / max) * 4);
  const active = Colors.success;
  const track = Colors.border;

  const quadrantColor = (q: number) => (q < filledQuadrants ? active : track);

  return (
    <View style={[ringStyles.wrap, { width: size, height: size }]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderTopColor: quadrantColor(0),
          borderRightColor: quadrantColor(1),
          borderBottomColor: quadrantColor(2),
          borderLeftColor: quadrantColor(3),
          transform: [{ rotate: '-45deg' }],
        }}
      />
      <View style={ringStyles.center}>
        <Text style={ringStyles.scoreText}>{value}</Text>
        <Text style={ringStyles.scoreMax}>/ {max}</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.textPrimary,
  },
  scoreMax: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});

export default function SecurityPrivacyScreen() {
  const [fingerprintEnabled, setFingerprintEnabled] = useState(true);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [marketingComms, setMarketingComms] = useState(true);
  const [analyticsShare, setAnalyticsShare] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showCloseModal) {
        setShowCloseModal(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [showCloseModal]);

  const onChangeMpin = () => {
    Alert.alert('Change MPIN', 'You will be asked to verify your current MPIN before setting a new one.');
  };

  const onDownloadData = () => {
    Alert.alert('Download My Data', 'A copy of your data will be emailed within 72 hours.');
  };

  const onLogout = () => {
    Alert.alert('Log out', 'You will be signed out of this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => router.replace('/(public)') },
    ]);
  };

  const onCloseAccount = () => setShowCloseModal(true);

  const confirmCloseAccount = () => {
    setShowCloseModal(false);
    Alert.alert(
      'Account closure requested',
      'Your account closure request has been submitted. We will reach out within 7 business days.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Security & Privacy" showBack />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Security score */}
        <View style={styles.scoreCard}>
          <SecurityScoreRing value={SECURITY_SCORE} />
          <Text style={styles.scoreLabel}>Good Security Score</Text>
          <Text style={styles.scoreSubtitle}>
            Enable biometrics to reach Excellent
          </Text>
        </View>

        {/* Authentication */}
        <Text style={styles.sectionLabel}>Authentication</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="finger-print-outline"
            tone="blue"
            label="Fingerprint Login"
            subtitle="Use your fingerprint to unlock"
            value={fingerprintEnabled}
            onValueChange={setFingerprintEnabled}
          />
          <ToggleRow
            icon="scan-outline"
            tone="blue"
            label="Face ID"
            subtitle="Use Face ID to unlock"
            value={faceIdEnabled}
            onValueChange={setFaceIdEnabled}
          />
          <NavRow
            icon="key-outline"
            tone="blue"
            label="Change MPIN"
            subtitle="Last changed 3 months ago"
            onPress={onChangeMpin}
            isLast
          />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="megaphone-outline"
            tone="amber"
            label="Marketing Communications"
            subtitle="Receive offers via SMS and email"
            value={marketingComms}
            onValueChange={setMarketingComms}
          />
          <ToggleRow
            icon="analytics-outline"
            tone="amber"
            label="Share Data for Analytics"
            subtitle="Help us improve your experience"
            value={analyticsShare}
            onValueChange={setAnalyticsShare}
          />
          <NavRow
            icon="cloud-download-outline"
            tone="amber"
            label="Download My Data"
            subtitle="Get a copy of your account data"
            onPress={onDownloadData}
            isLast
          />
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionLabel, styles.dangerLabel]}>Danger Zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <DangerRow
            icon="log-out-outline"
            label="Log Out"
            subtitle="Sign out of this device"
            onPress={onLogout}
          />
          <DangerRow
            icon="trash-outline"
            label="Close Account"
            subtitle="Permanently delete your Fuehrer NBFC account"
            onPress={onCloseAccount}
            isLast
          />
        </View>
      </ScrollView>

      <Modal
        visible={showCloseModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCloseModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCloseModal(false)}
          accessibilityLabel="Dismiss confirmation"
        />
        <View style={styles.modalSheet} accessibilityRole="alert">
          <View style={styles.modalIconWrap}>
            <Ionicons name="warning" size={scale(28)} color={Colors.error} />
          </View>
          <Text style={styles.modalTitle}>Close your account?</Text>
          <Text style={styles.modalBody}>
            This will request permanent deletion of your Fuehrer NBFC account. Any active loans
            must be closed first. This action cannot be undone.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={() => setShowCloseModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Keep my account"
            >
              <Text style={styles.modalBtnCancelText}>Keep account</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnConfirm]}
              onPress={confirmCloseAccount}
              accessibilityRole="button"
              accessibilityLabel="Confirm account closure"
            >
              <Text style={styles.modalBtnConfirmText}>Close account</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

type Tone = 'blue' | 'amber' | 'green';
const TONE_MAP: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: Colors.primary, bg: Colors.primaryLight },
  amber: { fg: Colors.goldDark, bg: Colors.goldLight },
  green: { fg: Colors.success, bg: Colors.successLight },
};

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}

function ToggleRow({ icon, tone, label, subtitle, value, onValueChange, isLast }: ToggleRowProps) {
  const t = TONE_MAP[tone];
  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={scale(18)} color={t.fg} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.surface}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

interface NavRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
}

function NavRow({ icon, tone, label, subtitle, onPress, isLast }: NavRowProps) {
  const t = TONE_MAP[tone];
  return (
    <Pressable
      style={[styles.row, !isLast && styles.rowDivider]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.primary}10` }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}, ${subtitle}` : label}
    >
      <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={scale(18)} color={t.fg} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={scale(18)} color={Colors.textDisabled} />
    </Pressable>
  );
}

interface DangerRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}

function DangerRow({ icon, label, subtitle, onPress, isLast }: DangerRowProps) {
  return (
    <Pressable
      style={[styles.row, !isLast && styles.rowDivider]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.error}15` }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconBox, { backgroundColor: Colors.errorLight }]}>
        <Ionicons name={icon} size={scale(18)} color={Colors.error} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: Colors.error }]}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scale(18)} color={Colors.error} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },

  content: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  scoreLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  scoreSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dangerLabel: {
    color: Colors.error,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dangerCard: {
    borderColor: Colors.errorLight,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    gap: Spacing.md,
    minHeight: verticalScale(56),
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
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
    borderRadius: BorderRadius.xl,
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

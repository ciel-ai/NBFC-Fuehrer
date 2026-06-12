import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
];

export interface MpinScaffoldHandle {
  /** Shake the dots, flash them red, then clear the entry. */
  shakeAndClear: () => void;
  /** Clear the entry silently. */
  clear: () => void;
}

interface MpinScaffoldProps {
  title: string;
  subtitle: string;
  pinLength: number;
  /** Fired when the user has entered `pinLength` digits. */
  onComplete: (pin: string) => void;
  /** Message shown under the dots while in the error state. */
  errorText?: string | null;
  /** Blocks keypad input (e.g. while verifying). */
  disabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  /** Content of the footer bar. Omit to hide the footer. */
  footer?: React.ReactNode;
}

/**
 * Shared visual scaffold for every MPIN screen (enter / set / confirm):
 * a clean white screen with a centred brand + title + dots, a numeric keypad,
 * and a divided footer. Pin entry, the shake animation, and the error flash are
 * owned here; screens supply copy and an `onComplete` handler.
 */
export const MpinScaffold = forwardRef<MpinScaffoldHandle, MpinScaffoldProps>(
  function MpinScaffold(
    { title, subtitle, pinLength, onComplete, errorText, disabled, showBack, onBack, footer },
    ref,
  ) {
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const translateX = useSharedValue(0);
    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const triggerShake = useCallback(() => {
      translateX.value = withSequence(
        withTiming(10, { duration: 40 }),
        withTiming(-10, { duration: 40 }),
        withTiming(10, { duration: 40 }),
        withTiming(-10, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    }, [translateX]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          setPin('');
          setError(false);
        },
        shakeAndClear: () => {
          triggerShake();
          setError(true);
          setTimeout(() => setPin(''), 400);
        },
      }),
      [triggerShake],
    );

    const handleKey = useCallback(
      (key: string) => {
        if (disabled) return;
        if (key === 'backspace') {
          setPin((p) => p.slice(0, -1));
          setError(false);
          return;
        }
        if (pin.length >= pinLength) return;

        const next = pin + key;
        setPin(next);
        setError(false);
        if (next.length === pinLength) onComplete(next);
      },
      [pin, disabled, pinLength, onComplete],
    );

    return (
      <View style={styles.container}>
        <StatusBar style="dark" />

        {/* Top bar — clears the status bar and holds the optional back button */}
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          {showBack && (
            <Pressable
              onPress={() => onBack?.()}
              style={styles.backBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={scale(24)} color={Colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Body — one centred group so the layout stays balanced on every size */}
        <View style={styles.body}>
          <View style={styles.topSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={scale(32)} color={Colors.primary} />
            </View>
            <Text style={styles.brand}>Fuehrer NBFC</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <Animated.View style={[styles.dotsRow, shakeStyle]}>
              {Array.from({ length: pinLength }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < pin.length && styles.dotFilled,
                    error && i < pin.length && styles.dotError,
                  ]}
                />
              ))}
            </Animated.View>

            {error && errorText ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorText}
              </Text>
            ) : null}
          </View>

          <View style={styles.keypad}>
            {KEYPAD.map((row, ri) => (
              <View key={ri} style={styles.keypadRow}>
                {row.map((key, ki) => {
                  if (key === '') {
                    return <View key={ki} style={styles.keyPlaceholder} />;
                  }
                  if (key === 'backspace') {
                    return (
                      <Pressable
                        key={ki}
                        style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                        onPress={() => handleKey('backspace')}
                        accessibilityLabel="Delete"
                        accessibilityRole="button"
                      >
                        <Ionicons name="backspace-outline" size={22} color={Colors.textPrimary} />
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable
                      key={ki}
                      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                      onPress={() => handleKey(key)}
                      accessibilityLabel={key}
                      accessibilityRole="button"
                      disabled={disabled}
                    >
                      <Text style={styles.keyText}>{key}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            {footer}
          </View>
        ) : null}
      </View>
    );
  },
);

const DOT_SIZE = scale(15);
const KEY_SIZE = scale(66);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Top bar
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    justifyContent: 'flex-end',
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(20),
  },

  // Body
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: verticalScale(20),
    paddingHorizontal: Spacing.xl,
    paddingVertical: verticalScale(8),
  },

  topSection: {
    alignItems: 'center',
  },
  logoCircle: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
  },
  brand: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: verticalScale(16),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(18),
  },
  dotsRow: {
    flexDirection: 'row',
    gap: scale(20),
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotError: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginTop: verticalScale(10),
  },

  // Keypad
  keypad: {
    gap: verticalScale(9),
  },
  keypadRow: {
    flexDirection: 'row',
    gap: scale(16),
    justifyContent: 'center',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  keyPlaceholder: {
    width: KEY_SIZE,
    height: KEY_SIZE,
  },
  keyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
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
import { Header } from '@/src/shared/components/common/Header';
import { useAuthStore } from '@/src/store/authStore';
import { MPIN_LENGTH } from '@/src/core/utils/constants';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
];

export default function ConfirmMpinScreen() {
  const { mpin: originalMpin } = useLocalSearchParams<{ mpin: string }>();
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setMpin = useAuthStore((s) => s.setMpin);

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
      withTiming(0, { duration: 40 })
    );
  }, [translateX]);

  const handleKey = useCallback(
    async (key: string) => {
      if (isLoading) return;
      if (key === 'backspace') {
        setPin((prev) => prev.slice(0, -1));
        setHasError(false);
        return;
      }
      if (pin.length >= MPIN_LENGTH) return;

      const next = pin + key;
      setPin(next);

      if (next.length === MPIN_LENGTH) {
        if (next !== originalMpin) {
          triggerShake();
          setHasError(true);
          setTimeout(() => setPin(''), 400);
          return;
        }

        setIsLoading(true);
        try {
          await setMpin(next);
          router.replace('/(auth)/complete-profile');
        } catch {
          Alert.alert('Error', 'Failed to save MPIN. Please try again.');
          setPin('');
        } finally {
          setIsLoading(false);
        }
      }
    },
    [pin, originalMpin, isLoading, setMpin, triggerShake]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header showBack />

      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Confirm your MPIN</Text>
          <Text style={styles.subtitle}>
            Re-enter the {MPIN_LENGTH}-digit PIN to confirm
          </Text>

          <Animated.View style={[styles.dotsRow, shakeStyle]}>
            {Array.from({ length: MPIN_LENGTH }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  hasError && i < pin.length && styles.dotError,
                ]}
              />
            ))}
          </Animated.View>

          {hasError && (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              PINs do not match. Please try again.
            </Text>
          )}
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
                    disabled={isLoading}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.success} />
          <Text style={styles.infoText}>
            Your MPIN is stored securely on your device
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const DOT_SIZE = 14;
const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  topSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    textAlign: 'center',
  },

  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },

  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundLight,
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
    marginTop: Spacing.sm,
  },

  keypad: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },

  keypadRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});

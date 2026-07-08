import React, { useRef, useCallback, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { BorderRadius } from '@/src/core/theme/spacing';
import { OTP_LENGTH } from '@/src/core/utils/constants';
import { scale } from '@/src/core/utils/responsive';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (otp: string) => void;
  hasError?: boolean;
  disabled?: boolean;
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  hasError = false,
  disabled = false,
}: OTPInputProps) {
  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const translateX = useSharedValue(0);

  const shakeAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const triggerShake = useCallback(() => {
    translateX.value = withSequence(
      withTiming(8, { duration: 40 }),
      withTiming(-8, { duration: 40 }),
      withTiming(8, { duration: 40 }),
      withTiming(-8, { duration: 40 }),
      withTiming(8, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
  }, [translateX]);

  useEffect(() => {
    if (hasError) triggerShake();
  }, [hasError, triggerShake]);

  const handleChange = useCallback(
    (text: string, index: number) => {
      if (text.length > 1) {
        const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
        onChange(cleaned);
        if (cleaned.length === OTP_LENGTH) {
          inputRefs.current[OTP_LENGTH - 1]?.blur();
          onComplete?.(cleaned);
        } else {
          inputRefs.current[Math.min(cleaned.length, OTP_LENGTH - 1)]?.focus();
        }
        return;
      }

      const digit = text.replace(/\D/g, '');
      const current = valueRef.current;
      const chars = current.split('');

      chars[index] = digit;

      const newValue = chars.slice(0, OTP_LENGTH).join('');
      onChange(newValue);

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newValue.replace(/\s/g, '').length === OTP_LENGTH) {
        inputRefs.current[index]?.blur();
        onComplete?.(newValue);
      }
    },
    [onChange, onComplete]
  );

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
      if (e.nativeEvent.key === 'Backspace') {
        const current = valueRef.current;
        const chars = current.split('');

        if (!chars[index] && index > 0) {
          chars[index - 1] = '';
          onChange(chars.join(''));
          inputRefs.current[index - 1]?.focus();
        } else if (chars[index]) {
          chars[index] = '';
          onChange(chars.join(''));
        }
      }
    },
    [onChange]
  );

  const digits = value.split('');

  return (
    <Animated.View style={[styles.container, shakeAnimation]}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => {
        const isFilled = Boolean(digits[i]);
        const isFocused = digits.length === i;

        return (
          <TextInput
            key={i}
            ref={(ref) => {
              inputRefs.current[i] = ref;
            }}
            style={[
              styles.box,
              isFilled && styles.boxFilled,
              isFocused && styles.boxFocused,
              hasError && styles.boxError,
              disabled && styles.boxDisabled,
            ]}
            value={digits[i] ?? ''}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            contextMenuHidden={true}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            selectTextOnFocus
            editable={!disabled}
            accessibilityRole="text"
            accessibilityLabel={`OTP digit ${i + 1} of ${OTP_LENGTH}`}
          />
        );
      })}
    </Animated.View>
  );
}

const BOX_SIZE = scale(48);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(8),
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE * 1.08,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  boxFilled: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  boxFocused: {
    borderColor: 'transparent',
    borderBottomColor: Colors.primary,
    borderBottomWidth: 2,
    borderRadius: 0,
    backgroundColor: Colors.backgroundLight,
  },
  boxError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorLight,
  },
  boxDisabled: {
    backgroundColor: Colors.backgroundLight,
    borderColor: Colors.border,
  },
});

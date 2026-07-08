import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';

interface SuccessIconProps {
  size?: number;
  onAnimationComplete?: () => void;
}

export function SuccessIcon({ size = 100, onAnimationComplete }: SuccessIconProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withDelay(
      100,
      withSpring(1, {
        damping: 12,
        stiffness: 200,
      })
    );

    const timer = setTimeout(() => {
      onAnimationComplete?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, [scale, opacity, onAnimationComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="checkmark" size={size * 0.55} color={Colors.textWhite} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

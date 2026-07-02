import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { scale } from '@/src/core/utils/responsive';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
}

export function LoadingSpinner({
  size = scale(48),
  color = Colors.primary,
  thickness = scale(4),
}: LoadingSpinnerProps) {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(opacity);
    };
  }, [rotation, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderTopColor: color,
            borderRightColor: `${color}40`,
            borderBottomColor: `${color}20`,
            borderLeftColor: `${color}80`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

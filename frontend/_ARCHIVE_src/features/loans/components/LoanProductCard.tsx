import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Badge } from '@/src/shared/components/common/Badge';
import { scale } from '@/src/core/utils/responsive';

interface LoanProductCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
  isComingSoon?: boolean;
}

export function LoanProductCard({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  onPress,
  isComingSoon = false,
}: LoanProductCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const iconCircleSize = Math.round((screenWidth - Spacing.xl * 2 - Spacing.sm) / 2 * 0.2);
  const clampedSize = Math.max(iconCircleSize, 36);

  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isComingSoon) {
      pulseScale.value = withRepeat(
        withTiming(1.02, { duration: 1000 }),
        -1,
        true
      );
    }
    return () => cancelAnimation(pulseScale);
  }, [isComingSoon, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isComingSoon && styles.cardDimmed,
        pressed && !isComingSoon && { opacity: 0.85 },
      ]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${title}${isComingSoon ? ', coming soon' : ''}`}
    >
      {isComingSoon && (
        <View style={styles.badgeContainer}>
          <Badge label="Coming Soon" variant="comingSoon" />
        </View>
      )}

      <Animated.View
        style={[
          styles.iconCircle,
          { backgroundColor: iconBg, width: clampedSize, height: clampedSize, borderRadius: clampedSize / 2 },
          isComingSoon && pulseStyle,
        ]}
      >
        <Ionicons name={icon} size={clampedSize * 0.52} color={iconColor} />
      </Animated.View>

      <Text style={[styles.title, isComingSoon && styles.titleDimmed]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
    minHeight: scale(110),
    ...Shadow.medium,
  },
  cardDimmed: {
    opacity: 0.7,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  titleDimmed: {
    color: Colors.textSecondary,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
});

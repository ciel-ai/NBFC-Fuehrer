import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, Shadow } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface QuickService {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface QuickServicesGridProps {
  services: QuickService[];
}

export function QuickServicesGrid({ services }: QuickServicesGridProps) {
  return (
    <View style={styles.grid}>
      {services.map((service) => (
        <Pressable
          key={service.id}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
          onPress={service.onPress}
          android_ripple={{ color: `${Colors.primary}10`, borderless: true, radius: scale(30) }}
          accessibilityRole="button"
          accessibilityLabel={service.label}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={service.icon} size={scale(22)} color={Colors.textSecondary} />
          </View>
          <Text style={styles.label}>{service.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconCircle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.medium,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

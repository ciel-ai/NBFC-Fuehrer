import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

type ActionTone = 'approve' | 'neutral' | 'reject';

export interface ActionItem {
  label: string;
  tone: ActionTone;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface ActionButtonRowProps {
  actions: ActionItem[];
}

const TONE_MAP: Record<ActionTone, { bg: string; fg: string; border?: string }> = {
  approve: { bg: Colors.success, fg: Colors.textWhite },
  neutral: { bg: Colors.background, fg: Colors.primary, border: Colors.primary },
  reject: { bg: Colors.errorLight, fg: Colors.error, border: Colors.error },
};

export function ActionButtonRow({ actions }: ActionButtonRowProps) {
  return (
    <View style={styles.row}>
      {actions.map((action) => {
        const t = TONE_MAP[action.tone];
        return (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: t.bg,
                borderColor: t.border ?? t.bg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            android_ripple={{ color: `${t.fg}20` }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {action.icon && (
              <Ionicons name={action.icon} size={scale(16)} color={t.fg} />
            )}
            <Text style={[styles.label, { color: t.fg }]} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: scale(100),
    minHeight: scale(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
});

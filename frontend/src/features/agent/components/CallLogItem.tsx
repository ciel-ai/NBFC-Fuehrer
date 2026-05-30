import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

export type OverdueSeverity = 'overdue' | 'npa' | 'auction';

export interface OverdueCustomer {
  id: string;
  name: string;
  loanId: string;
  emiAmount: string;
  daysOverdue: number;
  severity: OverdueSeverity;
  lastContact?: string;
  phone?: string;
}

interface CallLogItemProps {
  customer: OverdueCustomer;
  onPress?: () => void;
  onCallPress?: () => void;
}

const SEVERITY_MAP: Record<OverdueSeverity, { bg: string; fg: string; text: string }> = {
  overdue: { bg: Colors.goldLight, fg: Colors.goldDark, text: 'OVERDUE' },
  npa: { bg: Colors.errorLight, fg: Colors.error, text: 'NPA RISK' },
  auction: { bg: Colors.errorLight, fg: Colors.error, text: 'AUCTION' },
};

export function CallLogItem({ customer, onPress, onCallPress }: CallLogItemProps) {
  const sev = SEVERITY_MAP[customer.severity];
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
      onPress={onPress}
      android_ripple={{ color: `${Colors.primary}10` }}
      accessibilityRole="button"
      accessibilityLabel={`${customer.name}, ${customer.daysOverdue} days overdue, EMI ${customer.emiAmount}`}
    >
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{customer.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {customer.loanId} · {customer.emiAmount}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: sev.bg }]}>
              <Text style={[styles.badgeText, { color: sev.fg }]}>
                {customer.daysOverdue}d {sev.text}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.right}>
        {onCallPress && customer.phone ? (
          <Pressable
            onPress={onCallPress}
            hitSlop={6}
            style={styles.callBtn}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: scale(20) }}
            accessibilityRole="button"
            accessibilityLabel={`Call ${customer.name}`}
          >
            <Ionicons name="call" size={scale(16)} color={Colors.textWhite} />
          </Pressable>
        ) : null}
        <Ionicons name="chevron-forward" size={scale(20)} color={Colors.textDisabled} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  pressed: {
    backgroundColor: Colors.backgroundLight,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  callBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  sub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
  },
});

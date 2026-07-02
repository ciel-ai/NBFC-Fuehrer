import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily } from '@/src/core/theme/typography';
import { BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import type { CardNetwork } from '@/src/store/cardsStore';

const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'AMEX',
  card: 'CARD',
};

interface CreditCardProps {
  numberDisplay: string;
  holder: string;
  expiry: string;
  network: CardNetwork;
  color: string;
  onLongPress?: () => void;
  style?: ViewStyle;
}

export function CreditCard({
  numberDisplay,
  holder,
  expiry,
  network,
  color,
  onLongPress,
  style,
}: CreditCardProps) {
  return (
    <Pressable
      onLongPress={onLongPress}
      disabled={!onLongPress}
      style={[styles.card, { backgroundColor: color }, style]}
      accessibilityRole={onLongPress ? 'button' : undefined}
      accessibilityLabel={`Card ending ${numberDisplay.slice(-4)}`}
    >
      <View style={styles.decorLg} pointerEvents="none" />
      <View style={styles.decorSm} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={styles.chip} />
        <Text style={styles.network}>{NETWORK_LABEL[network]}</Text>
      </View>

      <Text style={styles.number}>{numberDisplay}</Text>

      <View style={styles.bottomRow}>
        <View style={styles.flex1}>
          <Text style={styles.label}>CARD HOLDER</Text>
          <Text style={styles.value} numberOfLines={1}>
            {holder ? holder.toUpperCase() : 'YOUR NAME'}
          </Text>
        </View>
        <View>
          <Text style={styles.label}>EXPIRES</Text>
          <Text style={styles.value}>{expiry || 'MM/YY'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: BorderRadius.xl,
    padding: scale(20),
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Shadow.large,
  },
  flex1: { flex: 1 },
  decorLg: {
    position: 'absolute',
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -scale(70),
    right: -scale(60),
  },
  decorSm: {
    position: 'absolute',
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -scale(40),
    left: -scale(20),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    width: scale(38),
    height: scale(28),
    borderRadius: scale(6),
    backgroundColor: Colors.gold,
  },
  network: {
    fontFamily: FontFamily.bold,
    fontSize: scale(16),
    color: Colors.textWhite,
    letterSpacing: 0.5,
  },
  number: {
    fontFamily: FontFamily.semiBold,
    fontSize: scale(19),
    color: Colors.textWhite,
    letterSpacing: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  value: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textWhite,
    letterSpacing: 0.5,
  },
});

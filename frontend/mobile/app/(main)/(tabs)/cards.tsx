import React from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import { CreditCard } from '@/src/shared/components/common/CreditCard';
import { useCardsStore } from '@/src/store/cardsStore';

const CARD_PALETTE = [Colors.primary];

export default function CardsScreen() {
  const cards = useCardsStore((s) => s.cards);
  const removeCard = useCardsStore((s) => s.removeCard);

  const confirmRemove = (id: string, last4: string) => {
    Alert.alert(
      'Remove card',
      `Remove the card ending in ${last4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeCard(id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cards</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={scale(64)} color={Colors.textDisabled} />
            <Text style={styles.emptyTitle}>No Cards Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a credit or debit card to manage your payments in one place.
            </Text>
          </View>
        ) : (
          cards.map((card, index) => (
            <CreditCard
              key={card.id}
              numberDisplay={`••••  ••••  ••••  ${card.last4}`}
              holder={card.holder}
              expiry={card.expiry}
              network={card.network}
              color={CARD_PALETTE[index % CARD_PALETTE.length]}
              onLongPress={() => confirmRemove(card.id, card.last4)}
              style={styles.cardSpacing}
            />
          ))
        )}

        {/* Add new card */}
        <Pressable
          style={({ pressed }) => [styles.addCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/(main)/cards/add-card')}
          accessibilityRole="button"
          accessibilityLabel="Add a new card"
        >
          <View style={styles.addIcon}>
            <Ionicons name="add" size={scale(24)} color={Colors.primary} />
          </View>
          <Text style={styles.addText}>Add New Card</Text>
        </Pressable>

        {cards.length > 0 && (
          <Text style={styles.hint}>Long-press a card to remove it.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.md,
    flexGrow: 1,
  },
  cardSpacing: { marginBottom: Spacing.xs },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: `${Colors.primary}55`,
    paddingVertical: Spacing.lg,
  },
  addIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
});

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { CreditCard } from '@/src/shared/components/common/CreditCard';
import { useCardsStore, type CardNetwork } from '@/src/store/cardsStore';

function detectNetwork(digits: string): CardNetwork {
  if (/^4/.test(digits)) return 'visa';
  if (/^5/.test(digits)) return 'mastercard';
  if (/^6/.test(digits)) return 'rupay';
  if (/^3/.test(digits)) return 'amex';
  return 'card';
}

/** Build a grouped, dot-padded number for the live preview. */
function buildPreview(digits: string): string {
  const padded = (digits + '•'.repeat(16)).slice(0, 16);
  return padded.replace(/(.{4})/g, '$1  ').trim();
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function AddCardScreen() {
  const addCard = useCardsStore((s) => s.addCard);

  const [number, setNumber] = useState(''); // raw digits
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const network = useMemo(() => detectNetwork(number), [number]);

  const onNumberChange = (text: string) => {
    setNumber(text.replace(/\D/g, '').slice(0, 16));
  };
  const onExpiryChange = (text: string) => {
    const d = text.replace(/\D/g, '').slice(0, 4);
    setExpiry(d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };

  const numberDisplay = useMemo(() => buildPreview(number), [number]);

  const validate = (): string | null => {
    if (number.length < 15) return 'Enter a valid card number.';
    if (!holder.trim()) return 'Enter the name on the card.';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Enter expiry as MM/YY.';
    const [mm, yy] = expiry.split('/').map(Number);
    if (mm < 1 || mm > 12) return 'Enter a valid expiry month.';
    const now = new Date();
    const exp = new Date(2000 + yy, mm); // first day after expiry month
    if (exp <= now) return 'This card has expired.';
    if (cvv.length < 3) return 'Enter a valid CVV.';
    return null;
  };

  const handleSave = () => {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    addCard({
      holder: holder.trim(),
      last4: number.slice(-4),
      expiry,
      network,
    });
    router.back();
  };

  const [formError, setFormError] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Add Card" showBack />

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Live preview */}
          <CreditCard
            numberDisplay={numberDisplay}
            holder={holder}
            expiry={expiry}
            network={network}
            color={Colors.navy}
          />

          <Field label="Card Number">
            <TextInput
              style={styles.input}
              value={number.replace(/(.{4})/g, '$1 ').trim()}
              onChangeText={onNumberChange}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="number-pad"
              maxLength={19}
              accessibilityLabel="Card number"
            />
          </Field>

          <Field label="Name on Card">
            <TextInput
              style={styles.input}
              value={holder}
              onChangeText={setHolder}
              placeholder="Name on Card"  
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="words"
              accessibilityLabel="Name on card"
            />
          </Field>

          <View style={styles.row}>
            <Field label="Expiry (MM/YY)">
              <TextInput
                style={styles.input}
                value={expiry}
                onChangeText={onExpiryChange}
                placeholder="08/27"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel="Expiry date"
              />
            </Field>
            <Field label="CVV">
              <TextInput
                style={styles.input}
                value={cvv}
                onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="•••"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                accessibilityLabel="CVV"
              />
            </Field>
          </View>

          {formError && <Text style={styles.error}>{formError}</Text>}

          <View style={styles.secureNote}>
            <Text style={styles.secureText}>
              🔒 Your full card number and CVV are never stored. We keep only the
              last 4 digits.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Save Card" onPress={handleSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex1: { flex: 1 },
  content: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },

  field: { flex: 1, gap: Spacing.xs },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  error: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  secureNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  secureText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

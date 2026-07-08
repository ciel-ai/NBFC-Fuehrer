import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { safeBack } from '@/src/core/utils/navigation';
import { useAuthStore } from '@/src/store/authStore';
import { MPIN_LENGTH } from '@/src/core/utils/constants';
import { MpinScaffold, MpinScaffoldHandle } from '@/src/shared/components/common/MpinScaffold';

export default function ConfirmMpinScreen() {
  const { mpin: originalMpin } = useLocalSearchParams<{ mpin: string }>();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const padRef = useRef<MpinScaffoldHandle>(null);

  const setMpin = useAuthStore((s) => s.setMpin);

  const handleComplete = useCallback(
    async (pin: string) => {
      if (pin !== originalMpin) {
        setErrorText('PINs do not match. Please try again.');
        padRef.current?.shakeAndClear();
        return;
      }

      setIsLoading(true);
      try {
        await setMpin(pin);
        router.replace('/(auth)/complete-profile');
      } catch {
        Alert.alert('Error', 'Failed to save MPIN. Please try again.');
        padRef.current?.clear();
      } finally {
        setIsLoading(false);
      }
    },
    [originalMpin, setMpin]
  );

  return (
    <MpinScaffold
      ref={padRef}
      showBack
      onBack={safeBack}
      title="Confirm your MPIN"
      subtitle={`Re-enter the ${MPIN_LENGTH}-digit PIN to confirm`}
      pinLength={MPIN_LENGTH}
      onComplete={handleComplete}
      errorText={errorText}
      disabled={isLoading}
      footer={
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.success} />
          <Text style={styles.infoText}>Your MPIN is stored securely on your device</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});

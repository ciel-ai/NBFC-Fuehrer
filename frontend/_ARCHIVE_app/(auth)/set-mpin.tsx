import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography } from '@/src/core/theme/typography';
import { Spacing } from '@/src/core/theme/spacing';
import { safeBack } from '@/src/core/utils/navigation';
import { MPIN_LENGTH } from '@/src/core/utils/constants';
import { MpinScaffold, MpinScaffoldHandle } from '@/src/shared/components/common/MpinScaffold';

export default function SetMpinScreen() {
  const padRef = useRef<MpinScaffoldHandle>(null);

  const handleComplete = useCallback((pin: string) => {
    // Brief pause lets the final dot fill before the screen transitions.
    setTimeout(() => {
      router.push({ pathname: '/(auth)/confirm-mpin', params: { mpin: pin } });
      padRef.current?.clear();
    }, 120);
  }, []);

  return (
    <MpinScaffold
      ref={padRef}
      showBack
      onBack={safeBack}
      title="Set your MPIN"
      subtitle={`Create a ${MPIN_LENGTH}-digit PIN to secure your account`}
      pinLength={MPIN_LENGTH}
      onComplete={handleComplete}
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

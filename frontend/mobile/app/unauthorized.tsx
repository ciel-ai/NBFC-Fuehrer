// app/unauthorized.tsx
//
// 403 — shown when a permission check fails mid-navigation (Task 4.1).
// Route-level guards redirect here instead of silently bouncing to home,
// so the user understands why the screen didn't open.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import { scale, verticalScale } from '@/src/core/utils/responsive';

export default function UnauthorizedScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={scale(34)} color={Colors.error} />
      </View>
      <Text style={styles.title}>Access restricted</Text>
      <Text style={styles.body}>
        Your account doesn’t have permission to open this screen.
        If you believe this is a mistake, contact your administrator.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      >
        <Text style={styles.buttonText}>Go back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background ?? '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(28),
  },
  iconWrap: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: Colors.errorLight ?? '#fdecec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(18),
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary ?? '#111827',
    marginBottom: verticalScale(8),
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary ?? '#6b7280',
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: verticalScale(24),
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: scale(10),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(32),
  },
  buttonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: '#ffffff',
  },
});

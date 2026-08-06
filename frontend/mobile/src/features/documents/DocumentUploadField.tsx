import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/src/core/theme/colors';
import { FontFamily } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import type { DocSlotState } from './useDocumentSlots';

/**
 * Upload slot shared by every customer document-capture screen. Renders the
 * empty → uploading → uploaded | failed lifecycle from `useDocumentSlots`:
 * a spinner while uploading, a remove (trash) action once uploaded, and a
 * tap-to-retry affordance on failure.
 */
export function DocumentUploadField({
  label,
  subtitle,
  required,
  optional,
  state,
  onPress,
  onRemove,
}: {
  label: string;
  subtitle?: string;
  required?: boolean;
  optional?: boolean;
  state: DocSlotState;
  onPress: () => void;
  onRemove: () => void;
}) {
  const uploaded = state === 'uploaded';
  const uploading = state === 'uploading';
  const failed = state === 'failed';

  const statusText =
    uploaded ? 'Uploaded ✓'
      : uploading ? 'Uploading…'
        : failed ? 'Upload failed — tap to retry'
          : 'Tap to upload or capture';

  return (
    <Pressable
      style={[s.card, uploaded && s.cardUploaded, failed && s.cardFailed]}
      onPress={onPress}
      disabled={uploading}
      android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${label}${required ? ', required' : ''}${optional ? ', optional' : ''}. ${statusText}`}
    >
      <View style={[s.iconBox, uploaded && s.iconBoxUploaded, failed && s.iconBoxFailed]}>
        {uploading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons
            name={uploaded ? 'checkmark-circle' : failed ? 'alert-circle' : 'cloud-upload'}
            size={22}
            color={uploaded ? Colors.success : failed ? Colors.error : Colors.primary}
          />
        )}
      </View>
      <View style={s.info}>
        <Text style={s.label}>
          {label}
          {required && <Text style={s.star}> *</Text>}
          {optional && <Text style={s.optional}> (optional)</Text>}
        </Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        <Text style={[s.status, uploaded && s.statusDone, failed && s.statusFailed]}>
          {statusText}
        </Text>
      </View>
      <View style={s.actions}>
        {uploaded ? (
          <Pressable
            style={s.actionBtn}
            onPress={onRemove}
            android_ripple={{ color: `${Colors.error}20`, borderless: true }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Remove document"
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </Pressable>
        ) : (
          <>
            <Pressable
              style={s.actionBtn}
              onPress={onPress}
              disabled={uploading}
              android_ripple={{ color: `${Colors.primary}20`, borderless: true }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Open camera"
            >
              <Ionicons name="camera" size={16} color={Colors.primary} />
            </Pressable>
            <Pressable
              style={s.actionBtn}
              onPress={onPress}
              disabled={uploading}
              android_ripple={{ color: `${Colors.primary}20`, borderless: true }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Attach file"
            >
              <Ionicons name="attach" size={16} color={Colors.primary} />
            </Pressable>
          </>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background,
    gap: Spacing.md,
    ...Shadow.small,
  },
  cardUploaded: { borderColor: Colors.success, backgroundColor: Colors.successLight },
  cardFailed: { borderColor: Colors.error },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUploaded: { backgroundColor: Colors.successLight },
  iconBoxFailed: { backgroundColor: Colors.errorLight },
  info: { flex: 1 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  star: { color: Colors.error },
  optional: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled, marginBottom: 2 },
  status: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textDisabled },
  statusDone: { color: Colors.success },
  statusFailed: { color: Colors.error },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

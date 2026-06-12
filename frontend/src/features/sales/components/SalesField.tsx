import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  Image,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import { Control, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import { formatDate } from '@/src/core/utils/formatters';
import { useAssetPicker } from '@/src/features/sales/hooks/useAssetPicker';
import type { SalesFieldConfig } from '@/src/features/sales/config/types';

interface SalesFieldProps {
  field: SalesFieldConfig;
  control: Control<Record<string, unknown>>;
}

const KEYBOARD_BY_TYPE: Record<string, KeyboardTypeOptions> = {
  number: 'number-pad',
  currency: 'number-pad',
  aadhaar: 'number-pad',
  pincode: 'number-pad',
  phone: 'phone-pad',
  email: 'email-address',
};

function digitsOnly(text: string): string {
  return text.replace(/\D/g, '');
}

export function SalesField({ field, control }: SalesFieldProps) {
  return (
    <Controller
      control={control}
      name={field.name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={styles.section}>
          <Text style={styles.label}>{field.label.toUpperCase()}</Text>

          <FieldBody
            field={field}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            hasError={!!error}
          />

          {error ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {error.message as string}
            </Text>
          ) : field.helper ? (
            <Text style={styles.hintText}>{field.helper}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

interface FieldBodyProps {
  field: SalesFieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
  onBlur: () => void;
  hasError: boolean;
}

function FieldBody({ field, value, onChange, onBlur, hasError }: FieldBodyProps) {
  switch (field.type) {
    case 'select':
      return <SelectInput field={field} value={value} onChange={onChange} hasError={hasError} />;
    case 'date':
      return <DateInput field={field} value={value} onChange={onChange} hasError={hasError} />;
    case 'checkbox':
      return <CheckboxInput field={field} value={value} onChange={onChange} />;
    case 'photo':
    case 'document':
      return <AssetInput field={field} value={value} onChange={onChange} hasError={hasError} />;
    default:
      return (
        <TextInputField
          field={field}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          hasError={hasError}
        />
      );
  }
}

// ── Text / number family ─────────────────────────────────────────────────
function TextInputField({ field, value, onChange, onBlur, hasError }: FieldBodyProps) {
  const transform = (text: string): string => {
    switch (field.type) {
      case 'pan':
        return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      case 'aadhaar':
        return digitsOnly(text).slice(0, 12);
      case 'pincode':
        return digitsOnly(text).slice(0, 6);
      case 'phone':
        return digitsOnly(text).slice(0, 10);
      case 'number':
      case 'currency':
        return digitsOnly(text);
      default:
        return field.maxLength ? text.slice(0, field.maxLength) : text;
    }
  };

  return (
    <View style={[styles.inputRow, hasError && styles.inputRowError]}>
      {field.prefix ? (
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>{field.prefix}</Text>
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        placeholder={field.placeholder}
        placeholderTextColor={Colors.textDisabled}
        value={(value as string) ?? ''}
        onChangeText={(t) => onChange(transform(t))}
        onBlur={onBlur}
        keyboardType={KEYBOARD_BY_TYPE[field.type] ?? 'default'}
        autoCapitalize={field.autoCapitalize ?? (field.type === 'pan' ? 'characters' : 'sentences')}
        autoCorrect={false}
        maxLength={field.maxLength}
        accessibilityLabel={field.label}
      />
    </View>
  );
}

// ── Select ────────────────────────────────────────────────────────────────
function SelectInput({
  field,
  value,
  onChange,
  hasError,
}: Omit<FieldBodyProps, 'onBlur'>) {
  const [open, setOpen] = useState(false);
  const selected = field.options?.find((o) => o.value === value);

  return (
    <>
      <Pressable
        style={[styles.inputRow, styles.selectRow, hasError && styles.inputRowError]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${field.label}. ${selected?.label ?? 'Not selected'}`}
      >
        <Text style={[styles.selectText, !selected && styles.placeholderText]}>
          {selected?.label ?? field.placeholder ?? 'Select'}
        </Text>
        <Ionicons name="chevron-down" size={scale(18)} color={Colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{field.label}</Text>
            {field.options?.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={scale(18)} color={Colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Date ────────────────────────────────────────────────────────────────
function DateInput({
  field,
  value,
  onChange,
  hasError,
}: Omit<FieldBodyProps, 'onBlur'>) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(value as string) : new Date(2000, 0, 1);

  return (
    <>
      <Pressable
        style={[styles.inputRow, styles.selectRow, hasError && styles.inputRowError]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${field.label}. ${value ? formatDate(value as string) : 'Not set'}`}
      >
        <Text style={[styles.selectText, !value && styles.placeholderText]}>
          {value ? formatDate(value as string) : field.placeholder ?? 'Select date'}
        </Text>
        <Ionicons name="calendar-outline" size={scale(18)} color={Colors.textSecondary} />
      </Pressable>

      {open ? (
        <DateTimePicker
          value={current}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            // Android closes the dialog on its own; iOS keeps it inline.
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'set' && date) {
              onChange(date.toISOString());
            }
          }}
        />
      ) : null}
    </>
  );
}

// ── Checkbox / consent ─────────────────────────────────────────────────────
function CheckboxInput({
  field,
  value,
  onChange,
}: Pick<FieldBodyProps, 'field' | 'value' | 'onChange'>) {
  const checked = value === true;
  return (
    <Pressable
      style={styles.checkboxRow}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={field.placeholder ?? field.label}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={scale(14)} color={Colors.textWhite} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{field.placeholder ?? field.label}</Text>
    </Pressable>
  );
}

// ── Photo / document capture ────────────────────────────────────────────────
function AssetInput({
  field,
  value,
  onChange,
  hasError,
}: Omit<FieldBodyProps, 'onBlur'>) {
  const { pick, busy } = useAssetPicker();
  const uri = value as string | undefined;
  const source = field.capture ?? (field.type === 'photo' ? 'camera' : 'library');

  const handlePick = async () => {
    const picked = await pick(source);
    if (picked) onChange(picked);
  };

  if (uri) {
    return (
      <View style={styles.assetPreview}>
        <Image source={{ uri }} style={styles.assetThumb} />
        <View style={styles.assetMeta}>
          <Ionicons name="checkmark-circle" size={scale(18)} color={Colors.success} />
          <Text style={styles.assetMetaText}>Captured</Text>
        </View>
        <Pressable
          onPress={handlePick}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Replace ${field.label}`}
        >
          <Text style={styles.assetReplace}>Replace</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.assetDrop, hasError && styles.inputRowError]}
      onPress={handlePick}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`Add ${field.label}`}
      accessibilityState={{ busy }}
    >
      <Ionicons
        name={source === 'camera' ? 'camera-outline' : 'cloud-upload-outline'}
        size={scale(24)}
        color={Colors.primary}
      />
      <Text style={styles.assetDropText}>
        {busy ? 'Opening…' : field.placeholder ?? (source === 'camera' ? 'Capture photo' : 'Upload file')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    minHeight: scale(52),
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  inputRowError: { borderColor: Colors.error },
  prefix: {
    paddingHorizontal: Spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  prefixText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  selectRow: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
  },
  selectText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  placeholderText: { color: Colors.textDisabled },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  hintText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Select modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  optionRowActive: { backgroundColor: Colors.primaryLight },
  optionText: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
  },
  optionTextActive: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  // Asset
  assetDrop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.backgroundLight,
  },
  assetDropText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
  assetPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
  },
  assetThumb: {
    width: scale(48),
    height: scale(48),
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundLight,
  },
  assetMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  assetMetaText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  assetReplace: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
});

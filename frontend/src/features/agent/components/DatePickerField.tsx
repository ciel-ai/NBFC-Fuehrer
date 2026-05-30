import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Modal, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';
import { formatDate } from '@/src/core/utils/formatters';

interface DatePickerFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  disabled?: boolean;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  error,
  disabled,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(value);

  const openPicker = () => {
    if (disabled) return;
    setTempDate(value);
    setOpen(true);
  };

  // Android: imperative dialog — fires onChange once when the user picks or dismisses
  const handleAndroidChange = (event: DateTimePickerEvent, picked?: Date) => {
    setOpen(false);
    if (event.type === 'set' && picked) {
      onChange(picked);
    }
  };

  // iOS: bottom sheet with spinner — commits only on Done
  const handleIosChange = (_e: DateTimePickerEvent, picked?: Date) => {
    if (picked) setTempDate(picked);
  };
  const confirmIos = () => {
    setOpen(false);
    if (tempDate) onChange(tempDate);
  };
  const cancelIos = () => {
    setOpen(false);
    setTempDate(value);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[
          styles.field,
          error ? styles.fieldError : null,
          disabled ? styles.fieldDisabled : null,
        ]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, select date` : 'select date'}
        disabled={disabled}
      >
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={scale(18)} color={Colors.textSecondary} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={cancelIos}
        >
          <Pressable style={styles.backdrop} onPress={cancelIos} accessibilityLabel="Dismiss" />
          <View style={styles.iosSheet}>
            <View style={styles.iosToolbar}>
              <Pressable
                onPress={cancelIos}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel date selection"
              >
                <Text style={styles.iosToolbarCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmIos}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Confirm date selection"
              >
                <Text style={styles.iosToolbarDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={tempDate ?? value ?? new Date()}
              mode="date"
              display="spinner"
              onChange={handleIosChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              themeVariant="light"
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: scale(48),
    gap: Spacing.sm,
  },
  fieldError: { borderColor: Colors.error },
  fieldDisabled: { backgroundColor: Colors.backgroundLight, opacity: 0.6 },
  value: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  placeholder: { color: Colors.textDisabled },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingBottom: Spacing.lg,
  },
  iosToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iosToolbarCancel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  iosToolbarDone: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
});

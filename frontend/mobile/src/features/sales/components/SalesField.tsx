import React, { useEffect, useRef, useState } from 'react';
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
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useAssetPicker } from '@/src/features/sales/hooks/useAssetPicker';
import { useServices } from '@/src/core/services/ServiceProvider';
import { toCdlEmploymentType } from '@/src/entities/consumerDurableLoan';
import type { CdlQuoteResult } from '@/src/entities/consumerDurableLoan';
import type {
  SalesFieldConfig,
  SalesFieldOption,
  SalesFormValues,
} from '@/src/features/sales/config/types';

interface SalesFieldProps {
  field: SalesFieldConfig;
  control: Control<Record<string, unknown>>;
  /** Every answer so far — lets a field derive its options / value / helper. */
  values?: SalesFormValues;
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

/** Resolve a field's options — dynamic (from earlier answers) wins over static. */
function resolveOptions(
  field: SalesFieldConfig,
  values: SalesFormValues,
): SalesFieldOption[] {
  return field.optionsFrom ? field.optionsFrom(values) : field.options ?? [];
}

export function SalesField({ field, control, values = {} }: SalesFieldProps) {
  // `derived` rows are read-only output, not inputs — they hold no form value.
  if (field.type === 'derived') {
    return <DerivedRow field={field} values={values} />;
  }

  // `cdl-quote` DOES hold a form value (the resolved backend quote), unlike
  // `derived` — so it goes through Controller like a normal field, just with
  // its own fetch-driven body instead of a text/select input.
  if (field.type === 'cdl-quote') {
    return (
      <Controller
        control={control}
        name={field.name}
        render={({ field: { onChange, value } }) => (
          <CdlQuoteField
            values={values}
            value={value as CdlQuoteResult | null}
            onChange={onChange}
          />
        )}
      />
    );
  }

  const options = resolveOptions(field, values);
  const helper = field.helperFrom ? field.helperFrom(values) : field.helper;

  return (
    <Controller
      control={control}
      name={field.name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={styles.section}>
          <Text style={styles.label}>{field.label.toUpperCase()}</Text>

          <FieldBody
            field={field}
            options={options}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            hasError={!!error}
          />

          {error ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {error.message as string}
            </Text>
          ) : helper ? (
            <Text style={styles.hintText}>{helper}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

interface FieldBodyProps {
  field: SalesFieldConfig;
  options: SalesFieldOption[];
  value: unknown;
  onChange: (v: unknown) => void;
  onBlur: () => void;
  hasError: boolean;
}

function FieldBody({ field, options, value, onChange, onBlur, hasError }: FieldBodyProps) {
  switch (field.type) {
    case 'select':
      return (
        <SelectInput
          field={field}
          options={options}
          value={value}
          onChange={onChange}
          hasError={hasError}
        />
      );
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

// ── Derived (read-only) ────────────────────────────────────────────────────
function DerivedRow({
  field,
  values,
}: {
  field: SalesFieldConfig;
  values: SalesFormValues;
}) {
  const text = field.compute?.(values) ?? '—';
  const helper = field.helperFrom ? field.helperFrom(values) : field.helper;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{field.label.toUpperCase()}</Text>
      <View style={styles.derivedRow} accessibilityLabel={`${field.label}: ${text}`}>
        <Text style={styles.derivedText}>{text}</Text>
      </View>
      {helper ? <Text style={styles.hintText}>{helper}</Text> : null}
    </View>
  );
}

// ── CDL quote (backend-calculated EMI / fee / FOIR) ────────────────────────
//
// Replaces what used to be three separate `derived` rows, each computing its
// own figure locally via calculateEMI() — the mobile app's own copy of the
// EMI formula, which could silently disagree with the authoritative figure
// the backend actually books the loan at. This fetches the real quote
// (GET /sales/cdl/quote — same calculation the customer app's own quote and
// the disbursed loan use) instead, debounced as the agent edits amount/
// tenure/rate, and writes the resolved figures into form state via
// onChange so the review step and submit payload see real numbers.
// FOIR is computed from the returned emi (not a second local EMI) — a plain
// ratio, not a duplicate financial calculation.
function CdlQuoteField({
  values,
  value,
  onChange,
}: {
  values: SalesFormValues;
  value: CdlQuoteResult | null;
  onChange: (v: CdlQuoteResult | null) => void;
}) {
  const { salesService } = useServices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);
  const [retryTick, setRetryTick] = useState(0);

  const loanAmount = Number(values.loanAmount);
  const tenureMonths = Number(values.tenureMonths);
  const interestRate = Number(values.interestRate);
  const employmentType = String(values.employmentType ?? '');
  const productValue = Number(values.productValue) || loanAmount;
  const downPayment = Number(values.downPayment) || 0;

  const priceable =
    loanAmount > 0 &&
    tenureMonths > 0 &&
    !Number.isNaN(interestRate) &&
    employmentType.length > 0;

  useEffect(() => {
    if (!priceable) {
      requestSeq.current++; // cancel any in-flight result
      onChange(null);
      setLoading(false);
      setError(false);
      return;
    }

    const seq = ++requestSeq.current;
    const t = setTimeout(() => {
      setLoading(true);
      setError(false);
      salesService
        .getCdlQuote('cdl', {
          productValue,
          downPayment,
          loanAmount,
          tenureMonths,
          employmentType: toCdlEmploymentType(employmentType),
          interestRate,
        })
        .then((result) => {
          if (seq !== requestSeq.current) return; // superseded
          onChange(result);
          setLoading(false);
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          onChange(null);
          setLoading(false);
          setError(true);
        });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceable, loanAmount, tenureMonths, interestRate, employmentType, productValue, downPayment, retryTick]);

  const income = Number(values.monthlyIncome);
  const existingEmis = Number(values.existingEmis) || 0;
  const foirText =
    value && income > 0
      ? `${Math.round(((existingEmis + value.emi) / income) * 1000) / 10}%`
      : '—';

  return (
    <View style={styles.section}>
      <Text style={styles.label}>LOAN QUOTE</Text>

      <View style={styles.quoteBody}>
        <QuoteRow label="Processing Fee" text={value ? formatCurrency(value.processingFee) : loading ? '…' : '—'} />
        <QuoteRow label="Monthly EMI" text={value ? formatCurrency(value.emi) : loading ? '…' : '—'} emphasize />
        <QuoteRow label="Total Interest" text={value ? formatCurrency(value.totalInterest) : loading ? '…' : '—'} />
        <QuoteRow label="Total Payable" text={value ? formatCurrency(value.totalAmount) : loading ? '…' : '—'} />
        <QuoteRow label="FOIR (indicative)" text={foirText} />
      </View>

      {!priceable ? (
        <Text style={styles.hintText}>Set amount, tenure, rate and employment type to see the quote</Text>
      ) : error ? (
        <View style={styles.quoteErrorRow}>
          <Text style={styles.errorText}>Could not fetch the quote. Please retry.</Text>
          <Pressable
            onPress={() => setRetryTick((n) => n + 1)}
            accessibilityRole="button"
            accessibilityLabel="Retry fetching the quote"
          >
            <Text style={styles.quoteRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.hintText}>
          Reducing balance · same calculation the loan is booked at
        </Text>
      )}
    </View>
  );
}

function QuoteRow({ label, text, emphasize }: { label: string; text: string; emphasize?: boolean }) {
  return (
    <View style={styles.quoteInnerRow} accessibilityLabel={`${label}: ${text}`}>
      <Text style={styles.quoteInnerLabel}>{label}</Text>
      <Text style={emphasize ? styles.quoteInnerValueEmphasis : styles.quoteInnerValue}>{text}</Text>
    </View>
  );
}

// ── Text / number family ─────────────────────────────────────────────────
function TextInputField({
  field,
  value,
  onChange,
  onBlur,
  hasError,
}: Omit<FieldBodyProps, 'options'>) {
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
  options,
  value,
  onChange,
  hasError,
}: Omit<FieldBodyProps, 'onBlur'>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

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
            {options.map((opt) => {
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
}: Omit<FieldBodyProps, 'onBlur' | 'options'>) {
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
}: Omit<FieldBodyProps, 'onBlur' | 'options'>) {
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
  // Derived (read-only) row
  derivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    minHeight: scale(52),
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundLight,
  },
  derivedText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
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
  // CDL quote
  quoteBody: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  quoteInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  quoteInnerLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  quoteInnerValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  quoteInnerValueEmphasis: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary,
  },
  quoteErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  quoteRetry: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary,
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

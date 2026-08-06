import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { useAssetPicker, type AssetSource } from '@/src/features/sales/hooks/useAssetPicker';
import {
  ORNAMENT_TYPE_OPTIONS,
  PURITY_OPTIONS,
  emptyOrnament,
  ornamentNetWeight,
  ornamentTotals,
  ornamentTypeLabel,
  validateOrnament,
  type OrnamentEntry,
} from '@/src/features/sales/config/ornaments';

interface OrnamentListProps {
  rows: OrnamentEntry[];
  onChange: (rows: OrnamentEntry[]) => void;
  accent: string;
}

// ─── Row editor (modal) ───────────────────────────────────────────────────────

function ChipRow({
  options,
  value,
  onSelect,
  error,
  accessibilityLabel,
}: {
  options: { label: string; value: string }[];
  value: string;
  onSelect: (v: string) => void;
  error?: string;
  accessibilityLabel: string;
}) {
  return (
    <View>
      <View style={styles.chipRow} accessibilityLabel={accessibilityLabel}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function NumField({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  error,
  optional,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  suffix?: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.numField}>
      <Text style={styles.fieldLabel}>
        {label}
        {optional ? <Text style={styles.optionalMark}> (optional)</Text> : null}
      </Text>
      <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDisabled}
          keyboardType="decimal-pad"
          accessibilityLabel={label}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function OrnamentEditor({
  initial,
  accent,
  onSave,
  onCancel,
}: {
  initial: OrnamentEntry;
  accent: string;
  onSave: (entry: OrnamentEntry) => void;
  onCancel: () => void;
}) {
  const [entry, setEntry] = useState<OrnamentEntry>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pick, busy } = useAssetPicker();

  const set = <K extends keyof OrnamentEntry>(key: K, value: OrnamentEntry[K]) => {
    setEntry((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }));
  };

  const capturePhoto = (source: AssetSource) => {
    void (async () => {
      const uri = await pick(source);
      if (uri) set('photoUri', uri);
    })();
  };

  const choosePhoto = () => {
    Alert.alert('Ornament photo', 'Choose method', [
      { text: 'Camera', onPress: () => capturePhoto('camera') },
      { text: 'Gallery', onPress: () => capturePhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const save = () => {
    const validation = validateOrnament(entry);
    setErrors(validation);
    if (Object.keys(validation).length === 0) onSave(entry);
  };

  const netWeight = ornamentNetWeight(entry);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalSheet}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {initial.ornamentType ? 'Edit Ornament' : 'Add Ornament'}
            </Text>
            <Pressable onPress={onCancel} hitSlop={12} accessibilityLabel="Close editor">
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>ORNAMENT TYPE</Text>
            <ChipRow
              options={ORNAMENT_TYPE_OPTIONS}
              value={entry.ornamentType}
              onSelect={(v) => set('ornamentType', v)}
              error={errors.ornamentType}
              accessibilityLabel="Ornament type"
            />

            <Text style={[styles.fieldLabel, styles.fieldGap]}>PURITY</Text>
            <ChipRow
              options={PURITY_OPTIONS}
              value={entry.purity}
              onSelect={(v) => set('purity', v)}
              error={errors.purity}
              accessibilityLabel="Purity"
            />

            <View style={styles.numRow}>
              <NumField
                label="ITEM COUNT"
                value={entry.itemCount}
                onChangeText={(t) => set('itemCount', t)}
                placeholder="2"
                error={errors.itemCount}
              />
              <NumField
                label="GROSS WEIGHT"
                value={entry.grossWeight}
                onChangeText={(t) => set('grossWeight', t)}
                placeholder="45"
                suffix="g"
                error={errors.grossWeight}
              />
            </View>
            <View style={styles.numRow}>
              <NumField
                label="STONE WEIGHT"
                value={entry.stoneWeight}
                onChangeText={(t) => set('stoneWeight', t)}
                placeholder="0"
                suffix="g"
                error={errors.stoneWeight}
                optional
              />
              <NumField
                label="IMPURITY"
                value={entry.impurityPct}
                onChangeText={(t) => set('impurityPct', t)}
                placeholder="0"
                suffix="%"
                error={errors.impurityPct}
                optional
              />
            </View>

            <View style={styles.netRow} accessibilityLabel={`Net weight: ${netWeight} grams`}>
              <Text style={styles.netLabel}>Net weight (derived)</Text>
              <Text style={[styles.netValue, { color: accent }]}>{netWeight} g</Text>
            </View>

            <Text style={[styles.fieldLabel, styles.fieldGap]}>ORNAMENT PHOTO</Text>
            <Pressable
              style={[styles.photoBox, !!errors.photoUri && styles.inputWrapError]}
              onPress={choosePhoto}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={entry.photoUri ? 'Replace ornament photo' : 'Add ornament photo'}
            >
              {entry.photoUri ? (
                <>
                  <Image source={{ uri: entry.photoUri }} style={styles.photoPreview} />
                  <View style={styles.photoReplace}>
                    <Ionicons name="camera" size={14} color={Colors.textWhite} />
                    <Text style={styles.photoReplaceText}>Replace</Text>
                  </View>
                </>
              ) : (
                <View style={styles.photoEmpty}>
                  <Ionicons name="camera-outline" size={26} color={Colors.textSecondary} />
                  <Text style={styles.photoEmptyText}>Tap to capture this ornament</Text>
                </View>
              )}
            </Pressable>
            {!!errors.photoUri && <Text style={styles.fieldError}>{errors.photoUri}</Text>}

            <Text style={[styles.fieldLabel, styles.fieldGap]}>
              REMARKS <Text style={styles.optionalMark}>(optional)</Text>
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.remarksInput]}
                value={entry.remarks}
                onChangeText={(t) => set('remarks', t)}
                placeholder="e.g. broken clasp, engraved initials"
                placeholderTextColor={Colors.textDisabled}
                multiline
                accessibilityLabel="Remarks"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button title="Cancel" variant="outline" fullWidth={false} onPress={onCancel} style={styles.footerBtn} />
            <Button title="Save Ornament" onPress={save} style={styles.footerBtnMain} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function OrnamentList({ rows, onChange, accent }: OrnamentListProps) {
  const [editing, setEditing] = useState<OrnamentEntry | null>(null);

  const saveRow = (entry: OrnamentEntry) => {
    const exists = rows.some((r) => r.id === entry.id);
    onChange(exists ? rows.map((r) => (r.id === entry.id ? entry : r)) : [...rows, entry]);
    setEditing(null);
  };

  const removeRow = (entry: OrnamentEntry) => {
    Alert.alert(
      'Remove ornament?',
      `${ornamentTypeLabel(entry.ornamentType)} · ${entry.grossWeight} g will be removed from the schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onChange(rows.filter((r) => r.id !== entry.id)) },
      ],
    );
  };

  const totals = ornamentTotals(rows);

  return (
    <View style={styles.container}>
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="diamond-outline" size={30} color={Colors.textDisabled} />
          <Text style={styles.emptyTitle}>No ornaments added yet</Text>
          <Text style={styles.emptyText}>
            Add each pledged ornament with its weight, purity and photo.
          </Text>
        </View>
      ) : (
        rows.map((row, index) => (
          <View key={row.id} style={styles.rowCard}>
            {row.photoUri ? (
              <Image source={{ uri: row.photoUri }} style={styles.rowThumb} />
            ) : (
              <View style={[styles.rowThumb, styles.rowThumbEmpty]}>
                <Ionicons name="image-outline" size={18} color={Colors.textDisabled} />
              </View>
            )}
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>
                {index + 1}. {ornamentTypeLabel(row.ornamentType)} · {row.itemCount} pc
              </Text>
              <Text style={styles.rowSub}>
                {row.purity}K · gross {row.grossWeight} g · net {ornamentNetWeight(row)} g
              </Text>
              {row.remarks ? (
                <Text style={styles.rowRemarks} numberOfLines={1}>
                  {row.remarks}
                </Text>
              ) : null}
            </View>
            <View style={styles.rowActions}>
              <Pressable
                style={styles.rowActionBtn}
                onPress={() => setEditing(row)}
                hitSlop={8}
                accessibilityLabel={`Edit ornament ${index + 1}`}
              >
                <Ionicons name="pencil" size={15} color={Colors.primary} />
              </Pressable>
              <Pressable
                style={styles.rowActionBtn}
                onPress={() => removeRow(row)}
                hitSlop={8}
                accessibilityLabel={`Remove ornament ${index + 1}`}
              >
                <Ionicons name="trash-outline" size={15} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Pressable
        style={styles.addBtn}
        onPress={() => setEditing(emptyOrnament())}
        accessibilityRole="button"
        accessibilityLabel="Add ornament"
      >
        <Ionicons name="add-circle-outline" size={18} color={accent} />
        <Text style={[styles.addBtnText, { color: accent }]}>Add Ornament</Text>
      </Pressable>

      {rows.length > 0 && (
        <View style={styles.totalsCard}>
          <View style={styles.totalCol}>
            <Text style={styles.totalLabel}>Items</Text>
            <Text style={styles.totalValue}>{totals.items}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalCol}>
            <Text style={styles.totalLabel}>Gross</Text>
            <Text style={styles.totalValue}>{totals.gross} g</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalCol}>
            <Text style={styles.totalLabel}>Net</Text>
            <Text style={[styles.totalValue, { color: accent }]}>{totals.net} g</Text>
          </View>
        </View>
      )}

      {editing && (
        <OrnamentEditor
          initial={editing}
          accent={accent}
          onSave={saveRow}
          onCancel={() => setEditing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },

  empty: {
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xl,
  },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    ...Shadow.small,
  },
  rowThumb: { width: 48, height: 48, borderRadius: BorderRadius.sm, backgroundColor: Colors.backgroundLight },
  rowThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  rowSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  rowRemarks: { ...Typography.tiny, color: Colors.textDisabled, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: Spacing.xs },
  rowActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  addBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },

  totalsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  totalCol: { flex: 1, alignItems: 'center', gap: 2 },
  totalDivider: { width: 1, backgroundColor: Colors.border },
  totalLabel: { ...Typography.tiny, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary },

  // Editor modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary },
  modalBody: { padding: Spacing.md, paddingBottom: Spacing.xl },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerBtn: { minWidth: 96 },
  footerBtnMain: { flex: 1 },

  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldGap: { marginTop: Spacing.md },
  optionalMark: { textTransform: 'none', color: Colors.textDisabled },
  fieldError: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.error, marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },

  numRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  numField: { flex: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  inputWrapError: { borderColor: Colors.error },
  input: {
    flex: 1,
    height: 48,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  suffix: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary },
  remarksInput: { height: 72, textAlignVertical: 'top', paddingTop: Spacing.sm },

  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  netLabel: { ...Typography.caption, color: Colors.textSecondary },
  netValue: { fontFamily: FontFamily.bold, fontSize: FontSize.md },

  photoBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
  },
  photoEmpty: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.lg },
  photoEmptyText: { ...Typography.caption, color: Colors.textSecondary },
  photoPreview: { width: '100%', height: 150 },
  photoReplace: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  photoReplaceText: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.textWhite },
});

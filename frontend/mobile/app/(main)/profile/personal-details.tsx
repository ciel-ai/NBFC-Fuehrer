import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { Header } from '@/src/shared/components/common/Header';

const MOCK_PERSONAL = {
  fullName: 'Aravind Krishnan',
  memberSince: 'Member since Jan 2023',
  phone: '+91 98XXX XX412',
  email: 'aravind.k@example.in',
  dateOfBirth: '14 Mar 1991',
  gender: 'Male',
  currentAddress: '7B Casuarina Crest, MRC Nagar, Chennai 600028',
  permanentAddress: 'Same as current',
  employmentType: 'Salaried · Full-time',
  employer: 'Infosys Limited',
  monthlyIncome: '₹ 1,05,000',
};

type FieldKey = keyof typeof MOCK_PERSONAL;
type Tone = 'blue' | 'green' | 'amber';

interface InfoRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  fieldKey: FieldKey;
  tone: Tone;
  badge?: 'verified';
  editable?: boolean;
  multiline?: boolean;
}

const TONE_MAP: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: Colors.primary, bg: Colors.primaryLight },
  green: { fg: Colors.success, bg: Colors.successLight },
  amber: { fg: Colors.goldDark, bg: Colors.goldLight },
};

const PERSONAL_ROWS: InfoRow[] = [
  { icon: 'person-outline', label: 'Full Name', fieldKey: 'fullName', tone: 'blue', editable: true },
  { icon: 'call-outline', label: 'Phone', fieldKey: 'phone', tone: 'blue', badge: 'verified' },
  { icon: 'mail-outline', label: 'Email', fieldKey: 'email', tone: 'blue', badge: 'verified', editable: true },
  { icon: 'calendar-outline', label: 'Date of Birth', fieldKey: 'dateOfBirth', tone: 'blue' },
  { icon: 'male-female-outline', label: 'Gender', fieldKey: 'gender', tone: 'blue' },
];

const ADDRESS_ROWS: InfoRow[] = [
  { icon: 'location-outline', label: 'Current Address', fieldKey: 'currentAddress', tone: 'green', editable: true, multiline: true },
  { icon: 'home-outline', label: 'Permanent Address', fieldKey: 'permanentAddress', tone: 'green' },
];

const INCOME_ROWS: InfoRow[] = [
  { icon: 'briefcase-outline', label: 'Employment Type', fieldKey: 'employmentType', tone: 'amber' },
  { icon: 'business-outline', label: 'Employer', fieldKey: 'employer', tone: 'amber', editable: true },
  { icon: 'cash-outline', label: 'Monthly Income', fieldKey: 'monthlyIncome', tone: 'amber', editable: true },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function PersonalDetailsScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(MOCK_PERSONAL);

  const onToggleEdit = () => setIsEditing((v) => !v);

  const editButton = (
    <Pressable
      onPress={onToggleEdit}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isEditing ? 'Save changes' : 'Edit details'}
    >
      <Ionicons
        name={isEditing ? 'checkmark-circle' : 'create-outline'}
        size={scale(24)}
        color={Colors.primary}
      />
    </Pressable>
  );

  const renderRow = (row: InfoRow, isLast: boolean) => {
    const tone = TONE_MAP[row.tone];
    const editing = isEditing && row.editable;
    return (
      <View key={row.fieldKey} style={[styles.row, !isLast && styles.rowDivider]}>
        <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
          <Ionicons name={row.icon} size={scale(18)} color={tone.fg} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          {editing ? (
            <TextInput
              style={[styles.rowInput, row.multiline && styles.rowInputMulti]}
              value={form[row.fieldKey]}
              onChangeText={(t) => setForm((p) => ({ ...p, [row.fieldKey]: t }))}
              placeholderTextColor={Colors.textDisabled}
              multiline={row.multiline}
              accessibilityLabel={row.label}
            />
          ) : (
            <Text style={styles.rowValue} numberOfLines={row.multiline ? 3 : 1}>
              {form[row.fieldKey]}
            </Text>
          )}
        </View>
        {row.badge === 'verified' ? (
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={scale(12)} color={Colors.success} />
            <Text style={styles.badgeText}>Verified</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Personal Details" showBack rightComponent={editButton} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(form.fullName)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>{form.fullName}</Text>
              <Text style={styles.profileSubtitle}>{MOCK_PERSONAL.memberSince}</Text>
            </View>
          </View>

          <View style={styles.card}>
            {PERSONAL_ROWS.map((row, idx) => renderRow(row, idx === PERSONAL_ROWS.length - 1))}
          </View>

          <Text style={styles.sectionLabel}>Address</Text>
          <View style={styles.card}>
            {ADDRESS_ROWS.map((row, idx) => renderRow(row, idx === ADDRESS_ROWS.length - 1))}
          </View>

          <Text style={styles.sectionLabel}>Income & Employment</Text>
          <View style={styles.card}>
            {INCOME_ROWS.map((row, idx) => renderRow(row, idx === INCOME_ROWS.length - 1))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },

  content: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  profileSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    gap: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  rowInput: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginTop: 2,
    paddingVertical: 2,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
  },
  rowInputMulti: {
    minHeight: verticalScale(56),
    textAlignVertical: 'top',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.successLight,
  },
  badgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.success,
  },
});

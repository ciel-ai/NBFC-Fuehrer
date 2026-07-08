import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { scale, verticalScale } from '@/src/core/utils/responsive';
import { Header } from '@/src/shared/components/common/Header';

type DocStatus = 'verified' | 'approved' | 'review' | 'pending';

interface DocItem {
  id: string;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: DocStatus;
  progress: number;
  progressLabel?: string;
}

const STATUS_MAP: Record<DocStatus, { fg: string; bg: string; label: string }> = {
  verified: { fg: Colors.success, bg: Colors.successLight, label: 'Verified' },
  approved: { fg: Colors.success, bg: Colors.successLight, label: 'Approved' },
  review: { fg: Colors.goldDark, bg: Colors.goldLight, label: 'Under review' },
  pending: { fg: Colors.textSecondary, bg: '#F0F0F0', label: 'Pending' },
};

const KYC_DOCS: DocItem[] = [
  { id: 'aadhaar', label: 'Aadhaar Card', detail: 'XXXX XXXX 4521', icon: 'card-outline', status: 'verified', progress: 100 },
  { id: 'pan', label: 'PAN Card', detail: 'AXXPP1234L', icon: 'document-text-outline', status: 'verified', progress: 100 },
];

const INCOME_DOCS: DocItem[] = [
  { id: 'salary', label: 'Salary Slips', detail: '3 files · Mar, Apr, May 2026', icon: 'receipt-outline', status: 'approved', progress: 100 },
  { id: 'bank-stmt', label: 'Bank Statement', detail: '6 months · HDFC ····4521', icon: 'wallet-outline', status: 'approved', progress: 100 },
  { id: 'form16', label: 'Form 16', detail: 'FY 2023-24 · uploaded 12 May', icon: 'document-attach-outline', status: 'review', progress: 60, progressLabel: '60% verified' },
];

const PROPERTY_DOCS: DocItem[] = [
  { id: 'property', label: 'Property Agreement', detail: 'Not uploaded yet', icon: 'home-outline', status: 'pending', progress: 0 },
];

export default function DocumentsScreen() {
  const onUpload = () => {
    Alert.alert('Upload Document', 'Choose a document type to upload.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => {} },
    ]);
  };

  const onDocPress = (doc: DocItem) => {
    Alert.alert(doc.label, `${doc.detail}\nStatus: ${STATUS_MAP[doc.status].label}`);
  };

  const renderDocRow = (doc: DocItem, isLast: boolean) => {
    const status = STATUS_MAP[doc.status];
    const showProgress = doc.progress > 0 && doc.progress < 100;
    return (
      <Pressable
        key={doc.id}
        style={[styles.row, !isLast && styles.rowDivider]}
        onPress={() => onDocPress(doc)}
        android_ripple={{ color: `${Colors.primary}10` }}
        accessibilityRole="button"
        accessibilityLabel={`${doc.label}, ${doc.detail}, ${status.label}`}
      >
        <View style={styles.thumbnail}>
          <Ionicons name={doc.icon} size={scale(22)} color={Colors.textSecondary} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowValue} numberOfLines={1}>{doc.label}</Text>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.rowDetail} numberOfLines={1}>{doc.detail}</Text>
          {doc.progress > 0 ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { flex: doc.progress, backgroundColor: status.fg }]} />
                <View style={[styles.progressEmpty, { flex: 100 - doc.progress }]} />
              </View>
              {showProgress && doc.progressLabel ? (
                <Text style={[styles.progressLabel, { color: status.fg }]}>{doc.progressLabel}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Documents" showBack />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>KYC Documents</Text>
        <View style={styles.card}>
          {KYC_DOCS.map((d, idx) => renderDocRow(d, idx === KYC_DOCS.length - 1))}
        </View>

        <Text style={styles.sectionLabel}>Income Documents</Text>
        <View style={styles.card}>
          {INCOME_DOCS.map((d, idx) => renderDocRow(d, idx === INCOME_DOCS.length - 1))}
        </View>

        <Text style={styles.sectionLabel}>Property Documents</Text>
        <View style={styles.card}>
          {PROPERTY_DOCS.map((d, idx) => renderDocRow(d, idx === PROPERTY_DOCS.length - 1))}
        </View>

        <Pressable
          style={styles.ctaBtn}
          onPress={onUpload}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          accessibilityRole="button"
          accessibilityLabel="Upload a new document"
        >
          <Ionicons name="cloud-upload-outline" size={scale(18)} color={Colors.textWhite} />
          <Text style={styles.ctaBtnText}>Upload Document</Text>
        </Pressable>
      </ScrollView>
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
  thumbnail: {
    width: scale(44),
    height: verticalScale(52),
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  rowDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  progressWrap: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
  },
  progressFill: {
    height: '100%',
  },
  progressEmpty: {
    backgroundColor: Colors.backgroundLight,
  },
  progressLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },

  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    minHeight: verticalScale(48),
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  ctaBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textWhite,
  },
});

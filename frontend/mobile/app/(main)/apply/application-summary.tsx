import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import {
  buildSummaryHtml,
  buildSummarySections,
  type SummaryData,
} from '@/src/features/loans/utils/applicationSummaryHtml';
import type { OrnamentEntry } from '@/src/features/sales/config/ornaments';

// ---------------------------------------------------------------------------
// Customer copy of the application (CAM-style summary): every section the
// applicant submitted, viewable in-app and shareable as a PDF. Internal
// credit content (bureau, risk grade, deviations) is deliberately absent.
// ---------------------------------------------------------------------------

export default function ApplicationSummaryScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [sharing, setSharing] = useState(false);

  const data = useMemo<SummaryData>(() => {
    let ornaments: OrnamentEntry[] = [];
    if (params.ornamentsJson) {
      try {
        ornaments = JSON.parse(params.ornamentsJson) as OrnamentEntry[];
      } catch {
        ornaments = [];
      }
    }
    return {
      flow: params.flow === 'cdl' ? 'cdl' : 'gold',
      params,
      ornaments,
    };
  }, [params]);

  const sections = useMemo(() => buildSummarySections(data), [data]);

  const sharePdf = async () => {
    setSharing(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildSummaryHtml(data) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Loan Application Summary',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF generated at:\n${uri}`);
      }
    } catch {
      Alert.alert('Could not create PDF', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="CAM Summary" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={26} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>
            {data.flow === 'gold' ? 'Gold Loan — CAM Summary' : 'Consumer Durable — CAM Summary'}
          </Text>
          <Text style={styles.headerSub}>Your copy of the Credit Approval Memo from the details you submitted.</Text>
        </View>

        {sections.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {s.rows.map(([label, value], i) => (
              <View key={label + i}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowValue}>{value}</Text>
                </View>
                {i < s.rows.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
            {s.note ? <Text style={styles.pendingNote}>{s.note}</Text> : null}
          </View>
        ))}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.noteText}>
            This is not a sanction letter. Final terms are shared in the Key Facts Statement after
            credit approval.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={sharing ? 'Preparing PDF…' : 'Share as PDF'}
          onPress={() => { void sharePdf(); }}
          loading={sharing}
          disabled={sharing}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md },
  headerCard: {
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.small,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, textAlign: 'center' },
  headerSub: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadow.small,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  rowValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    flex: 1.4,
    textAlign: 'right',
  },
  pendingNote: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
    lineHeight: 16,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  noteText: { ...Typography.tiny, color: Colors.textSecondary, flex: 1, lineHeight: 16 },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

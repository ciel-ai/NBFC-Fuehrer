import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { CdlOverdueStatus, CdlOverdueStage } from '@/src/entities/consumerDurableLoan';

const STAGE_META: Record<CdlOverdueStage['status'], { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  done: { color: Colors.success, icon: 'checkmark-circle' },
  active: { color: Colors.gold, icon: 'alert-circle' },
  pending: { color: Colors.textDisabled, icon: 'ellipse-outline' },
};

export default function OverdueManagementScreen() {
  const { loanId } = useLocalSearchParams<{ loanId?: string }>();
  const { consumerDurableLoanService } = useServices();
  const [status, setStatus] = useState<CdlOverdueStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await consumerDurableLoanService.getOverdueStatus(loanId ?? 'L1');
        if (mounted) setStatus(data);
      } catch {
        if (mounted) Alert.alert('Could not load overdue status', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
  }, [consumerDurableLoanService, loanId]);

  if (loading || !status) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Overdue Management" showBack />
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Overdue Management" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{status.daysOverdue}</Text>
            <Text style={styles.summaryKey}>Days overdue</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>{formatCurrency(status.penaltyAccrued)}</Text>
            <Text style={styles.summaryKey}>Penalty accrued</Text>
          </View>
        </View>

        <View style={styles.timeline}>
          {status.stages.map((stage, index) => {
            const meta = STAGE_META[stage.status];
            const isLast = index === status.stages.length - 1;
            return (
              <View key={`${stage.day}-${stage.label}`} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.dayBadge, { borderColor: meta.color }]}>
                    <Text style={[styles.dayText, { color: meta.color }]}>D{stage.day}</Text>
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineCard}>
                  <View style={styles.timelineHeader}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                    <Text style={styles.stageLabel}>{stage.label}</Text>
                  </View>
                  <Text style={styles.stageDesc}>{stage.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Day 30 onward (NPA + legal) is handled by the recovery team. Pay now to halt escalation.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Pay Overdue EMI"
          onPress={() =>
            router.replace({ pathname: '/(main)/loan-detail/pay-emi', params: { loanId: loanId ?? 'L1' } })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  summaryCard: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.textPrimary },
  summaryKey: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: Spacing.md },
  timelineLeft: { alignItems: 'center', width: 44 },
  dayBadge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  dayText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.border, minHeight: 20 },
  timelineCard: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadow.small },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stageLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  stageDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  infoText: { ...Typography.caption, flex: 1, color: Colors.primary, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

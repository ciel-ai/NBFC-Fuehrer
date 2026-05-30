import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { InfoBanner } from '@/src/features/agent/components/InfoBanner';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { LegalNoticeRecord, LegalNoticeStage } from '@/src/entities/agent';

const STAGE_META: Record<LegalNoticeStage['status'], { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  done: { color: Colors.success, icon: 'checkmark-circle' },
  active: { color: Colors.gold, icon: 'time' },
  pending: { color: Colors.textDisabled, icon: 'ellipse-outline' },
};

export default function LegalNoticeScreen() {
  const insets = useSafeAreaInsets();
  const { loanId } = useLocalSearchParams<{ loanId?: string }>();
  const { agentService } = useServices();
  const [record, setRecord] = useState<LegalNoticeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const id = loanId ?? 'LOS-HL-19121';

  useEffect(() => {
    let mounted = true;
    agentService
      .getLegalNotice(id)
      .then((r) => { if (mounted) setRecord(r); })
      .catch(() => { if (mounted) Alert.alert('Legal notice unavailable', 'Please try again.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [agentService, id]);

  const advance = async () => {
    setAdvancing(true);
    try {
      const r = await agentService.advanceLegalNotice(id);
      setRecord(r);
    } catch {
      Alert.alert('Update failed', 'Please try again.');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading || !record) {
    return (
      <View style={styles.container}>
        <AppHeader title="Legal Notice" subtitle={id} />
        <View style={styles.center}><LoadingSpinner size={40} color={Colors.primary} /></View>
      </View>
    );
  }

  const allDone = record.stages.every((s) => s.status === 'done');

  return (
    <View style={styles.container}>
      <AppHeader title="Legal Notice" subtitle={id} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          <InfoBanner
            tone="error"
            title="30+ days overdue — legal track"
            message="Housing-loan accounts 30+ days overdue enter the legal-notice workflow. Track each stage here."
          />
          <View style={{ height: Spacing.md }} />

          <AgentSection title="Case">
            <ReviewDetailRow label="Notice ID" value={record.noticeId} />
            <ReviewDetailRow label="Days overdue" value={`${record.daysOverdue} days`} valueColor={Colors.error} />
            <ReviewDetailRow label="Current stage" value={record.currentStage} divider={false} />
          </AgentSection>

          <AgentSection title="Legal notice stages">
            {record.stages.map((s, i) => {
              const meta = STAGE_META[s.status];
              const isLast = i === record.stages.length - 1;
              return (
                <View key={s.stage} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineInfo}>
                    <Text style={[styles.stageLabel, s.status === 'pending' && { color: Colors.textSecondary }]}>{s.stage}</Text>
                    <Text style={styles.stageDate}>{s.date ?? 'Not yet issued'}</Text>
                  </View>
                </View>
              );
            })}
          </AgentSection>
        </ScrollView>

        <View style={styles.footer}>
          {!allDone ? (
            <Button title={advancing ? 'Updating…' : 'Advance legal stage'} loading={advancing} disabled={advancing} onPress={advance} />
          ) : (
            <Button title="Done" onPress={() => router.back()} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  timelineRow: { flexDirection: 'row', gap: Spacing.md },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.border, minHeight: 24, marginTop: 2 },
  timelineInfo: { flex: 1, paddingBottom: Spacing.md },
  stageLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  stageDate: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
});

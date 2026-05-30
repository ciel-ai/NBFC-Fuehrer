import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { InfoBanner } from '@/src/features/agent/components/InfoBanner';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { GoldAuctionRecord, GoldAuctionStatus } from '@/src/entities/agent';

const STATUS_FLOW: GoldAuctionStatus[] = ['initiated', 'valuation', 'scheduled', 'completed'];
const STATUS_LABEL: Record<GoldAuctionStatus, string> = {
  initiated: 'Auction initiated',
  valuation: 'Re-valuation done',
  scheduled: 'Auction scheduled',
  completed: 'Auction completed',
};

export default function GoldAuctionScreen() {
  const insets = useSafeAreaInsets();
  const { loanId } = useLocalSearchParams<{ loanId?: string }>();
  const { agentService } = useServices();
  const [record, setRecord] = useState<GoldAuctionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const id = loanId ?? 'LOS-GL-19012';

  useEffect(() => {
    let mounted = true;
    agentService
      .initiateGoldAuction(id)
      .then((r) => { if (mounted) setRecord(r); })
      .catch(() => { if (mounted) Alert.alert('Auction unavailable', 'Please try again.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [agentService, id]);

  const advance = async () => {
    if (!record) return;
    const idx = STATUS_FLOW.indexOf(record.status);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    if (next === record.status) return;
    setUpdating(true);
    try {
      const r = await agentService.updateAuctionStatus(id, next);
      setRecord(r);
    } catch {
      Alert.alert('Update failed', 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !record) {
    return (
      <View style={styles.container}>
        <AppHeader title="Gold Auction" subtitle={id} />
        <View style={styles.center}><LoadingSpinner size={40} color={Colors.primary} /></View>
      </View>
    );
  }

  const isComplete = record.status === 'completed';

  return (
    <View style={styles.container}>
      <AppHeader title="Gold Auction" subtitle={id} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          <InfoBanner
            tone="error"
            title="90+ days overdue"
            message="Gold-loan auction is triggered only after 90 days overdue, per RBI gold-loan guidelines."
          />
          <View style={{ height: Spacing.md }} />

          <AgentSection title="Auction details">
            <ReviewDetailRow label="Auction ID" value={record.auctionId} />
            <ReviewDetailRow label="Days overdue" value={`${record.daysOverdue} days`} valueColor={Colors.error} />
            <ReviewDetailRow label="Outstanding" value={formatCurrency(record.outstanding)} valueColor={Colors.error} />
            <ReviewDetailRow label="Reserve price" value={formatCurrency(record.reservePrice)} valueColor={Colors.goldDark} />
            <ReviewDetailRow label="Auction date" value={record.auctionDate ?? 'To be scheduled'} />
            <ReviewDetailRow label="Status" value={STATUS_LABEL[record.status]} divider={false} />
          </AgentSection>

          <AgentSection title="Auction progress">
            {STATUS_FLOW.map((s, i) => {
              const done = STATUS_FLOW.indexOf(record.status) >= i;
              return (
                <View key={s} style={styles.stepRow}>
                  <View style={[styles.stepDot, done && styles.stepDotDone]} />
                  <Text style={[styles.stepText, done && styles.stepTextDone]}>{STATUS_LABEL[s]}</Text>
                </View>
              );
            })}
          </AgentSection>
        </ScrollView>

        <View style={styles.footer}>
          {!isComplete ? (
            <Button
              title={updating ? 'Updating…' : `Advance to: ${STATUS_LABEL[STATUS_FLOW[STATUS_FLOW.indexOf(record.status) + 1]]}`}
              loading={updating}
              disabled={updating}
              onPress={advance}
            />
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
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border },
  stepDotDone: { backgroundColor: Colors.success },
  stepText: { ...Typography.body, color: Colors.textSecondary },
  stepTextDone: { color: Colors.textPrimary, fontFamily: FontFamily.semiBold },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});

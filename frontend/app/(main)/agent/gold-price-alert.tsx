import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
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
import { formatCurrency } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { GoldPriceAlert } from '@/src/entities/agent';

type Outcome = 'top_up_promised' | 'repayment_promised' | 'no_answer';
const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'top_up_promised', label: 'Top-up promised' },
  { id: 'repayment_promised', label: 'Repayment promised' },
  { id: 'no_answer', label: 'No answer' },
];

export default function GoldPriceAlertScreen() {
  const insets = useSafeAreaInsets();
  const { loanId } = useLocalSearchParams<{ loanId?: string }>();
  const { agentService } = useServices();
  const [alert, setAlert] = useState<GoldPriceAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [saving, setSaving] = useState(false);

  const id = loanId ?? 'LOS-GL-19211';

  useEffect(() => {
    let mounted = true;
    agentService
      .getGoldPriceAlert(id)
      .then((r) => { if (mounted) setAlert(r); })
      .catch(() => { if (mounted) Alert.alert('Alert unavailable', 'Please try again.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [agentService, id]);

  const save = async () => {
    if (!outcome) {
      Alert.alert('Select an outcome', 'Please choose what the customer committed to.');
      return;
    }
    setSaving(true);
    try {
      const res = await agentService.logCallOutcome(id, outcome);
      Alert.alert('Outcome logged', res.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !alert) {
    return (
      <View style={styles.container}>
        <AppHeader title="Gold Price Alert" subtitle={id} />
        <View style={styles.center}><LoadingSpinner size={40} color={Colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Gold Price Alert" subtitle={id} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          <InfoBanner
            tone="error"
            title={`LTV breached ${alert.thresholdLtv}%`}
            message="Gold value has fallen and LTV now exceeds the 90% threshold. Contact the customer for a top-up or partial repayment."
          />
          <View style={{ height: Spacing.md }} />

          <View style={styles.ltvCard}>
            <Text style={styles.ltvLabel}>Current LTV</Text>
            <Text style={styles.ltvValue}>{alert.currentLtv}%</Text>
            <Text style={styles.ltvSub}>Threshold {alert.thresholdLtv}%</Text>
          </View>

          <AgentSection title="Account">
            <ReviewDetailRow label="Customer" value={alert.customerName} />
            <ReviewDetailRow label="Outstanding" value={formatCurrency(alert.outstanding)} />
            <ReviewDetailRow label="Current gold value" value={formatCurrency(alert.currentGoldValue)} />
            <ReviewDetailRow label="Top-up required" value={formatCurrency(alert.topUpRequired)} valueColor={Colors.error} divider={false} />
          </AgentSection>

          <AgentSection title="Log customer response">
            <View style={styles.outcomeRow}>
              {OUTCOMES.map((o) => {
                const active = outcome === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setOutcome(o.id)}
                    style={[styles.outcomeChip, active && styles.outcomeChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.outcomeText, active && styles.outcomeTextActive]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </AgentSection>
        </ScrollView>

        <View style={styles.footer}>
          <Button title={saving ? 'Saving…' : 'Log outcome'} loading={saving} disabled={saving} onPress={save} />
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
  ltvCard: { alignItems: 'center', backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  ltvLabel: { ...Typography.caption, color: Colors.error },
  ltvValue: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], color: Colors.error, marginVertical: 2 },
  ltvSub: { ...Typography.tiny, color: Colors.error },
  outcomeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  outcomeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  outcomeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  outcomeText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary },
  outcomeTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
});

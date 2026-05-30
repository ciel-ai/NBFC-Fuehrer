import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { GoldLoanMonitoring } from '@/src/entities/goldLoan';

export default function GoldMonitoringScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { goldLoanService } = useServices();
  const [data, setData] = useState<GoldLoanMonitoring | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await goldLoanService.getMonitoring(id ?? 'gold_loan_001');
        if (mounted) setData(result);
      } catch {
        if (mounted) Alert.alert('Monitoring unavailable', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [goldLoanService, id]);

  const ltvPercent = Math.round((data?.ltvRatio ?? 0) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Gold Price Monitoring" showBack />
      {loading || !data ? (
        <View style={styles.center}>
          <LoadingSpinner size={40} color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.ltvCard, data.alertTriggered && styles.ltvCardAlert]}>
            <Text style={styles.ltvLabel}>Current LTV</Text>
            <Text style={[styles.ltvValue, data.alertTriggered && { color: Colors.error }]}>{ltvPercent}%</Text>
            <Text style={styles.ltvSub}>
              {data.alertTriggered ? 'Agent alert triggered above 90%' : 'Within monitoring threshold'}
            </Text>
          </View>

          <View style={styles.card}>
            {[
              ['Current gold value', formatCurrency(data.currentGoldValue)],
              ['Outstanding amount', formatCurrency(data.outstandingAmount)],
              ['Alert threshold', '90% LTV'],
              ['Last IBJA check', formatDate(data.lastCheckedAt)],
            ].map(([label, value], index, arr) => (
              <View key={label}>
                <View style={styles.row}>
                  <Text style={styles.key}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
                {index < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="analytics-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>Monthly IBJA checks should be scheduled by backend. The frontend shows the latest result and alert status.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  ltvCard: { alignItems: 'center', backgroundColor: Colors.successLight, borderRadius: BorderRadius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.success },
  ltvCardAlert: { backgroundColor: Colors.errorLight, borderColor: Colors.error },
  ltvLabel: { ...Typography.caption, color: Colors.textSecondary },
  ltvValue: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], color: Colors.success },
  ltvSub: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  infoText: { ...Typography.caption, color: Colors.primary, flex: 1, lineHeight: 18 },
});

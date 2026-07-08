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
import type { GoldLoanDisbursalStatus } from '@/src/entities/goldLoan';

export default function GoldLoanDisbursalScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { goldLoanService } = useServices();
  const [status, setStatus] = useState<GoldLoanDisbursalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await goldLoanService.getDisbursalStatus(params.applicationId ?? 'gold_mock_application');
        if (mounted) setStatus(data);
      } catch {
        if (mounted) Alert.alert('Disbursal status unavailable', 'Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [goldLoanService, params.applicationId]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Disbursal & Vault" showBack />
      {loading || !status ? (
        <View style={styles.center}>
          <LoadingSpinner size={42} color={Colors.primary} />
          <Text style={styles.loadingText}>Checking Razorpay payout and vault receipt...</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.successCard}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={44} color={Colors.textWhite} />
              </View>
              <Text style={styles.title}>Loan disbursed</Text>
              <Text style={styles.amount}>{formatCurrency(status.amount)}</Text>
              <Text style={styles.subtitle}>Credited to {status.bankAccount}</Text>
            </View>

            <View style={styles.card}>
              {[
                ['Payout ID', status.payoutId],
                ['Payout provider', 'Razorpay'],
                ['Status', 'Completed'],
                ['Vault receipt', status.vaultReceiptId],
                ['Vault location', status.vaultName],
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
              <Ionicons name="lock-closed" size={16} color={Colors.success} />
              <Text style={styles.infoText}>Gold is marked as stored in the secured branch vault. The backend should persist the receipt and agreement documents.</Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button title="Go to Loan Dashboard" onPress={() => router.replace('/(main)/(tabs)/loans')} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  loadingText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  successCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  successCircle: { width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary },
  amount: { fontFamily: FontFamily.bold, fontSize: FontSize['5xl'], color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.md },
  key: { ...Typography.body, color: Colors.textSecondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.successLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  infoText: { ...Typography.caption, color: Colors.success, flex: 1, lineHeight: 18 },
  footer: { padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});

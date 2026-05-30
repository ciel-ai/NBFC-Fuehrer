import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/src/core/theme/colors';
import { Spacing } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { AgentSection } from '@/src/features/agent/components/AgentSection';
import { ReviewDetailRow } from '@/src/features/agent/components/ReviewDetailRow';
import { useUserStore } from '@/src/store/userStore';

export default function AgentDetailsScreen() {
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);

  return (
    <View style={styles.container}>
      <AppHeader title="Agent Details" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]} showsVerticalScrollIndicator={false}>
        <AgentSection title="Identity">
          <ReviewDetailRow label="Name" value={user?.name ?? 'Agent'} />
          <ReviewDetailRow label="Agent ID" value={user?.id ?? 'AGT-00000'} />
          <ReviewDetailRow label="Role" value="Field Agent" />
          <ReviewDetailRow label="Status" value="Active" valueColor={Colors.success} divider={false} />
        </AgentSection>

        <AgentSection title="Contact">
          <ReviewDetailRow label="Phone" value={user?.phone ?? '+91 98XX XXX XXX'} />
          <ReviewDetailRow label="Email" value={user?.email ?? 'agent@fuehrer.in'} divider={false} />
        </AgentSection>

        <AgentSection title="Posting">
          <ReviewDetailRow label="Branch" value="Bengaluru · Indiranagar" />
          <ReviewDetailRow label="Reporting manager" value="Senior Recovery Officer" />
          <ReviewDetailRow label="Joined" value="12 Jan 2024" divider={false} />
        </AgentSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
});

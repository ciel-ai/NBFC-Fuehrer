import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { AppHeader } from '@/src/shared/components/shared/AppHeader';
import { scale } from '@/src/core/utils/responsive';
import { useUserStore } from '@/src/store/userStore';
import { useAuthStore } from '@/src/store/authStore';

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isDanger?: boolean;
}

export default function AgentProfileScreen() {
  const user = useUserStore((s) => s.user);
  const agentName = user?.name ?? 'Agent';
  const agentId = user?.id ?? 'AGT-00000';

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await useAuthStore.getState().logout();
          router.replace('/(public)');
        },
      },
    ]);
  };

  const menu: MenuItem[] = [
    { id: 'details', title: 'Agent Details', icon: 'person-outline', onPress: () => router.push('/(main)/agent/profile/agent-details') },
    { id: 'security', title: 'Security & Privacy', icon: 'shield-checkmark-outline', onPress: () => router.push('/(main)/agent/profile/security') },
    { id: 'notifs', title: 'Notification Settings', icon: 'notifications-outline', onPress: () => router.push('/(main)/agent/profile/notification-settings') },
    { id: 'help', title: 'Help & Support', icon: 'help-circle-outline', onPress: () => router.push('/(main)/agent/profile/help-support') },
    { id: 'about', title: 'About Fuehrer NBFC', icon: 'information-circle-outline', onPress: () => Alert.alert('Fuehrer NBFC', 'Agent app v1.0.0') },
    { id: 'logout', title: 'Sign out', icon: 'log-out-outline', onPress: handleLogout, isDanger: true },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Profile" showBack onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Agent card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{agentName[0]?.toUpperCase() ?? 'A'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{agentName}</Text>
            <Text style={styles.profileId}>ID: {agentId}</Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>Field Agent · Active</Text>
            </View>
          </View>
        </View>

        {/* Performance snapshot */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>22</Text>
            <Text style={styles.statLabel}>Pending cases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.success }]}>7</Text>
            <Text style={styles.statLabel}>Resolved today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.goldDark }]}>3</Text>
            <Text style={styles.statLabel}>Site visits</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menu.map((item, index) => (
            <React.Fragment key={item.id}>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: Colors.backgroundLight }]}
                onPress={item.onPress}
                android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={[styles.menuIcon, item.isDanger && styles.menuIconDanger]}>
                  <Ionicons name={item.icon} size={scale(18)} color={item.isDanger ? Colors.error : Colors.textSecondary} />
                </View>
                <Text style={[styles.menuTitle, item.isDanger && styles.menuTitleDanger]}>{item.title}</Text>
                {!item.isDanger && <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textDisabled} />}
              </Pressable>
              {index < menu.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.versionText}>Fuehrer NBFC — Agent v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.medium, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: scale(60), height: scale(60), borderRadius: scale(30), backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: 2 },
  profileId: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: Colors.successLight, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  roleText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.success },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  statValue: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.primary },
  statLabel: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  menuCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  menuIcon: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: Colors.backgroundLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  menuIconDanger: { backgroundColor: Colors.errorLight },
  menuTitle: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary },
  menuTitleDanger: { color: Colors.error },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 68 },
  versionText: { textAlign: 'center', ...Typography.caption, color: Colors.textDisabled, marginTop: Spacing.sm },
});

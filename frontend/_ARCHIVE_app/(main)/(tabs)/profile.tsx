import React from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { useServices } from '@/src/core/services/ServiceProvider';
import { scale } from '@/src/core/utils/responsive';

interface ProfileMenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isDanger?: boolean;
}

export default function ProfileScreen() {
  const user = useUserStore((s) => s.user);
  const logoutAction = useAuthStore((s) => s.logout);
  const { authService } = useServices();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            await logoutAction();
          },
        },
      ]
    );
  };

  const menuItems: ProfileMenuItem[] = [
    { id: 'personal', title: 'Personal Details', icon: 'person-outline', onPress: () => router.push('/(main)/profile/personal-details') },
    { id: 'bank', title: 'Bank Accounts', icon: 'card-outline', onPress: () => router.push('/(main)/profile/bank-accounts') },
    { id: 'documents', title: 'Documents', icon: 'document-outline', onPress: () => router.push('/(main)/profile/documents') },
    { id: 'security', title: 'Security & Privacy', icon: 'shield-checkmark-outline', onPress: () => router.push('/(main)/profile/security-privacy') },
    { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', onPress: () => router.push('/(main)/profile/notifications') },
    { id: 'help', title: 'Help & Support', icon: 'help-circle-outline', onPress: () => router.push('/(main)/profile/help-support') },
    { id: 'about', title: 'About Fuehrer NBFC', icon: 'information-circle-outline', onPress: () => {} },
    { id: 'logout', title: 'Logout', icon: 'log-out-outline', onPress: handleLogout, isDanger: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.profilePhone}>{user?.phone ?? ''}</Text>
            <View style={styles.kycBadge}>
              <Ionicons name="checkmark-circle" size={scale(12)} color={Colors.textWhite} />
              <Text style={styles.kycText}>KYC Verified</Text>
            </View>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: Colors.backgroundLight }]}
                onPress={item.onPress}
                android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={[styles.menuIcon, item.isDanger && styles.menuIconDanger]}>
                  <Ionicons
                    name={item.icon}
                    size={scale(18)}
                    color={item.isDanger ? Colors.error : Colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuTitle, item.isDanger && styles.menuTitleDanger]}>
                  {item.title}
                </Text>
                {!item.isDanger && (
                  <Ionicons name="chevron-forward" size={scale(16)} color={Colors.textDisabled} />
                )}
              </Pressable>
              {index < menuItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.versionText}>Fuehrer NBFC v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.textPrimary },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    margin: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  avatarLarge: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.textWhite },
  profileName: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textWhite, marginBottom: 2 },
  profilePhone: { fontFamily: FontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,0.78)', marginBottom: 6 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kycText: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.textWhite },
  menuCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  menuIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuIconDanger: { backgroundColor: Colors.errorLight },
  menuTitle: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary },
  menuTitleDanger: { color: Colors.error },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 68 },
  versionText: {
    textAlign: 'center',
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textDisabled,
    marginBottom: Spacing.xl,
  },
});

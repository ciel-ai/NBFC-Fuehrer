import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';

interface PermissionItem {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PERMISSIONS: PermissionItem[] = [
  {
    key: 'location',
    title: 'Location',
    description:
      'Used to verify your address and find nearby branches & ATMs.',
    icon: 'location',
  },
  {
    key: 'camera',
    title: 'Camera',
    description:
      'Required to scan documents, capture ID proof and selfie for KYC verification.',
    icon: 'camera',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description:
      'Receive real-time updates on loan status, EMI reminders and offers.',
    icon: 'notifications',
  },
  {
    key: 'storage',
    title: 'Storage',
    description:
      'Upload income proof, bank statements and other documents from your device.',
    icon: 'document-attach',
  },
];

type Status = 'granted' | 'denied' | 'undetermined';
type PermissionState = Record<string, Status>;

export default function AppPermissionsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [statuses, setStatuses] = useState<PermissionState>(
    Object.fromEntries(PERMISSIONS.map((p) => [p.key, 'undetermined']))
  );

  const hasDenied = hasAttempted && PERMISSIONS.some((p) => statuses[p.key] === 'denied');

  const requestPermission = useCallback(async (key: string) => {
    setIsLoading(true);
    let newStatus: Status = 'denied';

    try {
      if (key === 'location') {
        if (Platform.OS !== 'web') {
          const Location = await import('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          newStatus = status === 'granted' ? 'granted' : 'denied';
        } else {
          newStatus = 'granted';
        }
      } else if (key === 'camera') {
        if (Platform.OS !== 'web') {
          const CameraModule = await import('expo-camera');
          const { status } = await CameraModule.Camera.requestCameraPermissionsAsync();
          newStatus = status === 'granted' ? 'granted' : 'denied';
        } else {
          newStatus = 'granted';
        }
      } else if (key === 'notifications') {
        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.requestPermissionsAsync();
        newStatus = status === 'granted' ? 'granted' : 'denied';
      } else if (key === 'storage') {
        if (Platform.OS !== 'web') {
          const MediaLibrary = await import('expo-media-library');
          const { status } = await MediaLibrary.requestPermissionsAsync();
          newStatus = status === 'granted' ? 'granted' : 'denied';
        } else {
          newStatus = 'granted';
        }
      }
    } catch {
      newStatus = 'denied';
    }

    setStatuses((prev) => ({ ...prev, [key]: newStatus }));
    setIsLoading(false);
    setHasAttempted(true);
  }, []);

  const handleContinue = () => {
    const OPTIONAL_PERMISSIONS = ['notifications', 'storage'];
const allOk = PERMISSIONS.every((p) => 
  statuses[p.key] === 'granted' || OPTIONAL_PERMISSIONS.includes(p.key)
);

    if (allOk) {
      router.push('/(auth)/role-select');
    } else {
      const denied = PERMISSIONS.filter((p) => statuses[p.key] !== 'granted')
        .map((p) => p.title)
        .join(', ');

      Alert.alert(
        'Permissions Required',
        `The following permissions are mandatory to use this app: ${denied}.\n\nPlease grant them by tapping on each item, or from your device settings if previously denied.`,
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const getStatusIcon = (status: Status): keyof typeof Ionicons.glyphMap => {
    if (status === 'granted') return 'checkmark-circle';
    if (status === 'denied') return 'close-circle';
    return 'ellipse-outline';
  };

  const getStatusColor = (status: Status) => {
    if (status === 'granted') return Colors.success;
    if (status === 'denied') return Colors.error;
    return Colors.textDisabled;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>App permissions</Text>
        <Text style={styles.subtitle}>
          All permissions are required to use this app. Please grant access to continue.
        </Text>

        <View style={styles.permissionList}>
          {PERMISSIONS.map((item, index) => {
            const status = statuses[item.key];
            return (
              <React.Fragment key={item.key}>
                <TouchableOpacity 
                  style={styles.permissionRow}
                  onPress={() => requestPermission(item.key)}
                  disabled={status === 'granted' || isLoading}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconCircle,
                    hasAttempted && status === 'denied' && styles.iconCircleDenied,
                  ]}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={hasAttempted && status === 'denied' ? Colors.error : Colors.primary}
                    />
                  </View>
                  <View style={styles.permissionContent}>
                    <View style={styles.permissionTitleRow}>
                      <Text style={styles.permissionTitle}>
                        {item.title}
                        <Text style={styles.requiredStar}> *</Text>
                      </Text>
                      <Ionicons
                        name={getStatusIcon(status)}
                        size={16}
                        color={getStatusColor(status)}
                      />
                    </View>
                    <Text style={styles.permissionDescription}>
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
                {index < PERMISSIONS.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {hasDenied && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={18} color={Colors.error} />
            <Text style={styles.warningText}>
              Some permissions were denied. All permissions are mandatory. Please tap
              the denied permissions again or go to Settings to grant them manually.
            </Text>
          </View>
        )}

        <Text style={styles.privacyNote}>
          🔒 Your data is encrypted and handled as per RBI guidelines. We never
          share your information with third parties without your consent.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
          disabled={isLoading}
        />
        {hasDenied && (
          <Button
            title="Open Device Settings"
            onPress={() => Linking.openSettings()}
            style={styles.settingsButton}
          />
        )}
        <Text style={styles.mandatoryNote}>
          * All permissions are mandatory
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  permissionList: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  iconCircleDenied: {
    backgroundColor: Colors.errorLight,
  },
  permissionContent: { flex: 1 },
  permissionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  permissionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  requiredStar: {
    color: Colors.error,
    fontFamily: FontFamily.bold,
  },
  permissionDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 72,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warningText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.error,
    lineHeight: 18,
  },
  privacyNote: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  settingsButton: {
    backgroundColor: Colors.backgroundLight,
  },
  mandatoryNote: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textDisabled,
    marginTop: Spacing.xs,
  },
});

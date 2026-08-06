import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { BorderRadius, Spacing } from '@/src/core/theme/spacing';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { scale } from '@/src/core/utils/responsive';

type NetworkState = 'online' | 'offline' | 'slow';

export function NetworkStateBanner() {
  const [networkState, setNetworkState] = useState<NetworkState>('online');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const getState = (): NetworkState => {
      if (!window.navigator.onLine) return 'offline';
      const connection = (window.navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      const downlink = connection?.downlink;
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || (typeof downlink === 'number' && downlink < 0.7)) {
        return 'slow';
      }
      return 'online';
    };

    const update = () => setNetworkState(getState());
    const connection = (window.navigator as any).connection;

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    connection?.addEventListener?.('change', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      connection?.removeEventListener?.('change', update);
    };
  }, []);

  if (networkState === 'online') return null;

  const isOffline = networkState === 'offline';

  return (
    <View
      style={[styles.banner, isOffline ? styles.offline : styles.slow]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'speedometer-outline'}
        size={scale(18)}
        color={isOffline ? Colors.goldDark : Colors.primary}
      />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: isOffline ? Colors.goldDark : Colors.primary }]}>
          {isOffline ? 'No internet connection' : 'Slow network'}
        </Text>
        <Text style={styles.message}>
          {isOffline ? 'Some actions may be saved offline.' : 'Requests may take longer than usual.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    top: Spacing.md,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  offline: {
    backgroundColor: Colors.goldLight,
    borderColor: '#FCD34D',
  },
  slow: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#BFDBFE',
  },
  copy: { flex: 1 },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  message: {
    ...Typography.tiny,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});

export default NetworkStateBanner;

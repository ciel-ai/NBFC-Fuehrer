import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Badge } from './Badge';

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  isComingSoon?: boolean;
}

export function ComingSoonOverlay({ children, isComingSoon = true }: ComingSoonOverlayProps) {
  if (!isComingSoon) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.dimmed}>{children}</View>
      <View style={styles.badgeContainer}>
        <Badge label="Coming Soon" variant="comingSoon" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dimmed: {
    opacity: 0.6,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
});

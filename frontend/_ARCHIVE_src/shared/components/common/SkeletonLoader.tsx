import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius } from '@/src/core/theme/spacing';

interface SkeletonLoaderProps {
  /** Preset layout to render */
  variant: 'card' | 'list-item' | 'detail-header';
  /** Number of items to repeat (for card/list-item) */
  count?: number;
}

function CardSkeleton() {
  return (
    <SkeletonPlaceholder borderRadius={BorderRadius.md} backgroundColor={Colors.border} highlightColor={Colors.backgroundLight}>
      <SkeletonPlaceholder.Item marginBottom={Spacing.md}>
        <SkeletonPlaceholder.Item
          height={140}
          borderRadius={BorderRadius.lg}
          marginBottom={Spacing.sm}
        />
        <SkeletonPlaceholder.Item height={16} width="70%" marginBottom={Spacing.xs} />
        <SkeletonPlaceholder.Item height={12} width="40%" />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  );
}

function ListItemSkeleton() {
  return (
    <SkeletonPlaceholder borderRadius={BorderRadius.md} backgroundColor={Colors.border} highlightColor={Colors.backgroundLight}>
      <SkeletonPlaceholder.Item
        flexDirection="row"
        alignItems="center"
        marginBottom={Spacing.md}
      >
        <SkeletonPlaceholder.Item width={44} height={44} borderRadius={22} />
        <SkeletonPlaceholder.Item marginLeft={Spacing.md} flex={1}>
          <SkeletonPlaceholder.Item height={14} width="60%" marginBottom={Spacing.xs} />
          <SkeletonPlaceholder.Item height={11} width="35%" />
        </SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item width={60} height={14} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  );
}

function DetailHeaderSkeleton() {
  return (
    <SkeletonPlaceholder borderRadius={BorderRadius.md} backgroundColor={Colors.border} highlightColor={Colors.backgroundLight}>
      <SkeletonPlaceholder.Item padding={Spacing.md}>
        <SkeletonPlaceholder.Item
          height={120}
          borderRadius={BorderRadius.lg}
          marginBottom={Spacing.md}
        />
        <SkeletonPlaceholder.Item height={18} width="50%" marginBottom={Spacing.sm} />
        <SkeletonPlaceholder.Item height={13} width="80%" marginBottom={Spacing.xs} />
        <SkeletonPlaceholder.Item height={13} width="65%" marginBottom={Spacing.lg} />
        <SkeletonPlaceholder.Item height={44} borderRadius={BorderRadius.lg} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  );
}

export function SkeletonLoader({ variant, count = 3 }: SkeletonLoaderProps) {
  if (variant === 'detail-header') {
    return <DetailHeaderSkeleton />;
  }

  const ItemComponent = variant === 'card' ? CardSkeleton : ListItemSkeleton;

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <ItemComponent key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
  },
});

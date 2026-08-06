import React from 'react';
import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStateView } from '@/src/shared/components/common/AppStateView';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'document-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <AppStateView
      state={icon === 'search-outline' ? 'noSearchResults' : 'empty'}
      title={title}
      message={subtitle}
      actionLabel={actionLabel}
      onAction={onAction}
      style={style}
    />
  );
}

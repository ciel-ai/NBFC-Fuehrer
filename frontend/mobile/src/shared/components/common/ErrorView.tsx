import React from 'react';
import { AppStateView } from '@/src/shared/components/common/AppStateView';

interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
}

export function ErrorView({
  title = 'Something went wrong',
  message = 'We could not load the data. Please try again.',
  onRetry,
  retryLabel = 'Retry',
}: ErrorViewProps) {
  return (
    <AppStateView
      state="error"
      title={title}
      message={message}
      actionLabel={retryLabel}
      onAction={onRetry}
      compact
    />
  );
}

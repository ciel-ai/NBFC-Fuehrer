import React from 'react';
import { router } from 'expo-router';
import { AppStateView } from '@/src/shared/components/common/AppStateView';

export default function UnauthorizedScreen() {
  return (
    <AppStateView
      state="permissionDenied"
      title="Access restricted"
      message="Your account does not have permission to open this screen. If you believe this is a mistake, contact your administrator."
      actionLabel="Go back"
      onAction={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}

import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { useAuthGuard } from '@/src/shared/hooks/useAuthGuard';
import { useOfflineFlush } from '@/src/features/sales/hooks/useOfflineFlush';

export default function MainLayout() {
  const segments = useSegments();
  // Block sales agents (and unauthenticated users) from the customer app.
  const authorized = useAuthGuard(['customer']);
  // Drain any queued customer money-movement ops (e.g. a NACH registered while
  // offline) as soon as connectivity returns.
  useOfflineFlush();

  // Android back button handling
  useEffect(() => {
    const onBackPress = () => {
      // If on home tab, exit app
      const isHomeTab = segments.includes('home' as never);
      const isTabRoot = segments.length <= 3;

      if (isHomeTab && isTabRoot) {
        BackHandler.exitApp();
        return true;
      }

      if (router.canGoBack()) {
        router.back();
        return true;
      }

      BackHandler.exitApp();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [segments]);

  if (!authorized) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    />
  );
}

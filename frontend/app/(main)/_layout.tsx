import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';

export default function MainLayout() {
  const segments = useSegments();

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

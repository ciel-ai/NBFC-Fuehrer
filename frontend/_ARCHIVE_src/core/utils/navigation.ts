import { router } from 'expo-router';

/**
 * Safely navigates back in Expo Router.
 * If there is no navigation history, it falls back to the provided route.
 * 
 * @param fallbackRoute The route to navigate to if canGoBack is false. Defaults to '/(main)/(tabs)/home'.
 */
export const safeBack = (fallbackRoute: string = '/(main)/(tabs)/home') => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackRoute as any);
  }
};

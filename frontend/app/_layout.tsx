import React, { useEffect, useRef } from 'react';
import { Stack, Redirect, useSegments, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { ServiceProvider } from '@/src/core/services/ServiceProvider';
import { queryClient } from '@/src/core/query/queryClient';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AppState, Platform, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { useLoanStore } from '@/src/store/loanStore';
import { ErrorBoundary } from '@/src/shared/components/common/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// AuthGuard
// ---------------------------------------------------------------------------
// Responsibilities:
//   1. Unauthenticated users  → /(auth)/login
//   2. Authenticated users    → /(main)/(tabs)/home  (no KYC check here)
//   3. Authenticated users who land on public/auth routes → home
//
// ---------------------------------------------------------------------------
function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments() as string[];
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingDone = useUserStore((s) => s.onboardingDone);
  const role = useUserStore((s) => s.role);
const mpinSet = useAuthStore((s) => s.mpinSet);
  const mpinVerified = useAuthStore((s) => s.mpinVerified);

  const firstSegment = segments?.[0] ?? null;
  const secondSegment = segments?.[1] ?? null;
  const inPublicGroup = firstSegment === '(public)';
  const inAuthGroup = firstSegment === '(auth)';
const isRoot = !firstSegment;
  const onEnterMpinScreen = inAuthGroup && secondSegment === 'enter-mpin';

  const homeRoute = role === 'agent' ? '/(main)/agent/dashboard' : '/(main)/(tabs)/home';

  // 1. Unauthenticated at root → send to terms / landing screen
  if (!isAuthenticated && isRoot) {
    return <Redirect href="/(public)" />;
  }

  // 2. Unauthenticated trying to access protected routes → login
  if (!isAuthenticated && !inPublicGroup && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // 3. Authenticated but onboarding not done → allow auth screens (set-mpin, role-select, etc.)
  if (isAuthenticated && !onboardingDone && inAuthGroup) {
    return <>{children}</>;
  }

  // 4. Returning user: authenticated + onboarding done + MPIN set but not yet verified this session
  if (isAuthenticated && onboardingDone && mpinSet && !mpinVerified && !onEnterMpinScreen) {
    return <Redirect href="/(auth)/enter-mpin" />;
  }

  // 5. Authenticated with onboarding done, MPIN verified (or no MPIN), on public/auth/root → go to app
  if (isAuthenticated && onboardingDone && (inPublicGroup || (inAuthGroup && !onEnterMpinScreen) || isRoot)) {
    return <Redirect href={homeRoute as any} />;
  }

  // 7. Authenticated but onboarding not done, on non-auth routes → set-mpin or complete-profile
  if (isAuthenticated && !onboardingDone && !inAuthGroup) {
    return <Redirect href={mpinSet ? '/(auth)/complete-profile' : '/(auth)/set-mpin'} />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// RootLayout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const splashHiddenRef = useRef(false);
  const hideSplash = () => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
  };

  const authBootstrap = useAuthStore((s) => s.bootstrap);
  const isAuthHydrated = useAuthStore((s) => s.isHydrated);

  const userBootstrap = useUserStore((s) => s.bootstrap);
  const isUserHydrated = useUserStore((s) => s.isHydrated);

const loadGoldLoanNotifyMe = useLoanStore((s) => s.loadGoldLoanNotifyMe);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await Promise.all([
          authBootstrap(),
          userBootstrap(),
loadGoldLoanNotifyMe(),
        ]);
      } catch (e) {
        console.warn('[Bootstrap] error:', e);
      } finally {
        if (isMounted) {
          hideSplash();
        }
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [authBootstrap, userBootstrap, loadGoldLoanNotifyMe]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
      if (status === 'active' && Platform.OS !== 'web') {
        onlineManager.setOnline(true);
      }
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const updateOnline = () => onlineManager.setOnline(window.navigator.onLine);
      updateOnline();
      window.addEventListener('online', updateOnline);
      window.addEventListener('offline', updateOnline);
      return () => {
        subscription.remove();
        window.removeEventListener('online', updateOnline);
        window.removeEventListener('offline', updateOnline);
      };
    }

    return () => subscription.remove();
  }, []);

  const isFullyHydrated = isAuthHydrated && isUserHydrated;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingDone = useUserStore((s) => s.onboardingDone);
  const role = useUserStore((s) => s.role);
  const mpinSet = useAuthStore((s) => s.mpinSet);
  const mpinVerified = useAuthStore((s) => s.mpinVerified);
  const hasInitialNavigated = useRef(false);

  // Force navigation to the correct initial screen after bootstrap.
  // This overrides any Expo Router navigation-state restoration that might
  // land the user on a stale screen (e.g. checkout) from a previous session.
  useEffect(() => {
    if (!fontsLoaded || !isFullyHydrated) return;
    if (hasInitialNavigated.current) return;
    hasInitialNavigated.current = true;

    if (!isAuthenticated) {
      router.replace('/(public)');
    } else if (!onboardingDone && mpinSet) {
      router.replace('/(auth)/complete-profile');
    } else if (!onboardingDone) {
      router.replace('/(auth)/set-mpin');
    } else if (mpinSet && !mpinVerified) {
      router.replace('/(auth)/enter-mpin');
    } else if (role === 'agent') {
      router.replace('/(main)/agent/dashboard');
    } else {
      router.replace('/(main)/(tabs)/home');
    }
  }, [fontsLoaded, isFullyHydrated, isAuthenticated, onboardingDone, mpinSet, mpinVerified, role]);

  useEffect(() => {
    if (fontsLoaded && isFullyHydrated) {
      hideSplash();
    }
  }, [fontsLoaded, isFullyHydrated]);

  // Safety-net: never leave the splash forever.
  useEffect(() => {
    const t = setTimeout(() => hideSplash(), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!fontsLoaded || !isFullyHydrated) return <SafeAreaProvider><StatusBar style="dark" /></SafeAreaProvider>;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent={false} />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ServiceProvider>
            <GestureHandlerRootView style={styles.root}>
              <AuthGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(public)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(main)" />
                </Stack>
              </AuthGuard>
            </GestureHandlerRootView>
          </ServiceProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

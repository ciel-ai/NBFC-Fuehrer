import React, { useEffect, useRef, useState } from 'react';
import { Stack, useSegments, router } from 'expo-router';
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
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { useLoanStore } from '@/src/store/loanStore';
import { useSalesStore } from '@/src/store/salesStore';
import { isSalesRole } from '@/src/entities/auth';
import { ErrorBoundary } from '@/src/shared/components/common/ErrorBoundary';
import { AppSplash } from '@/src/shared/components/common/AppSplash';

SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// AuthGuard
// ---------------------------------------------------------------------------
// Primary customer/sales split. Roles come from the persisted session (never
// asserted client-side):
//   • Sales agents (SALES_*): authenticate via OTP, skip the customer
//     MPIN/onboarding chain, and live in the (sales) group.
//   • Customers: phone + OTP + MPIN, then the (main) app.
// Per-segment role checks are enforced again in each group's layout via
// useAuthGuard (defence-in-depth).
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
  const inSalesGroup = firstSegment === '(sales)';
  const isRoot = !firstSegment;
  const onEnterMpinScreen = inAuthGroup && secondSegment === 'enter-mpin';

  const isSales = isSalesRole(role);

  // Compute where (if anywhere) this session must be redirected. `null` means
  // the current route is allowed — render it as-is. First match wins; order is
  // significant. The decision is derived purely from the persisted session.
  let target: string | null = null;

  if (!isAuthenticated && isRoot) {
    // 1. Unauthenticated at root → terms / landing screen
    target = '/(auth)/landing';
  } else if (isAuthenticated && isSales) {
    // 2. Authenticated sales agent → live in the (sales) group; never enter the
    //    customer MPIN/onboarding chain.
    target = inSalesGroup ? null : '/(sales)';
  } else if (!isAuthenticated && !inPublicGroup && !inAuthGroup) {
    // 3. Unauthenticated trying to access protected routes → login
    target = '/(auth)/login';
  } else if (isAuthenticated && !onboardingDone && inAuthGroup) {
    // 4. Customer mid-onboarding → allow the (auth) screens (set-mpin, etc.)
    target = null;
  } else if (isAuthenticated && onboardingDone && mpinSet && !mpinVerified && !onEnterMpinScreen) {
    // 5. Returning customer: onboarding done + MPIN set but not yet verified
    target = '/(auth)/enter-mpin';
  } else if (
    isAuthenticated &&
    onboardingDone &&
    (inPublicGroup || (inAuthGroup && !onEnterMpinScreen) || isRoot)
  ) {
    // 6. Fully-onboarded customer on public/auth/root → into the app
    target = '/(main)/(tabs)/home';
  } else if (isAuthenticated && !onboardingDone && !inAuthGroup) {
    // 7. Customer authenticated but onboarding not done, off the auth group
    target = mpinSet ? '/(auth)/complete-profile' : '/(auth)/set-mpin';
  }

  // CRITICAL: redirect imperatively so the <Stack> (the only navigator) stays
  // mounted at all times. Returning <Redirect/> here instead of `children`
  // would unmount the Stack, leaving the redirect with no navigator to execute
  // against — which deadlocks/loops on boot (splash ⇄ guard target).
  useEffect(() => {
    if (target) router.replace(target as never);
  }, [target]);

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
  const salesBootstrap = useSalesStore((s) => s.bootstrap);
  const isSalesHydrated = useSalesStore((s) => s.isHydrated);

const loadGoldLoanNotifyMe = useLoanStore((s) => s.loadGoldLoanNotifyMe);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await Promise.all([
          authBootstrap(),
          userBootstrap(),
          salesBootstrap(),
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
  }, [authBootstrap, userBootstrap, salesBootstrap, loadGoldLoanNotifyMe]);

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

  const isFullyHydrated = isAuthHydrated && isUserHydrated && isSalesHydrated;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingDone = useUserStore((s) => s.onboardingDone);
  const role = useUserStore((s) => s.role);
  const mpinSet = useAuthStore((s) => s.mpinSet);
  const mpinVerified = useAuthStore((s) => s.mpinVerified);
  const hasInitialNavigated = useRef(false);

  // Animated splash overlay — covers the app until its intro animation ends.
  const [splashDone, setSplashDone] = useState(false);

  // Force navigation to the correct initial screen after bootstrap.
  // This overrides any Expo Router navigation-state restoration that might
  // land the user on a stale screen (e.g. checkout) from a previous session.
  useEffect(() => {
    if (!fontsLoaded || !isFullyHydrated) return;
    if (hasInitialNavigated.current) return;
    hasInitialNavigated.current = true;

    if (!isAuthenticated) {
      router.replace('/(auth)/landing');
    } else if (isSalesRole(role)) {
      router.replace('/(sales)');
    } else if (!onboardingDone && mpinSet) {
      router.replace('/(auth)/complete-profile');
    } else if (!onboardingDone) {
      router.replace('/(auth)/set-mpin');
    } else if (mpinSet && !mpinVerified) {
      router.replace('/(auth)/enter-mpin');
    } else {
      router.replace('/(main)/(tabs)/home');
    }
  }, [fontsLoaded, isFullyHydrated, isAuthenticated, onboardingDone, role, mpinSet, mpinVerified]);

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

  // While fonts/stores hydrate, hold a solid royal-blue field (matching the
  // splash) so there is no white flash before the animated splash mounts.
  if (!fontsLoaded || !isFullyHydrated) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.splashFill} />
      </SafeAreaProvider>
    );
  }

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
                  <Stack.Screen name="(sales)" />
                </Stack>
              </AuthGuard>
              {!splashDone && <AppSplash onDone={() => setSplashDone(true)} />}
            </GestureHandlerRootView>
          </ServiceProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splashFill: { flex: 1, backgroundColor: '#156FE8' },
});

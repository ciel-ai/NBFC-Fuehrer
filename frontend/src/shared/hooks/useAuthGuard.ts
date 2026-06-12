import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { isSalesRole, type UserRole } from '@/src/entities/auth';

/**
 * Role-based route guard for a layout/segment.
 *
 * Pass the roles allowed to view the segment. If the signed-in user's role is
 * not in the list (or they are not authenticated), the user is redirected to
 * the home appropriate for their *actual* role and the hook returns `false` so
 * the layout can render nothing while the redirect lands.
 *
 *   useAuthGuard(['customer'])                               // (main)  — block sales
 *   useAuthGuard(['sales_cdl', 'sales_gold', 'sales_housing']) // (sales) — block customers
 *   useAuthGuard(['sales_cdl'])                              // a CDL-only sub-route
 *
 * This is defence-in-depth: the root AuthGuard already performs the primary
 * customer/sales split. Roles are read from the persisted session — they are
 * never asserted by the client.
 */
export function useAuthGuard(allowedRoles: readonly UserRole[]): boolean {
  const role = useUserStore((s) => s.role);
  const isHydrated = useUserStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const authorized = isAuthenticated && role != null && allowedRoles.includes(role);

  useEffect(() => {
    // Wait until the session is restored before acting, so we don't bounce a
    // returning user off a route during boot.
    if (!isHydrated || authorized) return;

    if (!isAuthenticated || role == null) {
      router.replace('/(auth)/login');
    } else if (isSalesRole(role)) {
      router.replace('/(sales)');
    } else {
      router.replace('/(main)/(tabs)/home');
    }
  }, [authorized, isHydrated, isAuthenticated, role]);

  return authorized;
}

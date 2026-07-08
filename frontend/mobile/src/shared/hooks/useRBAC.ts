// src/shared/hooks/useRBAC.ts
//
// Permission-based access control (Task 4.1) — distinct from
// usePermissions.ts, which is about DEVICE permissions (camera/biometric).
//
// The backend does not expose a permissions payload yet, so this maps
// roles → permission strings client-side (same interim approach as the
// admin portal's rbac.ts). When the backend ships a permissions claim in
// the auth token, swap PERMISSIONS_BY_ROLE for the server list — call
// sites stay unchanged.

import { useCallback } from 'react';
import { useUserStore } from '@/src/store/userStore';
import type { UserRole } from '@/src/entities/auth';

// ─── Permission vocabulary ────────────────────────────────────────────────────
// Naming: <domain>.<resource>.<action>

export type Permission =
  | 'loans.apply'            // start a loan application
  | 'loans.view.own'         // view own loans/EMIs
  | 'payments.emi.pay'       // pay an EMI
  | 'kyc.start'              // run KYC flows
  | 'sales.dashboard.view'   // sales home
  | 'sales.sale.create'      // originate a sale on behalf of a customer
  | 'sales.history.view';    // past sales

const CUSTOMER_PERMISSIONS: Permission[] = [
  'loans.apply', 'loans.view.own', 'payments.emi.pay', 'kyc.start',
];

const SALES_PERMISSIONS: Permission[] = [
  'sales.dashboard.view', 'sales.sale.create', 'sales.history.view', 'kyc.start',
];

export const PERMISSIONS_BY_ROLE: Record<UserRole, readonly Permission[]> = {
  customer: CUSTOMER_PERMISSIONS,
  sales_cdl: SALES_PERMISSIONS,
  sales_gold: SALES_PERMISSIONS,
  sales_housing: SALES_PERMISSIONS,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRBAC(): {
  role: UserRole | null;
  can: (permission: Permission) => boolean;
} {
  const role = useUserStore((s) => s.role);

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!role) return false;
      return (PERMISSIONS_BY_ROLE[role] ?? []).includes(permission);
    },
    [role],
  );

  return { role: role ?? null, can };
}

/** Convenience: single-permission check. */
export function usePermission(permission: Permission): boolean {
  const { can } = useRBAC();
  return can(permission);
}

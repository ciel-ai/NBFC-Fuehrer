// src/modules/staff-auth/staffAuth.types.ts
//
// Shared types for the staff (web dashboard) authentication module.

import type { StaffRole } from '@/constants/staffRoles.constants';

// ─── JWT audiences ──────────────────────────────────────────────────────────
// 'web'    → web dashboard staff (ADMIN, CREDIT_*, FINANCE_*)
// 'mobile' → sales staff signing in on the React Native app (SALES_*)
export type StaffAudience = 'web' | 'mobile';

// ─── Decoded staff JWT → attached to req.staffUser by verifyStaffToken ─────────
export interface StaffAuthUser {
    id: string;            // admin_users.id (JWT `sub`)
    role: StaffRole;
    branchId: string | null;
    name: string;
    aud: StaffAudience;
    jti: string;
    iat: number;
    exp: number;
}

// ─── Login portals (mirror webdash) ────────────────────────────────────────────
export type Portal = 'CREDIT' | 'FINANCE' | 'SALES';

// ---------------------------------------------------------------------------
// Roles
//
// One role per account. Customers self-register via OTP; the three SALES_*
// roles are admin-registered (the backend resolves the role at verify-otp time
// from the registered mobile number). The role is NEVER chosen or modified
// client-side.
//
// Each sales role is scoped to exactly one loan-origination product; the suffix
// maps 1:1 onto `SalesProduct` (cdl / gold / housing). "Affordable Housing" is
// modelled internally as `housing`, matching the existing sales feature.
// ---------------------------------------------------------------------------
import type { SalesAgent } from './salesAgent';

export type SalesRole = 'sales_cdl' | 'sales_gold' | 'sales_housing';

export type UserRole = 'customer' | SalesRole;

export const SALES_ROLES: readonly SalesRole[] = [
  'sales_cdl',
  'sales_gold',
  'sales_housing',
];

/** Type guard: true for any of the granular SALES_* roles. */
export function isSalesRole(role: UserRole | null | undefined): role is SalesRole {
  return role != null && (SALES_ROLES as readonly string[]).includes(role);
}

/**
 * KYC onboarding progress for a customer.
 * none → 0 steps, started → 1, in_progress → 2, verified → 3 (complete).
 */
export type KycStatus = 'none' | 'started' | 'in_progress' | 'verified';

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  /** Optional — present once KYC onboarding has begun. Drives the home KYC strip. */
  kycStatus?: KycStatus;
}

export interface SendOTPRequest {
  phone: string;
  /**
   * Optional hint only. The OTP send step is role-agnostic — the backend
   * resolves the real role (customer vs SALES_*) at verify-otp time from the
   * registered number, so the client never asserts a role here.
   */
  role?: UserRole;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  expiresIn: number; // seconds
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  kycComplete: boolean;
  /**
   * Present only when `user.role` is a SALES_* role — the agent profile
   * (branch, FDO code, designation) used by the sales dashboard/wizard. The
   * client stores this in the sales session so the existing sales feature keeps
   * working under the unified OTP flow.
   */
  agent?: SalesAgent;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null; // in memory only
  refreshToken: string | null; // in memory only — stored in SecureStore
  role: UserRole | null;
  kycComplete: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

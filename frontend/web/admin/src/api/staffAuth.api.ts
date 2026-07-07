// src/api/staffAuth.api.ts
//
// Staff (web dashboard) authentication — real backend, not demo.
//   ADMIN            → username + password   POST /staff/auth/login
//   CREDIT_/FINANCE_ → phone + OTP           POST /staff/auth/otp/request|verify
//
// NOTE: staff auth routes are mounted at the SERVER ROOT (/staff/auth/*),
// not under /api/v1 — so this module uses its own axios instance with the
// root URL derived from VITE_API_URL.

import axios from 'axios';
import type { Role } from '../types';

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const ROOT_URL = API_URL.replace(/\/api\/v\d+\/?$/, '');

const staffClient = axios.create({
  baseURL: ROOT_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Shapes (mirror backend staffAuth.service PresentedStaff / AuthResult) ────

export interface StaffUser {
  id: string;
  name: string;
  role: Role;            // staff vocabulary: ADMIN | CREDIT_* | FINANCE_* — matches ROLE_META keys
  email: string;
  phone: string;
  branch: string | null;
  username: string | null;
}

export interface StaffAuthResult {
  user: StaffUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/** Portal families the web login accepts (SALES_* is mobile-app only). */
export type StaffPortal = 'CREDIT' | 'FINANCE';

// ─── API ──────────────────────────────────────────────────────────────────────

export const staffAuthApi = {
  /** ADMIN username/email + password login. */
  login: async (username: string, password: string): Promise<StaffAuthResult> => {
    const res = await staffClient.post('/staff/auth/login', { username, password });
    return res.data.data;
  },

  /** Request OTP for Credit/Finance staff. devOtp is returned in non-prod only. */
  otpRequest: async (phone: string, portal: StaffPortal): Promise<{ phone: string; devOtp?: string }> => {
    const res = await staffClient.post('/staff/auth/otp/request', { phone, portal });
    return res.data.data;
  },

  otpVerify: async (phone: string, otp: string, portal: StaffPortal): Promise<StaffAuthResult> => {
    const res = await staffClient.post('/staff/auth/otp/verify', { phone, otp, portal });
    return res.data.data;
  },

  /** Rotating refresh — presented token is revoked, a fresh pair is issued. */
  refresh: async (refreshToken: string): Promise<StaffAuthResult> => {
    const res = await staffClient.post('/staff/auth/refresh', { refreshToken });
    return res.data.data;
  },

  /** Server-side revoke (denylists the access token, revokes refresh tokens). */
  logout: async (accessToken: string): Promise<void> => {
    await staffClient.post('/staff/auth/logout', {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};

/** Human-friendly message from a failed staff-auth call. */
export function staffAuthError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; code?: string; message?: string };
  if (e.response?.data?.message) return e.response.data.message;
  if (e.code === 'ERR_NETWORK' || e.message?.toLowerCase().includes('network')) {
    return 'Cannot reach the server — check that the API is running.';
  }
  return 'Something went wrong. Please try again.';
}

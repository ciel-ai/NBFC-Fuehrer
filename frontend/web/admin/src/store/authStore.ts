import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';
import { staffAuthApi } from '../api/staffAuth.api';
import { usePermissionStore } from '../auth/permissionStore';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  branch: string;
  loginAt: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: SessionUser | null;
  token: string | null; // staff access JWT — injected by api/client.ts
  refreshToken: string | null; // rotating refresh token
  login: (user: SessionUser, tokens: SessionTokens) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      login: (user, tokens) =>
        set({
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),

      setTokens: (accessToken, refreshToken) => set({ token: accessToken, refreshToken }),

      logout: () => {
        // Best-effort server-side revoke — never block the local sign-out
        const token = get().token;
        if (token) staffAuthApi.logout(token).catch(() => undefined);
        set({ user: null, token: null, refreshToken: null });

        // Drop the cached grants too. Without this the next user to sign in on
        // this browser would briefly inherit the previous user's navigation.
        usePermissionStore.getState().clear();
      },
    }),
    { name: 'fuehrer-nbfc-auth' },
  ),
);

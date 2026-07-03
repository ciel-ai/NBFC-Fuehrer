import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  branch: string;
  loginAt: string;
}

interface AuthState {
  user: SessionUser | null;
  token: string | null;
  login: (user: SessionUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'fuehrer-nbfc-auth' },
  ),
);

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
  login: (user: SessionUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'fuehrer-nbfc-auth' },
  ),
);

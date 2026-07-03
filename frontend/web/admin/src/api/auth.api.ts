// src/api/auth.api.ts
import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    branchId: string | null;
  };
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await apiClient.post('/admin/auth/login', payload);
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/admin/auth/logout');
  },

  me: async (): Promise<LoginResponse['user']> => {
    const res = await apiClient.get('/admin/auth/me');
    return res.data.data;
  },
};
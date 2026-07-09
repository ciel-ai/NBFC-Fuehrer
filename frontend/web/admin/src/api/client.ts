// src/api/client.ts
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { staffAuthApi } from './staffAuth.api';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject the staff access JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 → refresh once, retry once, else logout ─────────────────────────────
// Access tokens live 15 minutes; the rotating refresh token silently renews
// the session. Concurrent 401s share one in-flight refresh (single-flight).

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const rt = useAuthStore.getState().refreshToken;
  if (!rt) return null;
  try {
    const r = await staffAuthApi.refresh(rt);
    useAuthStore.getState().setTokens(r.accessToken, r.refreshToken);
    return r.accessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      refreshing = refreshing ?? tryRefresh();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }

      // Refresh failed — end the session
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

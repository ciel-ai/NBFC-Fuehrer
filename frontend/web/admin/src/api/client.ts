// src/api/client.ts
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { staffAuthApi } from './staffAuth.api';
import { API_URL } from '../config';

const BASE_URL = API_URL;

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

/**
 * Single-flight refresh.
 *
 * Every concurrent 401 awaits the SAME promise, and the slot is cleared exactly
 * once — in a `finally` on the promise itself, not by each waiter after its own
 * `await`. The previous form (`refreshing = refreshing ?? tryRefresh(); await
 * refreshing; refreshing = null;`) cleared the slot per-waiter, so a 401 landing
 * just after the first one resolved would start a *second* refresh against a
 * refresh token the server had already rotated away — the second call fails, and
 * the user is logged out mid-approval.
 *
 * The `finally` cannot clobber a newer refresh: a new promise can only be
 * created once the slot is null, and only this callback nulls it.
 */
function refreshOnce(): Promise<string | null> {
  if (!refreshing) {
    refreshing = tryRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      const newToken = await refreshOnce();

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }

      // Refresh failed — end the session. Leave a note so /login can explain
      // why the user landed there and send them back where they were.
      useAuthStore.getState().logout();
      try {
        sessionStorage.setItem(
          'fuehrer.sessionEnded',
          JSON.stringify({ at: Date.now(), from: window.location.pathname + window.location.search }),
        );
      } catch {
        /* private mode / storage disabled — non-fatal */
      }
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

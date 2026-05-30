import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosAdapter,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from '../storage/storage';
import { useAuthStore } from '@/src/store/authStore';
import { API_BASE_URL, API_TIMEOUT, SECURE_STORE_KEYS, USE_MOCK } from '@/src/core/utils/constants';

// ─── Mock helper ────────────────────────────────────────────────────────────
export function mockDelay<T>(data: T, ms = 1500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─── Certificate Pinning ─────────────────────────────────────────────────────
//
// REPLACE THIS with your actual server certificate hash before production build.
//
// To extract the SHA-256 SPKI hash from your live server, run these commands
// from a machine that can reach the API host:
//
//   openssl s_client -connect api.yourdomain.in:443 \
//     -servername api.yourdomain.in 2>/dev/null </dev/null | \
//   openssl x509 -pubkey -noout | \
//   openssl pkey -pubin -outform DER | \
//   openssl dgst -sha256 -binary | \
//   openssl base64
//
// Always provide two hashes (current cert + next rotation cert) so a
// certificate renewal never bricks the app for existing users.
//
// The same hash values must also be set in:
//   plugins/withCertificatePinning.js  → PRIMARY_HASH / BACKUP_HASH
// ────────────────────────────────────────────────────────────────────────────

/** API hostname used for OkHttp pattern matching on Android. */
const PINNED_HOSTNAME = 'api.REPLACE_ME.in';  // ← REPLACE with your API hostname

/**
 * SHA-256 SPKI hashes (raw base-64, without the "sha256/" prefix).
 * react-native-ssl-pinning / OkHttp accept raw base-64 and add the prefix
 * internally, so do NOT add "sha256/" here.
 */
const SSL_PINNED_HASHES: string[] = [
  'REPLACE_WITH_PRIMARY_SHA256_SPKI_HASH=',  // ← REPLACE before production build
  'REPLACE_WITH_BACKUP_SHA256_SPKI_HASH=',   // ← backup hash for certificate rotation
];

// Response shape returned by react-native-ssl-pinning's fetch.
interface PinnedFetchResponse {
  status: number;
  headers: Record<string, string>;
  bodyString: string;
  url: string;
}

/**
 * Creates a custom Axios adapter that routes all requests through the
 * react-native-ssl-pinning native layer instead of the default XMLHttpRequest
 * adapter. This provides JS-layer certificate pinning as defence-in-depth;
 * OS-level pinning (Android network_security_config / iOS TrustKit) is
 * injected at build time by plugins/withCertificatePinning.js.
 *
 * All existing Axios interceptors (Bearer token, 401 refresh, 403 logout)
 * are unaffected — they run before/after this adapter as normal.
 */
function createPinnedAdapter(hashes: string[]): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    // ── Build full URL ──────────────────────────────────────────────────────
    const baseURL = (config.baseURL ?? '').replace(/\/$/, '');
    const url = config.url?.startsWith('http')
      ? config.url
      : `${baseURL}${config.url ?? ''}`;

    // ── Serialize request body ──────────────────────────────────────────────
    let body: string | undefined;
    if (config.data !== undefined && config.data !== null) {
      body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    }

    // ── Flatten Axios headers to a plain string map ─────────────────────────
    const headers: Record<string, string> = {};
    if (config.headers) {
      for (const [k, v] of Object.entries(config.headers)) {
        if (typeof v === 'string') headers[k] = v;
      }
    }

    // ── Timeout: iOS expects seconds, Android expects milliseconds ──────────
    const timeoutMs = config.timeout ?? API_TIMEOUT;
    const timeoutInterval = Platform.OS === 'ios' ? timeoutMs / 1000 : timeoutMs;

    // ── Call the native pinned fetch ────────────────────────────────────────
    let pinnedResponse: PinnedFetchResponse;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { fetch: pinnedFetch } = require('react-native-ssl-pinning') as {
        fetch: (url: string, opts: object) => Promise<PinnedFetchResponse>;
      };

      pinnedResponse = await pinnedFetch(url, {
        method: (config.method ?? 'GET').toUpperCase(),
        headers,
        body,
        sslPinning: { certs: hashes },
        pkPinningURL: PINNED_HOSTNAME,
        timeoutInterval,
      });
    } catch (err: unknown) {
      // Pinning failure or network error — throw as AxiosError so the
      // response interceptor's error branch still fires correctly.
      return Promise.reject(
        new AxiosError(
          err instanceof Error ? err.message : 'SSL pinning / network error',
          'ERR_SSL_PINNING',
          config,
        ),
      );
    }

    // ── Parse response body ─────────────────────────────────────────────────
    let data: unknown = pinnedResponse.bodyString;
    try {
      data = JSON.parse(pinnedResponse.bodyString);
    } catch {
      // Non-JSON body (e.g. plain-text error) — leave as raw string.
    }

    const axiosResponse: AxiosResponse = {
      data,
      status: pinnedResponse.status,
      statusText: String(pinnedResponse.status),
      headers: pinnedResponse.headers,
      config,
      request: null,
    };

    // Axios default: resolve 2xx, reject everything else.
    if (pinnedResponse.status >= 200 && pinnedResponse.status < 300) {
      return axiosResponse;
    }

    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${pinnedResponse.status}`,
        String(pinnedResponse.status),
        config,
        null,
        axiosResponse,
      ),
    );
  };
}

// ─── Axios instance ──────────────────────────────────────────────────────────
// On native (iOS/Android) the pinned adapter is used; on web the default
// XMLHttpRequest adapter is used (certificate pinning is not applicable in
// browsers — the platform enforces its own trust store).
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  adapter: (Platform.OS !== 'web' && API_BASE_URL.startsWith('https://')) ? createPinnedAdapter(SSL_PINNED_HASHES) : undefined,
});

// Guard: enforce HTTPS in production (allow http://localhost for dev)
if (!USE_MOCK && !API_BASE_URL.startsWith('https://') && !API_BASE_URL.startsWith('http://localhost') && !API_BASE_URL.startsWith('http://192.168')) {
  throw new Error('SECURITY: API_BASE_URL must use HTTPS in production');
}

// ─── Token refresh queue ─────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await secureStorage.get(SECURE_STORE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) throw new Error('No refresh token available');

  if (USE_MOCK) {
    // EXTERNAL_DEPENDENCY: Real token refresh via /auth/refresh endpoint
    const newToken = 'mock_access_token_refreshed_' + Date.now();
    await secureStorage.set(SECURE_STORE_KEYS.ACCESS_TOKEN, newToken);
    return newToken;
  }

  // Note: this call uses bare axios (not the `api` instance) to avoid a
  // circular refresh loop. OS-level pinning (network_security_config /
  // TrustKit) still protects this request on both platforms.
  const response = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { timeout: API_TIMEOUT }
  );
  await secureStorage.set(SECURE_STORE_KEYS.ACCESS_TOKEN, response.data.accessToken);
  await secureStorage.set(SECURE_STORE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
  return response.data.accessToken;
}

// ─── Request interceptor: attach Bearer token ────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.get(SECURE_STORE_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ─── Response interceptor: 401 → refresh → retry ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>)['Authorization'] =
              `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)['Authorization'] =
            `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Delegate full cleanup to authStore.logout (clears tokens + all stores).
        await useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 → force full logout (authStore.logout clears tokens + all stores).
    if (error.response?.status === 403) {
      await useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default api;

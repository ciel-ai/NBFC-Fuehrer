// src/api/client.ts
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject JWT token on every request
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('fuehrer-nbfc-auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Auto-logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fuehrer-nbfc-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
// src/api/settings.api.ts
import { apiClient } from './client';
import { USE_MOCK } from '../config';

export const settingsApi = {
  getAll: async () => {
    const res = await apiClient.get('/settings');
    return res.data.data;
  },

  update: async (key: string, value: string) => {
    const res = await apiClient.put(`/settings/${key}`, { value });
    return res.data;
  },

  getAuditLogs: async (params: {
    module?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const res = await apiClient.get('/audit-logs', { params });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Settings persistence seam
//
// A setting section is stored as `key → JSON value` (matches the PUT
// /settings/:key { value } contract). loadSettings/saveSettings hide the
// live-vs-mock split so the Settings page can round-trip either way:
//   • live  → GET /settings on load, PUT /settings/:key on save.
//   • mock  → localStorage, so a change survives a page refresh in dev with no
//             backend (per the "everything must work in mock mode" rule).
// ---------------------------------------------------------------------------

const LOCAL_PREFIX = 'nbfc_admin_settings:';

/** Parsed section values keyed by section id (e.g. 'org.profile'). */
export type SettingsMap = Record<string, unknown>;

const parseValue = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

/** Normalize whatever GET /settings returns into a section→value map. */
const normalizeRemote = (data: unknown): SettingsMap => {
  const out: SettingsMap = {};
  if (Array.isArray(data)) {
    // [{ key, value }, …]
    for (const row of data) {
      const r = row as { key?: unknown; value?: unknown };
      if (r && typeof r.key === 'string') out[r.key] = parseValue(r.value);
    }
  } else if (data && typeof data === 'object') {
    // { 'org.profile': value, … }
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = parseValue(v);
    }
  }
  return out;
};

const readLocal = (): SettingsMap => {
  const out: SettingsMap = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_PREFIX)) {
        out[k.slice(LOCAL_PREFIX.length)] = parseValue(localStorage.getItem(k));
      }
    }
  } catch {
    /* localStorage unavailable — fall through to defaults */
  }
  return out;
};

/** Load all persisted settings sections (mock → localStorage, live → API). */
export const loadSettings = async (): Promise<SettingsMap> => {
  if (USE_MOCK) return readLocal();
  try {
    return normalizeRemote(await settingsApi.getAll());
  } catch {
    // Load failure just means the forms keep their defaults — not an error the
    // user needs to action.
    return {};
  }
};

/**
 * Persist one settings section. Throws on a live write failure so the caller
 * can surface an error and abort — never a fake "saved". In mock mode the
 * value is written to localStorage so it round-trips on reload.
 */
export const saveSettings = async (key: string, value: unknown): Promise<void> => {
  if (USE_MOCK) {
    localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
    return;
  }
  await settingsApi.update(key, JSON.stringify(value));
};
import { create } from 'zustand';
import { permissionsApi } from '../api/permissions.api';
import { USE_MOCK } from '../config';
import { ROLE_META } from './rbac';
import type { ModuleKey } from './rbac';
import type { Role } from '../types';

/* ============================================================================
 * Effective permissions for the signed-in user.
 *
 * Navigation, route guards and in-page affordances all resolve through here.
 * Previously they read a hardcoded ROLE_META table in the frontend, which meant
 * the portal's idea of who could see what could — and did — drift from the RBAC
 * rows the API actually enforces.
 *
 * Source of truth is GET /permissions/me. ROLE_META survives ONLY as an offline
 * fallback (see `status: 'fallback'`), never as the primary answer.
 * ==========================================================================*/

export type PermissionAction = 'READ' | 'WRITE';

type Status =
  | 'idle' // nobody signed in
  | 'loading' // fetching /permissions/me
  | 'live' // grants came from the API — authoritative
  | 'fallback'; // API unreachable; using the role's static module list

interface PermissionState {
  status: Status;
  /** module -> granted actions. Empty until loaded. */
  grants: Record<string, string[]>;
  error: string | null;

  load: (role: Role) => Promise<void>;
  clear: () => void;
}

/** The static table, as a last resort when the permissions API cannot be reached. */
const staticGrants = (role: Role): Record<string, string[]> =>
  Object.fromEntries(ROLE_META[role].modules.map((m) => [m, ['READ', 'WRITE']]));

export const usePermissionStore = create<PermissionState>((set) => ({
  status: 'idle',
  grants: {},
  error: null,

  load: async (role) => {
    /* Mock mode has no API behind it. Say so explicitly rather than letting the
       request fail and presenting a demo as though the service were down. */
    if (USE_MOCK) {
      set({
        status: 'fallback',
        grants: staticGrants(role),
        error: 'Mock mode — permissions are simulated from the static role table',
      });
      return;
    }

    set({ status: 'loading', error: null });
    try {
      const me = await permissionsApi.me();
      set({ status: 'live', grants: me.permissions, error: null });
    } catch (err) {
      /* Degrade to the role's static module list rather than locking the user out
         of their own portal because a permissions lookup failed. The status is
         surfaced in the UI so this is never silent — a fallback session is a
         degraded session, not a normal one. */
      const e = err as { response?: { status?: number } };
      set({
        status: 'fallback',
        grants: staticGrants(role),
        error:
          e.response?.status === 401
            ? 'Session expired'
            : 'Permissions service unreachable — using your role’s default access',
      });
    }
  },

  clear: () => set({ status: 'idle', grants: {}, error: null }),
}));

/* ── Selectors ──────────────────────────────────────────────────────────────
 * Read these, never `grants` directly, so the READ/WRITE distinction stays
 * meaningful. A user who can READ `credit` must not get the approve button. */

export const useCanAccess = (module: ModuleKey): boolean =>
  usePermissionStore((s) => (s.grants[module]?.length ?? 0) > 0);

export const useCan = (module: ModuleKey, action: PermissionAction): boolean =>
  usePermissionStore((s) => s.grants[module]?.includes(action) ?? false);

/** Non-reactive read — for use inside callbacks and route loaders. */
export const canAccessNow = (module: ModuleKey): boolean =>
  (usePermissionStore.getState().grants[module]?.length ?? 0) > 0;

export const usePermissionStatus = (): Status => usePermissionStore((s) => s.status);

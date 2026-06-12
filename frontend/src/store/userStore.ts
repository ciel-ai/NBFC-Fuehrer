import { create } from 'zustand';
import { appStorage, secureStorage } from '../core/storage/storage';
import { SECURE_STORE_KEYS } from '../core/utils/constants';
import { AuthUser, UserRole, isSalesRole } from '../entities/auth';

// ---------------------------------------------------------------------------
// Storage routing
//
// PII fields (user object, role) → secureStorage (expo-secure-store, backed by
//   Android Keystore / iOS Keychain).
// Non-PII fields (onboardingDone) → appStorage (AsyncStorage).
//
// AuthUser JSON size is bounded by the 5 fixed fields (id, phone, name,
// email?, role), typically < 200 bytes — well within SecureStore's 2 048-byte
// per-value limit on iOS.
// ---------------------------------------------------------------------------

// Keys stored in SecureStore (PII)
const SECURE_KEYS = {
  USER: SECURE_STORE_KEYS.USER,
  USER_ROLE: SECURE_STORE_KEYS.USER_ROLE,
} as const;

// Keys stored in AsyncStorage (non-PII)
const APP_KEYS = {
  ONBOARDING_DONE: SECURE_STORE_KEYS.ONBOARDING_DONE,
} as const;

// ---------------------------------------------------------------------------
// One-time migration: move USER + USER_ROLE out of AsyncStorage into
// SecureStore for users who installed before this change.
//
// Logic: if SecureStore has no value, check AsyncStorage; if found, copy to
// SecureStore and delete from AsyncStorage.  Safe to call on every boot —
// once migrated the AsyncStorage key is absent and the function exits in O(1).
// ---------------------------------------------------------------------------

async function migratePiiToSecureStore(): Promise<void> {
  await Promise.all([
    (async () => {
      // USER blob
      const alreadySecure = await secureStorage.get(SECURE_KEYS.USER);
      if (!alreadySecure) {
        const legacy = await appStorage.get(SECURE_KEYS.USER);
        if (legacy) {
          await secureStorage.set(SECURE_KEYS.USER, legacy);
          await appStorage.remove(SECURE_KEYS.USER);
        }
      }
    })(),

    (async () => {
      // USER_ROLE
      const alreadySecure = await secureStorage.get(SECURE_KEYS.USER_ROLE);
      if (!alreadySecure) {
        const legacy = await appStorage.get(SECURE_KEYS.USER_ROLE);
        if (legacy) {
          await secureStorage.set(SECURE_KEYS.USER_ROLE, legacy);
          await appStorage.remove(SECURE_KEYS.USER_ROLE);
        }
      }
    })(),
  ]);
}

// ---------------------------------------------------------------------------
// Store types  (unchanged — no signature changes)
// ---------------------------------------------------------------------------

interface UserState {
  user: AuthUser | null;
  role: UserRole | null;
  onboardingDone: boolean;
  isHydrated: boolean;
}

interface UserActions {
  bootstrap: () => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  clearUser: () => Promise<void>;
  setRole: (role: UserRole) => void;
  /** True for any of the granular SALES_* roles. */
  isSales: () => boolean;
  /** True only for the self-registering customer role. */
  isCustomer: () => boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUserStore = create<UserState & UserActions>((set, get) => ({
  user: null,
  role: null,
  onboardingDone: false,
  isHydrated: false,

  bootstrap: async () => {
    try {
      // Run migration first (no-op after first successful run).
      await migratePiiToSecureStore();

      // PII from SecureStore; non-PII from AsyncStorage.
      const [userStr, roleStr, onboardingStr] = await Promise.all([
        secureStorage.get(SECURE_KEYS.USER),
        secureStorage.get(SECURE_KEYS.USER_ROLE),
        appStorage.get(APP_KEYS.ONBOARDING_DONE),
      ]);

      set({
        user: userStr ? (JSON.parse(userStr) as AuthUser) : null,
        role: roleStr as UserRole | null,
        onboardingDone: onboardingStr === 'true',
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  setUser: async (user) => {
    // Write PII to SecureStore only.
    await Promise.all([
      secureStorage.set(SECURE_KEYS.USER, JSON.stringify(user)),
      secureStorage.set(SECURE_KEYS.USER_ROLE, user.role),
    ]);
    set({ user, role: user.role });
  },

  updateUser: async (data) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...data };
    // Updated blob stays in SecureStore.
    await secureStorage.set(SECURE_KEYS.USER, JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  setOnboardingDone: async () => {
    // Non-PII flag — AsyncStorage is fine.
    await appStorage.set(APP_KEYS.ONBOARDING_DONE, 'true');
    set({ onboardingDone: true });
  },

  clearUser: async () => {
    // Remove from both backends so stale legacy AsyncStorage entries are also
    // cleaned (handles the edge case where migration ran but wrote both).
    await Promise.all([
      secureStorage.remove(SECURE_KEYS.USER),
      secureStorage.remove(SECURE_KEYS.USER_ROLE),
      appStorage.remove(SECURE_KEYS.USER),       // belt-and-suspenders: clear any legacy entry
      appStorage.remove(SECURE_KEYS.USER_ROLE),  // belt-and-suspenders: clear any legacy entry
      appStorage.remove(APP_KEYS.ONBOARDING_DONE),
    ]);
    set({ user: null, role: null, onboardingDone: false });
  },

  setRole: (role) => {
    // In-memory only (same behaviour as before).
    // Role is durably persisted via setUser(); setRole() is an ephemeral
    // in-session override (e.g. role-switch during active session).
    set({ role });
  },

  isSales: () => isSalesRole(get().role),

  isCustomer: () => get().role === 'customer',
}));

import { storeResetters } from './storeResetters';
storeResetters.push(() => useUserStore.getState().clearUser());

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { secureStorage } from '../core/storage/storage';
import { SECURE_STORE_KEYS } from '../core/utils/constants';
import { queryClient } from '../core/query/queryClient';

// ---------------------------------------------------------------------------
// MPIN lockout thresholds
//
// Soft lock  (SOFT = 5):  MPIN screen is blocked; user must re-authenticate
//                          via OTP to continue. The screen also enforces this
//                          via its own in-memory counter (defence-in-depth).
// Hard wipe  (HARD = 10): All tokens cleared; full OTP re-login required.
//                          Persisted counter survives app restarts, so an
//                          attacker cannot bypass the limit by force-killing.
// ---------------------------------------------------------------------------
const MPIN_MAX_ATTEMPTS_SOFT = 5;
const MPIN_MAX_ATTEMPTS_HARD = 10;

// ---------------------------------------------------------------------------
// MPIN crypto helpers
// ---------------------------------------------------------------------------

/**
 * Returns the per-install salt, generating and persisting a UUID v4 on the
 * very first call. The salt never changes for the lifetime of an install.
 */
async function getOrCreateSalt(): Promise<string> {
  const existing = await secureStorage.get(SECURE_STORE_KEYS.MPIN_SALT);
  if (existing) return existing;

  // randomUUID() uses a CSPRNG and produces 122 bits of entropy — more than
  // enough to prevent pre-computation attacks on a 4-digit PIN.
  const salt = Crypto.randomUUID();
  await secureStorage.set(SECURE_STORE_KEYS.MPIN_SALT, salt);
  return salt;
}

/**
 * Returns SHA-256( salt || pin ) as a lowercase hex string.
 * The raw PIN never leaves this function.
 */
async function hashMpin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + pin,
    // Default encoding is HEX — explicit for clarity.
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

// ---------------------------------------------------------------------------
// Store types  (no signature changes — only two new state fields added)
// ---------------------------------------------------------------------------

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  mpinSet: boolean;
  mpinVerified: boolean;
  /** True once failed attempts reach MPIN_MAX_ATTEMPTS_SOFT (5). */
  mpinLocked: boolean;
  /** Remaining guesses before the hard wipe (starts at MPIN_MAX_ATTEMPTS_HARD). */
  mpinAttemptsLeft: number;
}

interface AuthActions {
  bootstrap: () => Promise<void>;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  /**
   * Internal logout: clears tokens.
   * To perform a full app logout and reset all stores, call `resetAllStores()`
   * from `storeResetters.ts` instead of calling this directly.
   */
  logout: (isInternal?: boolean) => Promise<void>;
  setMpin: (pin: string) => Promise<void>;
  verifyMpin: (pin: string) => Promise<boolean>;
  clearMpin: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: true,
  mpinSet: false,
  mpinVerified: false,
  mpinLocked: false,
  mpinAttemptsLeft: MPIN_MAX_ATTEMPTS_HARD,

  bootstrap: async () => {
    try {
      const [accessToken, refreshToken, mpin, attemptsStr] = await Promise.all([
        secureStorage.get(SECURE_STORE_KEYS.ACCESS_TOKEN),
        secureStorage.get(SECURE_STORE_KEYS.REFRESH_TOKEN),
        secureStorage.get(SECURE_STORE_KEYS.MPIN),
        secureStorage.get(SECURE_STORE_KEYS.MPIN_ATTEMPTS),
      ]);

      // `|| 0` guards against a corrupted/empty value returning NaN.
      const attempts = parseInt(attemptsStr ?? '0', 10) || 0;

      set({
        accessToken,
        refreshToken,
        isAuthenticated: !!accessToken && !!refreshToken,
        isHydrated: true,
        isLoading: false,
        mpinSet: !!mpin,
        mpinVerified: false,
        mpinLocked: attempts >= MPIN_MAX_ATTEMPTS_SOFT,
        mpinAttemptsLeft: Math.max(0, MPIN_MAX_ATTEMPTS_HARD - attempts),
      });
    } catch {
      set({ isHydrated: true, isLoading: false, isAuthenticated: false });
    }
  },

  login: async (accessToken, refreshToken) => {
    // A successful OTP-based login resets the brute-force counter so a
    // legitimate user who forgot their MPIN can set a new one cleanly.
    await Promise.all([
      secureStorage.set(SECURE_STORE_KEYS.ACCESS_TOKEN, accessToken),
      secureStorage.set(SECURE_STORE_KEYS.REFRESH_TOKEN, refreshToken),
      secureStorage.remove(SECURE_STORE_KEYS.MPIN_ATTEMPTS),
    ]);
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
      mpinLocked: false,
      mpinAttemptsLeft: MPIN_MAX_ATTEMPTS_HARD,
    });
  },

  logout: async (isInternal = false) => {
    await Promise.all([
      secureStorage.remove(SECURE_STORE_KEYS.ACCESS_TOKEN),
      secureStorage.remove(SECURE_STORE_KEYS.REFRESH_TOKEN),
    ]);

    set({ accessToken: null, refreshToken: null, isAuthenticated: false, mpinVerified: false });
    queryClient.clear();

    if (!isInternal) {
      const { resetAllStores } = await import('./storeResetters');
      await resetAllStores();
    }
  },

  setMpin: async (pin) => {
    const salt = await getOrCreateSalt();
    const hash = await hashMpin(pin, salt);

    await Promise.all([
      secureStorage.set(SECURE_STORE_KEYS.MPIN, hash),
      // Clear any accumulated failure count when the MPIN is (re-)set so the
      // user starts with a clean slate without being immediately locked out.
      secureStorage.remove(SECURE_STORE_KEYS.MPIN_ATTEMPTS),
    ]);

    set({
      mpinSet: true,
      mpinVerified: true,
      mpinLocked: false,
      mpinAttemptsLeft: MPIN_MAX_ATTEMPTS_HARD,
    });
  },

  verifyMpin: async (pin) => {
    const [storedHash, salt, attemptsStr] = await Promise.all([
      secureStorage.get(SECURE_STORE_KEYS.MPIN),
      secureStorage.get(SECURE_STORE_KEYS.MPIN_SALT),
      secureStorage.get(SECURE_STORE_KEYS.MPIN_ATTEMPTS),
    ]);

    const currentAttempts = parseInt(attemptsStr ?? '0', 10) || 0;

    // ── Hard wipe: already at 10 attempts ──────────────────────────────────
    // Reject immediately and force full re-login. This branch is hit when the
    // user restarts the app after already reaching the limit (the counter
    // survives restarts via SecureStore).
    if (currentAttempts >= MPIN_MAX_ATTEMPTS_HARD) {
      await get().logout();
      return false;
    }

    // Guard: no hash/salt means MPIN was never set or was wiped.
    if (!storedHash || !salt) return false;

    // ── Hash the candidate and compare ─────────────────────────────────────
    const inputHash = await hashMpin(pin, salt);
    const isValid = inputHash === storedHash;

    if (isValid) {
      // Correct PIN — clear the persisted failure counter.
      await secureStorage.remove(SECURE_STORE_KEYS.MPIN_ATTEMPTS);
      set({
        mpinVerified: true,
        mpinLocked: false,
        mpinAttemptsLeft: MPIN_MAX_ATTEMPTS_HARD,
      });
      return true;
    }

    // ── Wrong PIN — increment counter and enforce thresholds ───────────────
    const newAttempts = currentAttempts + 1;
    await secureStorage.set(SECURE_STORE_KEYS.MPIN_ATTEMPTS, String(newAttempts));

    const attemptsLeft = Math.max(0, MPIN_MAX_ATTEMPTS_HARD - newAttempts);
    const locked = newAttempts >= MPIN_MAX_ATTEMPTS_SOFT;

    set({ mpinLocked: locked, mpinAttemptsLeft: attemptsLeft });

    // Hard wipe at 10 failures — nuke tokens now so the next launch also
    // can't enter MPIN (the persisted counter already blocks it, but clearing
    // tokens here means the main app shell immediately redirects to login).
    if (newAttempts >= MPIN_MAX_ATTEMPTS_HARD) {
      await get().logout();
    }

    return false;
  },

  clearMpin: async () => {
    await Promise.all([
      secureStorage.remove(SECURE_STORE_KEYS.MPIN),
      secureStorage.remove(SECURE_STORE_KEYS.MPIN_SALT),
      secureStorage.remove(SECURE_STORE_KEYS.MPIN_ATTEMPTS),
    ]);
    set({
      mpinSet: false,
      mpinVerified: false,
      mpinLocked: false,
      mpinAttemptsLeft: MPIN_MAX_ATTEMPTS_HARD,
    });
  },
}));

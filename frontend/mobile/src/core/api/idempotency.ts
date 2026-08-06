import { useCallback, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import type { AxiosRequestConfig } from 'axios';

/**
 * Idempotency keys for money-movement requests (payments, NACH mandates,
 * disbursements). The backend de-dupes any request carrying an
 * `Idempotency-Key` it has already seen within its retention window, so a
 * network retry or an accidental double-tap can never charge / disburse twice.
 *
 * The rule: mint ONE key when the user initiates an action and reuse it for
 * every retry of that same action (automatic retry, or the user re-submitting
 * the same screen). Mint a NEW key only for a genuinely new action.
 */

const HEADER = 'Idempotency-Key';

/** Mint a fresh key — CSPRNG UUID v4 (same primitive as authStore salts). */
export function newIdempotencyKey(): string {
  return Crypto.randomUUID();
}

/**
 * Axios config fragment that carries the idempotency header. Pass the key held
 * for a single action; automatic retries reuse the same axios config (and thus
 * the same header), so the whole retry chain de-dupes to one backend effect.
 * Returns `undefined` when no key is supplied so callers can pass it through
 * unconditionally without changing non-idempotent requests.
 */
export function idempotentConfig(key?: string): AxiosRequestConfig | undefined {
  return key ? { headers: { [HEADER]: key } } : undefined;
}

/**
 * A stable idempotency key for one money-movement action. The key is minted
 * once per mount — reused across re-renders and repeated submit taps — so the
 * screen stays protected without extra bookkeeping. Call `reset()` when the
 * user starts a genuinely new action (e.g. re-opens the sheet to pay again).
 *
 * Read the key with `getKey()` inside the submit handler so it always reflects
 * the latest value, even immediately after a `reset()`.
 */
export function useIdempotencyKey(): { getKey: () => string; reset: () => void } {
  const ref = useRef<string | null>(null);
  if (ref.current === null) ref.current = newIdempotencyKey();

  const getKey = useCallback((): string => {
    if (ref.current === null) ref.current = newIdempotencyKey();
    return ref.current;
  }, []);

  const reset = useCallback((): void => {
    ref.current = newIdempotencyKey();
  }, []);

  return { getKey, reset };
}

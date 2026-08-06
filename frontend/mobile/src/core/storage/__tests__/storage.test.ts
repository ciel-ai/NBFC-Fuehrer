import { describe, it, expect, vi, beforeEach } from 'vitest';

// Native platform so the SecureStore path (not the web localStorage branch) runs.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const secure = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => (secure.has(k) ? secure.get(k)! : null),
  setItemAsync: async (k: string, v: string) => {
    secure.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    secure.delete(k);
  },
}));

const async = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => (async.has(k) ? async.get(k)! : null),
    setItem: async (k: string, v: string) => {
      async.set(k, v);
    },
    removeItem: async (k: string) => {
      async.delete(k);
    },
  },
}));

import { secureStorage } from '../storage';

beforeEach(() => {
  secure.clear();
  async.clear();
});

describe('secureStorage — SecureStore backing', () => {
  it('reads and writes through SecureStore, not AsyncStorage', async () => {
    await secureStorage.set('nbfc_access_token', 'tok');
    expect(secure.get('nbfc_access_token')).toBe('tok');
    expect(async.has('nbfc_access_token')).toBe(false);
    expect(await secureStorage.get('nbfc_access_token')).toBe('tok');
  });

  it('treats legacy plaintext as compromised: scrubs it and returns null (no migration)', async () => {
    // Simulate a pre-SecureStore install: token sitting in AsyncStorage plaintext.
    async.set('nbfc_access_token', 'legacy-plaintext-token');

    const got = await secureStorage.get('nbfc_access_token');

    // Never returned to the caller — forces a fresh login.
    expect(got).toBeNull();
    // Plaintext copy is deleted…
    expect(async.has('nbfc_access_token')).toBe(false);
    // …and NOT promoted into the Keychain.
    expect(secure.has('nbfc_access_token')).toBe(false);
  });

  it('remove clears both the Keychain entry and any legacy plaintext copy', async () => {
    secure.set('nbfc_mpin', 'hash');
    async.set('nbfc_mpin', 'leftover');
    await secureStorage.remove('nbfc_mpin');
    expect(secure.has('nbfc_mpin')).toBe(false);
    expect(async.has('nbfc_mpin')).toBe(false);
  });
});

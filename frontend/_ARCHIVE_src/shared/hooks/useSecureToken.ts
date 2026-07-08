/**
 * useSecureToken — sole wrapper for expo-secure-store.
 * No other file in the project should import expo-secure-store directly.
 * This creates a single seam for future migration.
 */
import { secureStorage } from '@/src/core/storage/storage';

export function useSecureToken() {
  async function getToken(key: string): Promise<string | null> {
    try {
      return await secureStorage.get(key);
    } catch {
      return null;
    }
  }

  async function setToken(key: string, value: string): Promise<void> {
    await secureStorage.set(key, value);
  }

  async function deleteToken(key: string): Promise<void> {
    await secureStorage.remove(key);
  }

  async function clearAllTokens(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => secureStorage.remove(key)));
  }

  return { getToken, setToken, deleteToken, clearAllTokens };
}
